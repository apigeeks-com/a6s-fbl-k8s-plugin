import {difference, get, flattenDeep} from 'lodash';
import * as minimatch from 'minimatch';
import {IK8sCleanupOptions, IK8sObject} from '../interfaces';
import {K8sHelmService} from './K8sHelmService';
import {K8sKubectlService} from './K8sKubectlService';
import {IContextEntity} from 'fbl/dist/src/interfaces/IContext';
import {ActionSnapshot} from 'fbl/dist/src/models';
import {Container} from 'typedi';

export class K8sCleanupService {
    /**
     * @param {IK8sCleanupOptions} options
     * @param {IContextEntity[]} registered
     * @param {ActionSnapshot} snapshot
     */
    constructor(
        private readonly options: IK8sCleanupOptions,
        private readonly registered: IContextEntity[],
        private readonly snapshot: ActionSnapshot) {
    }

    /**
     * Clean cluster
     *
     * @return {Promise<void>}
     */
    public async cleanup(): Promise<void> {

        const deployedHelms = await this.getDeployedHelms();
        const allHelmObjects: IK8sObject[] = <IK8sObject[]>flattenDeep(
            await Promise.all(
                deployedHelms.map(async (name) => await this.getHelms(name))
            )
        );

        await this.cleanupHelmReleases(deployedHelms);

        await this.cleanupK8sObjects(
            'ConfigMap',
            allHelmObjects,
            await this.getDeployedConfigMaps(),
            await this.getClusterConfigMaps(),
            get(this.options, 'allowed.configMaps', [])
        );

        await this.cleanupK8sObjects(
            'Secret',
            allHelmObjects,
            await this.getDeployedSecrets(),
            await this.getClusterSecrets(),
            get(this.options, 'allowed.secrets', [])
        );

        await this.cleanupK8sObjects(
            'PersistentVolumeClaim',
            allHelmObjects,
            await this.getDeployedPersistentVolumeClaims(),
            await this.getClusterPersistentVolumeClaims(),
            get(this.options, 'allowed.persistentVolumeClaims', [])
        );

        await this.cleanupK8sObjects(
            'StorageClass',
            allHelmObjects,
            await this.getDeployedStorageClasses(),
            await this.getClusterStorageClasses(),
            get(this.options, 'allowed.storageClass', [])
        );
    }

    /**
     * @param {string[]} deployedHelms
     * @return {Promise<void>}
     */
    private async cleanupHelmReleases(deployedHelms: string[]) {
        const allowedHelms = deployedHelms;
        const allowedPatterns = get(this.options, 'allowed.helms', []);
        const diff = this.getDifferenceInstalled(await this.getClusterHelms(), allowedHelms)
            .filter((d) => {
                for (const pattern of allowedPatterns) {
                    if (minimatch(d, pattern)) {
                        return false;
                    }
                }

                return true;
            })
        ;

        if (!this.options.dryRun) {
            await Promise.all(diff.map(async (name) => {
                try {
                    await Container.get(K8sHelmService).remove(name);
                    this.snapshot.log(`Helm "${name}" deleted`);
                } catch (e) {
                    this.snapshot.log(`Helm "${name}" not deleted: ${e.message}`);
                }
            }));
        } else if (diff.length) {
            this.snapshot.log(`Helm releases to be removed: ${diff.join(', ')}`);
        }
    }

    /**
     * @param {string} kind
     * @param {IK8sObject[]} allHelmObjects
     * @param {string[]} deployed
     * @param {string[]} cluster
     * @param {string[]} allowedPatterns
     * @return {Promise<void>}
     */
    private async cleanupK8sObjects(
        kind: string,
        allHelmObjects: IK8sObject[],
        deployed: string[],
        cluster: string[],
        allowedPatterns: string[]
    ) {
        const allowedSecrets = [
            ...deployed,
            ...allHelmObjects
                .filter((object: IK8sObject) => object.kind === kind)
                .map((object: IK8sObject) => object.metadata.name),
        ];

        const diff = this.getDifferenceInstalled(cluster, allowedSecrets)
            .filter((d) => {
                for (const pattern of allowedPatterns) {
                    if (minimatch(d, pattern)) {
                        return false;
                    }
                }

                return true;
            })
        ;

        if (!this.options.dryRun) {
            await Promise.all(diff.map(async (name) => {
                try {
                    await Container.get(K8sKubectlService)
                        .deleteObject({
                            apiVersion: 'v1',
                            kind: kind,
                            metadata: {
                                name,
                            }
                        })
                    ;
                    this.snapshot.log(`${kind} "${name}" deleted`);
                } catch (e) {
                    this.snapshot.log(`${kind} "${name}" not deleted: ${e.message}`);
                }
            }));
        } else if (diff.length) {
            this.snapshot.log(`${kind} to be removed: ${diff.join(', ')}`);
        }
    }

    /**
     * Get k8s objects in helm
     *
     * @param {string} name
     * @return {Promise<IK8sObject[]>}
     */
    private async getHelms(name: string): Promise<IK8sObject[]> {
        return await Container.get(K8sHelmService).getHelmObjects(name);
    }

    /**
     * Get deployed secrets
     *
     * @return {Promise<string[]>}
     */
    private async getDeployedSecrets(): Promise<string[]> {
        return this.getDeployedK8sObjects()
            .filter(o => o.kind === 'Secret')
            .map(o => o.metadata.name)
        ;
    }

    /**
     * Get deployed config maps
     *
     * @return {Promise<string[]>}
     */
    private async getDeployedConfigMaps(): Promise<string[]> {
        return this.getDeployedK8sObjects()
            .filter(o => o.kind === 'ConfigMap')
            .map(o => o.metadata.name)
        ;
    }

    /**
     * Get deployed storage classes
     *
     * @return {Promise<string[]>}
     */
    private async getDeployedStorageClasses(): Promise<string[]> {
        return this.getDeployedK8sObjects()
            .filter(o => o.kind === 'StorageClass')
            .map(o => o.metadata.name)
        ;
    }

    /**
     * Get deployed persistent volume claims
     *
     * @return {Promise<string[]>}
     */
    private async getDeployedPersistentVolumeClaims(): Promise<string[]> {
        return this.getDeployedK8sObjects()
            .filter(o => o.kind === 'PersistentVolumeClaim')
            .map(o => o.metadata.name)
        ;
    }

    /**
     * Get installed helms in the cluster
     *
     * @return {Promise<string[]>}
     */
    private async getClusterHelms(): Promise<string[]> {
        return await Container.get(K8sHelmService).listInstalledHelms() || [];
    }

    /**
     * Get installed secrets in the cluster
     *
     * @return {Promise<string[]>}
     */
    private async getClusterSecrets(): Promise<string[]> {
        return await Container.get(K8sKubectlService).listObjects('Secret', this.options.namespace);
    }

    /**
     * Get installed config maps in the cluster
     *
     * @return {Promise<string[]>}
     */
    private async getClusterConfigMaps(): Promise<string[]> {
        return await Container.get(K8sKubectlService).listObjects('ConfigMap', this.options.namespace);
    }


    /**
     * Get installed storage classes in the cluster
     *
     * @return {Promise<string[]>}
     */
    private async getClusterStorageClasses(): Promise<string[]> {
        return await Container.get(K8sKubectlService).listObjects('StorageClass', this.options.namespace);
    }

    /**
     * Get installed persistent volume claim in the cluster
     *
     * @return {Promise<string[]>}
     */
    private async getClusterPersistentVolumeClaims(): Promise<string[]> {
        return await Container.get(K8sKubectlService).listObjects('PersistentVolumeClaim', this.options.namespace);
    }

    /**
     * Return Difference
     *
     * @param {string[]} inCluster
     * @param {string[]} deployed
     * @return {string[]}
     */
    private getDifferenceInstalled(inCluster: string[], deployed: string[]): string[] {
        return difference(inCluster, deployed);
    }

    /**
     * Get deployed helms
     *
     * @return {Promise<string[]>}
     */
    private async getDeployedHelms(): Promise<string[]> {
        // TODO: implement
        return [];
    }

    /**
     * Get all deployed k8s objects
     *
     * @return {IK8sObject[]}
     */
    private getDeployedK8sObjects(): IK8sObject[] {
        // TODO: implement
        return this.registered
            .filter((e => ['Secret', 'ConfigMap', 'StorageClass', 'PersistentVolumeClaim'].indexOf(e.type) !== -1))
            .map(e => e.payload)
        ;
    }
}
