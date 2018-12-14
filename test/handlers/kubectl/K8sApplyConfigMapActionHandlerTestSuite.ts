import * as assert from 'assert';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Container } from 'typedi';
import { promisify } from 'util';
import { writeFile } from 'fs';
import { basename } from 'path';
import { suite, test } from 'mocha-typescript';
import { ContextUtil, ActionSnapshot, TempPathsRegistry } from 'fbl';

import { K8sApplyConfigMapActionHandler } from '../../../src/handlers/kubectl';
import { K8sKubectlService } from '../../../src/services';
import { K8sBaseHandlerTestSuite } from '../K8sBaseHandlerTestSuite';

chai.use(chaiAsPromised);

@suite()
class K8sApplyConfigMapActionHandlerTestSuite extends K8sBaseHandlerTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sApplyConfigMapActionHandler();
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
                    inline: {},
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sApplyConfigMapActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(
            {
                name: 'test',
                files: ['test.yml'],
            },
            context,
            snapshot,
            {},
        );

        await actionHandler.validate(
            {
                name: 'test',
                inline: {
                    test: 1,
                },
            },
            context,
            snapshot,
            {},
        );

        await actionHandler.validate(
            {
                name: 'test',
                files: ['test.yml'],
                inline: {
                    test: 1,
                },
            },
            context,
            snapshot,
            {},
        );
    }

    @test()
    async createNewConfigMapInline(): Promise<void> {
        const actionHandler = new K8sApplyConfigMapActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const options = {
            name: 'config-map-test-inline',
            namespace: 'default',
            inline: {
                host: 'foo.bar',
                port: 8000,
            },
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        const result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            'configmap',
            options.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            host: 'foo.bar',
            port: '8000',
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }

    @test()
    async createNewConfigMapFiles(): Promise<void> {
        const actionHandler = new K8sApplyConfigMapActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const tempFile = await Container.get(TempPathsRegistry).createTempFile(false, '.txt');
        await promisify(writeFile)(tempFile, 'test=true', 'utf8');

        const options = {
            name: 'config-map-test-files',
            files: [tempFile],
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        const result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            'configmap',
            options.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            [basename(tempFile)]: 'test=true',
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }

    @test()
    async createCombinedConfigMap(): Promise<void> {
        const actionHandler = new K8sApplyConfigMapActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const tempFile = await Container.get(TempPathsRegistry).createTempFile(false, '.txt');
        await promisify(writeFile)(tempFile, 'test=true', 'utf8');

        const options = {
            name: 'config-map-test-combined',
            files: [tempFile],
            inline: {
                host: 'foo.bar',
                port: 8000,
            },
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        const result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            'configmap',
            options.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            [basename(tempFile)]: 'test=true',
            host: 'foo.bar',
            port: '8000',
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }

    @test()
    async updateConfigMapByName(): Promise<void> {
        const actionHandler = new K8sApplyConfigMapActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const options = {
            name: 'config-map-test-override',
            inline: {
                host: 'foo.bar',
                port: 8000,
            },
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        let result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            'configmap',
            options.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        let configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            host: 'foo.bar',
            port: '8000',
        });

        // update config map

        options.inline.port = 9999;
        await actionHandler.execute(options, context, snapshot, {});

        result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            'configmap',
            options.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            host: 'foo.bar',
            port: '9999',
        });

        assert.strictEqual(context.entities.registered.length, 2);
        assert.strictEqual(context.entities.created.length, 1);
        assert.strictEqual(context.entities.updated.length, 1);
    }
}
