import {suite, test} from 'mocha-typescript';

import {K8sApplyDockerRegistrySecretActionHandler} from '../../../src/handlers/kubectl';
import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';
import * as assert from 'assert';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {basename} from 'path';
import {ChildProcessService} from '../../../src/services';
import * as Joi from 'joi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class K8sApplyDockerRegistrySecretActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation() {
        const actionHandler = new K8sApplyDockerRegistrySecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                name: 'test'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                name: 'test',
                files: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                name: 'test',
                inline: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                name: 'test',
                server: 'test',
                username: 'test',
                password: 'test'
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sApplyDockerRegistrySecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate({
            name: 'test',
            server: 'test',
            username: 'test',
            password: 'test',
            email: 'foo@bar.com'
        }, context, snapshot);

    }

    @test()
    async registerDockerSecretWithoutNamespace(): Promise<void> {
        const actionHandler = new K8sApplyDockerRegistrySecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const options = {
            name: 'secret-docker-test',
            server: 'test',
            username: 'test',
            password: 'test',
            email: 'foo@bar.com'
        };

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        const result = await Container.get(ChildProcessService).exec('kubectl', ['get', 'secret', options.name, '-o', 'json']);

        assert.strictEqual(result.code, 0);
        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            '.dockerconfigjson': new Buffer(JSON.stringify({
                auths:{
                    test:{
                        username: "test",
                        password: "test",
                        email: "foo@bar.com",
                        auth: new Buffer('test:test').toString('base64')
                    }
                }
            })).toString('base64')
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }
}
