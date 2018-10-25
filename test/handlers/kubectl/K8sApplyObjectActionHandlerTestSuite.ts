import {suite, test} from 'mocha-typescript';

import {K8sApplyObjectActionHandler} from '../../../src/handlers/kubectl';
import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';
import * as assert from 'assert';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {ChildProcessService} from '../../../src/services';
import {promisify} from 'util';
import {readFile} from 'fs';
import {join} from 'path';
import * as Joi from 'joi';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class K8sApplyObjectActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation() {
        const actionHandler = new K8sApplyObjectActionHandler();
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
                kind: 'CustomObject',
                apiVersion: 'v1'
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                kind: 'CustomObject',
                apiVersion: 'v1',
                metadata: {}
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                kind: 'CustomObject',
                metadata: {
                    name: 'test'
                }
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sApplyObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate({
            kind: 'CustomObject',
            apiVersion: 'v1',
            metadata: {
                name: 'test'
            }
        }, context, snapshot);
    }

    @test()
    async registerCustomObject(): Promise<void> {
        const actionHandler = new K8sApplyObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const obj = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            data: {
                test: 'true'
            },
            metadata: {
                name: 'custom-obj-test'
            }
        };

        await actionHandler.validate(obj, context, snapshot);
        await actionHandler.execute(obj, context, snapshot);

        const result = await Container.get(ChildProcessService)
            .exec('kubectl', ['get', obj.kind, obj.metadata.name, '-o', 'json']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, obj.data);

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }
}
