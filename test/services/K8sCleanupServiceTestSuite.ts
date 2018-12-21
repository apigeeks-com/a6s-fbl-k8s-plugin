import { K8sCleanupService, K8sHelmService, K8sKubectlService } from '../../src/services';
import { IK8sCleanupOptions, IK8sObject } from '../../src/interfaces';
import { ContextUtil, ActionSnapshot, FlowService, IActionStep, IContext } from 'fbl';
import { suite, test } from 'mocha-typescript';
import { Container } from 'typedi';
import * as assert from 'assert';

@suite()
export class K8sCleanupServiceTestSuite extends K8sCleanupService {
    constructor() {
        super();
        this.k8sHelmService = Container.get(K8sHelmService);
        this.k8sKubectlService = Container.get(K8sKubectlService);
    }

    cleanUpHelms(
        options: IK8sCleanupOptions,
        context: IContext,
        snapshot: ActionSnapshot,
        registeredHelmReleases: string[],
        deployedHelms: string[],
    ): Promise<void> {
        return super.cleanUpHelmReleases(options, context, snapshot, registeredHelmReleases, deployedHelms);
    }

    cleanUpK8sObjects(
        options: IK8sCleanupOptions,
        context: IContext,
        snapshot: ActionSnapshot,
        kind: string,
        allHelmObjects: IK8sObject[],
        deployed: string[],
        cluster: string[],
        ignoredPatterns: string[],
    ): Promise<void> {
        return super.cleanupK8sObjects(
            options,
            context,
            snapshot,
            kind,
            allHelmObjects,
            deployed,
            cluster,
            ignoredPatterns,
        );
    }

    @test()
    async failCleanupHelms() {
        Container.get(FlowService).debug = true;

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const cleanupOptions = {
            dryRun: false,
            namespace: 'default',
        };

        const helmName = 'helm-not-exist';
        const deployedHems = [helmName];

        await this.cleanUpHelms(cleanupOptions, context, snapshot, [], deployedHems);

        const logs: string[] = await snapshot
            .getSteps()
            .filter((step: IActionStep) => step.type === 'log')
            .map(log => log.payload);

        assert(logs[0].indexOf(`Helm release "${helmName}" failed to delete:`) >= 0);
    }

    @test()
    async failCleanupK8sObjects() {
        Container.get(FlowService).debug = true;

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const clusterMember = 'not-existed-cluster-source';
        const cleanupOptions = {
            dryRun: false,
            namespace: 'default',
            kind: 'ConfigMap',
        };

        await this.cleanUpK8sObjects(
            cleanupOptions,
            context,
            snapshot,
            cleanupOptions.kind,
            [],
            [],
            [clusterMember],
            [],
        );

        const logs: string[] = await snapshot
            .getSteps()
            .filter((step: IActionStep) => step.type === 'log')
            .map(log => log.payload);

        assert(logs[0].indexOf(`${cleanupOptions.kind} "${clusterMember}" failed to delete:`) >= 0);
    }
}
