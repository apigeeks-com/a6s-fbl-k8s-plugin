import {difference, get, flattenDeep} from 'lodash';
import * as minimatch from 'minimatch';
import {IK8sCleanupOptions, IK8sObject} from '../interfaces';
import {K8sHelmService} from './K8sHelmService';
import {K8sKubectlService} from './K8sKubectlService';
import {ActionSnapshot} from 'fbl/dist/src/models';
import {Container} from 'typedi';
import {IContext} from 'fbl/dist/src/interfaces';

export class K8sCleanupService {
    /**
     * @param {IK8sCleanupOptions} options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     */
    constructor(
        private readonly options: IK8sCleanupOptions,
        private readonly context: IContext,
        private readonly snapshot: ActionSnapshot
    ) {
        this.options.abstractions = this.options.abstractions
            || ['Secret', 'ConfigMap', 'StorageClass', 'PersistentVolumeClaim']
        ;
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
                deployedHelms.map(async (name) => await this.getHelmsObjects(name))
            )
        );

        await this.cleanupHelmReleases(deployedHelms);

        await Promise.all(
            this.options.abstractions.map(async (abstraction: string) => {
                const deployed =  this.getDeployedK8sObjects()
                    .filter(o => o.kind === abstraction)
                    .map(o => o.metadata.name)
                ;

                const cluster = await Container.get(K8sKubectlService)
                    .listObjects(abstraction, this.options.namespace)
                ;

                await this.cleanupK8sObjects(
                    abstraction,
                    allHelmObjects,
                    deployed,
                    cluster,
                    get(this.options, ['allowed', abstraction], [])
                );
            })
        );
    }

    /**
     * @param {string[]} deployedHelms
     * @return {Promise<void>}
     */
    private async cleanupHelmReleases(deployedHelms: string[]) {
        const allowedHelms = deployedHelms;
        const allowedPatterns = get(this.options, 'allowed.helm', []);
        const diff = this.findOrphans(await this.getClusterHelms(), allowedHelms)
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
                    await Container.get(K8sHelmService).remove(name, this.context);
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

        const diff = this.findOrphans(cluster, allowedSecrets)
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
                        }, this.context)
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
    private async getHelmsObjects(name: string): Promise<IK8sObject[]> {
        return await Container.get(K8sHelmService).getHelmObjects(name);
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
     * Difference between all objects inside the cluster and ones that were deployed
     *
     * @param {string[]} inCluster
     * @param {string[]} deployed
     * @return {string[]}
     */
    private findOrphans(inCluster: string[], deployed: string[]): string[] {
        return difference(inCluster, deployed);
    }

    /**
     * Get deployed helms
     *
     * @return {Promise<string[]>}
     */
    private async getDeployedHelms(): Promise<string[]> {
        return this.context.entities.registered
            .filter((e => e.type === 'helm'))
            .map(e => e.payload.name)
        ;
    }

    /**
     * Get all deployed k8s objects
     *
     * @return {IK8sObject[]}
     */
    private getDeployedK8sObjects(): IK8sObject[] {
        return this.context.entities.registered
            .filter((e => this.options.abstractions.indexOf(e.type) !== -1))
            .map(e => e.payload)
        ;
    }
}
