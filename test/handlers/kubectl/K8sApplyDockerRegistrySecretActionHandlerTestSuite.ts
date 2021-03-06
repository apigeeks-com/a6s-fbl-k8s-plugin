import * as assert from 'assert';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Container } from 'typedi';
import { suite, test } from 'mocha-typescript';
import { ContextUtil, ActionSnapshot } from 'fbl';

import { K8sApplyDockerRegistrySecretActionHandler } from '../../../src/handlers/kubectl';
import { K8sKubectlService } from '../../../src/services';
import { K8sBaseHandlerTestSuite } from '../K8sBaseHandlerTestSuite';

chai.use(chaiAsPromised);

@suite()
class K8sApplyDockerRegistrySecretActionHandlerTestSuite extends K8sBaseHandlerTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sApplyDockerRegistrySecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate([], context, snapshot, {})).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    name: 'test',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    name: 'test',
                    files: [],
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    name: 'test',
                    inline: [],
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    name: 'test',
                    server: 'test',
                    username: 'test',
                    password: 'test',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sApplyDockerRegistrySecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(
            {
                name: 'test',
                server: 'test',
                username: 'test',
                password: 'test',
                email: 'foo@bar.com',
            },
            context,
            snapshot,
            {},
        );
    }

    @test()
    async registerDockerSecretWithoutNamespace(): Promise<void> {
        const actionHandler = new K8sApplyDockerRegistrySecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const options = {
            name: 'secret-docker-test-with-ns',
            server: '127.0.0.1',
            username: 'foo',
            password: 'bar',
            email: 'foo@bar.com',
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        const result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            'secret',
            options.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            '.dockerconfigjson': new Buffer(
                JSON.stringify({
                    auths: {
                        '127.0.0.1': {
                            username: 'foo',
                            password: 'bar',
                            email: 'foo@bar.com',
                            auth: new Buffer('foo:bar').toString('base64'),
                        },
                    },
                }),
            ).toString('base64'),
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }

    @test()
    async registerDockerSecretWithNamespace(): Promise<void> {
        const actionHandler = new K8sApplyDockerRegistrySecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const options = {
            name: 'secret-docker-test-without-ns',
            namespace: 'default',
            server: '127.0.0.1',
            username: 'foo',
            password: 'bar',
            email: 'foo@bar.com',
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        const result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            'secret',
            options.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            '.dockerconfigjson': new Buffer(
                JSON.stringify({
                    auths: {
                        '127.0.0.1': {
                            username: 'foo',
                            password: 'bar',
                            email: 'foo@bar.com',
                            auth: new Buffer('foo:bar').toString('base64'),
                        },
                    },
                }),
            ).toString('base64'),
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }
}
