import * as assert from 'assert';
import {suite, test} from 'mocha-typescript';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {ActionSnapshot} from 'fbl/dist/src/models';
import {ContextUtil} from 'fbl/dist/src/utils';
import {K8sCleanupActionHandler} from '../../src/handlers';
import {K8sApplyObjectActionHandler} from '../../src/handlers/kubectl';
import {K8sKubectlService} from '../../src/services';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
export class K8sCleanupActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation() {
        const actionHandler = new K8sCleanupActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                dryRun: true
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                namespace: 'default',
                allowed: {
                    storageClasses: [],
                },
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sCleanupActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate({
            namespace: 'CustomObject',
        }, context, snapshot, {});
    }

    async cleanupHelms() {
        // TODO: implement
    }

    @test()
    async cleanupConfigMap() {
        await this.cleanupK8sObject('ConfigMap');
    }

    @test()
    async cleanupSecret() {
        await this.cleanupK8sObject('Secret');
    }

    async cleanupPersistentVolumeClaim() {
        // TODO: implement
    }

    async cleanupStorageClass() {
        // TODO: implement
    }

    private async cleanupK8sObject(kind: string) {
        const startupList = await Container.get(K8sKubectlService).listObjects(kind);

        console.log('------------------------------------------------------------------------------------------------', startupList);


        for (const objName of startupList) {
            await Container.get(K8sKubectlService).deleteObject({
                kind: kind,
                apiVersion: 'v1',
                metadata: {
                    name: objName
                }
            });
        }

        const applyK8sObjectActionHandler = new K8sApplyObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const deployedConfigMapOptions = {
            kind: kind,
            apiVersion: 'v1',
            data: {
                test: 'true'
            },
            metadata: {
                name: 'config-deployed'
            }
        };

        const inClusterConfigMapOptions = {
            kind: kind,
            apiVersion: 'v1',
            data: {
                test: 'true'
            },
            metadata: {
                name: 'config-cluster'
            }
        };

        await applyK8sObjectActionHandler.validate(deployedConfigMapOptions, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(deployedConfigMapOptions, context, snapshot, {});

        await applyK8sObjectActionHandler.validate(inClusterConfigMapOptions, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(inClusterConfigMapOptions, context, snapshot, {});

        context.entities.registered.splice(-1, 1);

        assert.strictEqual(context.entities.registered.length, 1);

        const configMaps = await Container.get(K8sKubectlService).listObjects(kind);
        assert.strictEqual(configMaps.length, 2);

        const actionHandler = new K8sCleanupActionHandler();
        const cleanupOptions = {
            namespace: 'default',
            allowed: {
                secrets: ['default-token-*']
            }
        };

        await actionHandler.validate(cleanupOptions, context, snapshot, {});
        await actionHandler.execute(cleanupOptions, context, snapshot, {});

        const configMapsAfterCleanup = await Container.get(K8sKubectlService).listObjects(kind);

        assert.strictEqual(configMapsAfterCleanup.length, 1);
    }
}
