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
        await this.cleanupConfigMapAndSecret('ConfigMap');
    }

    @test()
    async cleanupSecret() {
        await this.cleanupConfigMapAndSecret('Secret');
    }

    @test()
    async cleanupStorageClass() {
        await this.applyTestObjects(
            {
                kind: 'StorageClass',
                apiVersion: 'storage.k8s.io/v1',
                metadata: {
                    name: 'config-deployed'
                },
                provisioner: 'kubernetes.io/aws-ebs',
                parameters: {
                    type: 'gp2'
                },
                volumeBindingMode: 'Immediate'
            },
            {
                kind: 'StorageClass',
                apiVersion: 'storage.k8s.io/v1',
                metadata: {
                    name: 'config-cluster'
                },
                provisioner: 'kubernetes.io/aws-ebs',
                parameters: {
                    type: 'gp2'
                },
                volumeBindingMode: 'Immediate'
            },
            'StorageClass'
        );
    }

    @test()
    async cleanupPersistentVolumeClaim() {
        const applyK8sObjectActionHandler = new K8sApplyObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const k8sObject = {
            kind: 'StorageClass',
            apiVersion: 'storage.k8s.io/v1',
            metadata: {
                name: 'test-storage-class'
            },
            provisioner: 'kubernetes.io/aws-ebs',
            parameters: {
                type: 'gp2'
            },
            volumeBindingMode: 'Immediate'
        };

        await applyK8sObjectActionHandler.validate(k8sObject, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(k8sObject, context, snapshot, {});

        await this.applyTestObjects(
            {
                apiVersion: 'v1',
                kind: 'PersistentVolumeClaim',
                metadata: {
                    namespace: 'default',
                    name: 'config-deployed',
                },
                spec: {
                    volumeMode: 'Filesystem',
                    resources: {
                        requests: {
                            storage: '8Gi'
                        }
                    },
                    accessModes: [
                        'ReadWriteOnce'
                    ],
                    storageClassName: 'test-storage-class'
                }
            },
            {
                apiVersion: 'v1',
                kind: 'PersistentVolumeClaim',
                metadata: {
                    namespace: 'default',
                    name: 'config-cluster',
                },
                spec: {
                    volumeMode: 'Filesystem',
                    resources: {
                        requests: {
                            storage: '8Gi'
                        }
                    },
                    accessModes: [
                        'ReadWriteOnce'
                    ],
                    storageClassName: 'test-storage-class'
                }
            },
            'pvc'
        );
    }

    private async applyTestObjects(deployedObject: object, clusterObject: object, kind: string) {
        const applyK8sObjectActionHandler = new K8sApplyObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await applyK8sObjectActionHandler.validate(deployedObject, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(deployedObject, context, snapshot, {});

        await applyK8sObjectActionHandler.validate(clusterObject, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(clusterObject, context, snapshot, {});

        context.entities.registered.splice(-1, 1);

        assert.strictEqual(context.entities.registered.length, 1);

        const configMaps = await Container.get(K8sKubectlService).listObjects(kind, 'default');

        chai.expect(configMaps).to.be.an('array').that.includes('config-cluster');
        chai.expect(configMaps).to.be.an('array').that.includes('config-deployed');

        const actionHandler = new K8sCleanupActionHandler();
        const cleanupOptions = {
            namespace: 'default',
        };

        await actionHandler.validate(cleanupOptions, context, snapshot, {});
        await actionHandler.execute(cleanupOptions, context, snapshot, {});

        const objectsAfterCleanup = await Container.get(K8sKubectlService).listObjects(kind, 'default');

        chai.expect(objectsAfterCleanup).to.be.an('array').that.not.includes('config-cluster');
        chai.expect(objectsAfterCleanup).to.be.an('array').that.includes('config-deployed');
    }

    private async cleanupConfigMapAndSecret(kind: string) {
        await this.applyTestObjects(
            {
                kind: kind,
                apiVersion: 'v1',
                data: {
                    test: 'true'
                },
                metadata: {
                    name: 'config-deployed'
                }
            },
            {
                kind: kind,
                apiVersion: 'v1',
                data: {
                    test: 'true'
                },
                metadata: {
                    name: 'config-cluster'
                }
            },
            kind
        );
    }
}
