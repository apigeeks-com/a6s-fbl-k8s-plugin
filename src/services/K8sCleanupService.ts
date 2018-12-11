import * as minimatch from 'minimatch';
import { difference, get, flattenDeep } from 'lodash';
import { Service, Inject } from 'typedi';
import { ActionSnapshot } from 'fbl/dist/src/models';
import { IContext } from 'fbl/dist/src/interfaces';

import { IK8sCleanupOptions, IK8sObject } from '../interfaces';
import { K8sHelmService } from './K8sHelmService';
import { K8sKubectlService } from './K8sKubectlService';

@Service()
export class K8sCleanupService {
    // All k8s Object kinds to be cleaned up
    // Note: order matters, PVC should go before SC, or on some environments it will just fail to delete (like AWS)
    private static defaultKinds = ['PersistentVolumeClaim', 'StorageClass', 'Secret', 'ConfigMap'];

    @Inject(() => K8sKubectlService)
    private k8sKubectlService: K8sKubectlService;

    @Inject(() => K8sHelmService)
    private k8sHelmService: K8sHelmService;

    /**
     * Clean cluster
     * @param {IK8sCleanupOptions} options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @return {Promise<void>}
     */
    public async cleanup(options: IK8sCleanupOptions, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const kinds = options.kinds || K8sCleanupService.defaultKinds;

        const registeredHelmReleases = context.entities.registered
            .filter(e => e.type === 'helm')
            .map(e => e.payload.name);

        const allHelmObjects: IK8sObject[] = <IK8sObject[]>(
            flattenDeep(
                await Promise.all(
                    registeredHelmReleases.map(async name => await this.k8sHelmService.getHelmObjects(name)),
                ),
            )
        );

        await this.cleanUpHelmReleases(options, context, snapshot, registeredHelmReleases);

        for (const kind of kinds) {
            const deployedK8sObjects = context.entities.registered
                .filter(e => e.type === kind && e.payload.metadata.namespace === options.namespace)
                .map(o => o.payload.metadata.name);

            const cluster = await this.k8sKubectlService.listObjects(kind, options.namespace);

            await this.cleanupK8sObjects(
                options,
                context,
                snapshot,
                kind,
                allHelmObjects,
                deployedK8sObjects,
                cluster,
                get(options, ['ignored', kind], []),
            );
        }
    }

    /**
     * Cleanup helm releases
     * @param {IK8sCleanupOptions} options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {string[]} registeredHelmReleases
     * @return {Promise<void>}
     */
    private async cleanUpHelmReleases(
        options: IK8sCleanupOptions,
        context: IContext,
        snapshot: ActionSnapshot,
        registeredHelmReleases: string[],
    ): Promise<void> {
        const ignoredHelms = registeredHelmReleases;
        const ignoredPatterns = get(options, 'ignored.helms', []);
        const diff = this.findOrphans(await this.k8sHelmService.listInstalledHelms(), ignoredHelms).filter(d => {
            for (const pattern of ignoredPatterns) {
                if (minimatch(d, pattern)) {
                    return false;
                }
            }

            return true;
        });

        if (!options.dryRun) {
            await Promise.all(
                diff.map(async name => {
                    try {
                        await this.k8sHelmService.remove(name, context);
                        snapshot.log(`Helm release "${name}" deleted`);
                    } catch (e) {
                        snapshot.log(`Helm release "${name}" failed to delete: ${e.message}`, true);
                    }
                }),
            );
        } else if (diff.length) {
            snapshot.log(`Found following helm releases to be cleaned up: ${diff.join(', ')}`);
        }
    }

    /**
     * @param {IK8sCleanupOptions} options
     * @param {IContext} context
     * @param {ActionSnapshot} snapshot
     * @param {string} kind
     * @param {IK8sObject[]} allHelmObjects
     * @param {string[]} deployed
     * @param {string[]} cluster
     * @param {string[]} ignoredPatterns
     * @return {Promise<void>}
     */
    private async cleanupK8sObjects(
        options: IK8sCleanupOptions,
        context: IContext,
        snapshot: ActionSnapshot,
        kind: string,
        allHelmObjects: IK8sObject[],
        deployed: string[],
        cluster: string[],
        ignoredPatterns: string[],
    ): Promise<void> {
        const ignoredObjects = [
            ...deployed,
            ...allHelmObjects
                .filter((object: IK8sObject) => object.kind === kind)
                .map((object: IK8sObject) => object.metadata.name),
        ];

        const diff = this.findOrphans(cluster, ignoredObjects).filter(d => {
            for (const pattern of ignoredPatterns) {
                if (minimatch(d, pattern)) {
                    return false;
                }
            }

            return true;
        });

        if (!options.dryRun) {
            await Promise.all(
                diff.map(async name => {
                    try {
                        await this.k8sKubectlService.deleteObject(
                            {
                                apiVersion: 'v1',
                                kind: kind,
                                metadata: {
                                    name,
                                    namespace: options.namespace,
                                },
                            },
                            context,
                        );
                        snapshot.log(`${kind} "${name}" deleted`);
                    } catch (e) {
                        snapshot.log(`${kind} "${name}" failed to delete: ${e.message}`);
                    }
                }),
            );
        } else if (diff.length) {
            snapshot.log(`Found following ${kind}s to be cleaned up: ${diff.join(', ')}`);
        }
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
}
