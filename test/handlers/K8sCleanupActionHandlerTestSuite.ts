import * as assert from 'assert';
import {suite, test} from 'mocha-typescript';
import {FlowService} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {ActionSnapshot, IActionStep} from 'fbl/dist/src/models';
import {ContextUtil} from 'fbl/dist/src/utils';
import {K8sCleanupActionHandler, K8sHelmUpgradeOrInstallActionHandler} from '../../src/handlers';
import {K8sApplyObjectActionHandler} from '../../src/handlers/kubectl';
import {K8sHelmService, K8sKubectlService} from '../../src/services';
import {join} from 'path';
import {K8sBaseHandlerTestSuite} from './K8sBaseHandlerTestSuite';
import {IK8sObject} from '../../src/interfaces';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
export class K8sCleanupActionHandlerTestSuite extends K8sBaseHandlerTestSuite {
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
                ignored: {
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

    @test()
    async cleanupHelms() {
        const assetsDir = join(__dirname, '../../../test/assets');
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, assetsDir, 0, {});
        const helmUpgradeOrInstallActionHandler = new K8sHelmUpgradeOrInstallActionHandler();

        const optionsHelmDeployed = {
            chart: 'helm/sample',
            name: 'helm-cleanup-deployed'
        };

        const optionsHelmCluster = {
            chart: 'helm/cleanup',
            name: 'helm-cleanup-cluster'
        };

        await helmUpgradeOrInstallActionHandler.validate(optionsHelmDeployed, context, snapshot, {});
        await helmUpgradeOrInstallActionHandler.execute(optionsHelmDeployed, context, snapshot, {});

        await helmUpgradeOrInstallActionHandler.validate(optionsHelmCluster, context, snapshot, {});
        await helmUpgradeOrInstallActionHandler.execute(optionsHelmCluster, context, snapshot, {});

        context.entities.registered.splice(-1, 1);
        assert.strictEqual(context.entities.registered.length, 1);

        const actionHandler = new K8sCleanupActionHandler();
        const cleanupOptions = {
            namespace: 'default',
        };

        await actionHandler.validate(cleanupOptions, context, snapshot, {});
        await actionHandler.execute(cleanupOptions, context, snapshot, {});

        const objectsAfterCleanup = await Container.get(K8sHelmService).listInstalledHelms();

        chai.expect(objectsAfterCleanup).to.be.an('array').that.not.includes('helm-cleanup-cluster');
        chai.expect(objectsAfterCleanup).to.be.an('array').that.includes('helm-cleanup-deployed');

        context.entities.registered.splice(-1, 1);
        await actionHandler.execute(cleanupOptions, context, snapshot, {});
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
                    namespace: 'default',
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
                    namespace: 'default',
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
                namespace: 'default',
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

    @test()
    async dryRun() {
        Container.get(FlowService).debug = true;
        const applyK8sObjectActionHandler = new K8sApplyObjectActionHandler();
        const actionHandler = new K8sCleanupActionHandler();
        const context = ContextUtil.generateEmptyContext();

        const k8sObject: IK8sObject = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
                name: 'dry-run-test-config-map',
            },
            data: {},
        };

        let snapshot = new ActionSnapshot('.', {}, '', 0, {});
        await applyK8sObjectActionHandler.validate(k8sObject, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(k8sObject, context, snapshot, {});

        snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const cleanupOptionSecret = {
            dryRun: true,
            namespace: 'default',
            kinds: ['ConfigMap']
        };
        await actionHandler.execute(cleanupOptionSecret, context, snapshot, {});

        const logs: string[] = await snapshot.getSteps()
            .filter((step: IActionStep) => step.type === 'log')
            .map(log => log.payload);

        const lastLog = logs.pop();
        assert(lastLog.indexOf(`Found following ConfigMaps to be cleaned up: ${k8sObject.metadata.name}`) >= 0);
    }

    private async applyTestObjects(deployedObject: object, clusterObject: object, kind: string) {
        const assetsDir = join(__dirname, '../../../test/assets');
        const applyK8sObjectActionHandler = new K8sApplyObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const snapshotHelm = new ActionSnapshot('.', {}, assetsDir, 0, {});

        await applyK8sObjectActionHandler.validate(deployedObject, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(deployedObject, context, snapshot, {});

        await applyK8sObjectActionHandler.validate(clusterObject, context, snapshot, {});
        await applyK8sObjectActionHandler.execute(clusterObject, context, snapshot, {});

        context.entities.registered.splice(-1, 1);

        assert.strictEqual(context.entities.registered.length, 1);

        // install helm
        const helmUpgradeOrInstallActionHandler = new K8sHelmUpgradeOrInstallActionHandler();

        const options = {
            chart: 'helm/cleanup',
            name: 'helm-cleanup-test'
        };

        await helmUpgradeOrInstallActionHandler.validate(options, context, snapshotHelm, {});
        await helmUpgradeOrInstallActionHandler.execute(options, context, snapshotHelm, {});

        const configMaps = await Container.get(K8sKubectlService).listObjects(kind, 'default');

        chai.expect(configMaps).to.be.an('array').that.includes('config-cluster');
        chai.expect(configMaps).to.be.an('array').that.includes('config-deployed');
        chai.expect(configMaps).to.be.an('array').that.includes('helm-cleanup');

        const actionHandler = new K8sCleanupActionHandler();
        const cleanupOptions = {
            namespace: 'default',
            ignored: {
                objects: {
                    ConfigMap: ['foo-*']
                }
            }
        };

        await actionHandler.validate(cleanupOptions, context, snapshot, {});
        await actionHandler.execute(cleanupOptions, context, snapshot, {});

        const objectsAfterCleanup = await Container.get(K8sKubectlService).listObjects(kind, 'default');
        
        chai.expect(objectsAfterCleanup).to.be.an('array').that.not.includes('config-cluster');
        chai.expect(objectsAfterCleanup).to.be.an('array').that.includes('config-deployed');
        chai.expect(objectsAfterCleanup).to.be.an('array').that.includes('helm-cleanup');
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
                    namespace: 'default',
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
                    namespace: 'default',
                    name: 'config-cluster'
                }
            },
            kind
        );
    }
}
