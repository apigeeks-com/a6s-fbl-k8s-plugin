import { K8sCleanupService } from '../../src/services';
import { IK8sCleanupOptions, IK8sObject } from '../../src/interfaces';
import { ContextUtil, ActionSnapshot, FlowService, IActionStep, IContext } from 'fbl';
import { suite, test } from 'mocha-typescript';
import { Container, Service } from 'typedi';
import * as assert from 'assert';

@Service()
class K8sCleanupServiceMock extends K8sCleanupService {
    cleanUpHelmReleasesMock(
        options: IK8sCleanupOptions,
        context: IContext,
        snapshot: ActionSnapshot,
        registeredHelmReleases: string[],
        deployedHelms: string[],
    ): Promise<void> {
        return super.cleanUpHelmReleases(options, context, snapshot, registeredHelmReleases, deployedHelms);
    }

    cleanupK8sObjectsMock(
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
}

@suite()
class K8sCleanupServiceTestSuite {
    @test()
    async failCleanupHelms() {
        Container.get(FlowService).debug = true;
        const cleanupService = Container.get(K8sCleanupServiceMock);

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const cleanupOptions = {
            dryRun: false,
            ignored: {
                objects: {},
                helms: ['fake-existed-helm'],
            },
            namespace: 'default',
        };

        const helmName = 'helm-not-exist';
        const deployedHems = [helmName];

        await cleanupService.cleanUpHelmReleasesMock(
            cleanupOptions,
            context,
            snapshot,
            ['fake-existed-helm'],
            deployedHems,
        );

        const logs: string[] = await snapshot
            .getSteps()
            .filter((step: IActionStep) => step.type === 'log')
            .map(log => log.payload);

        assert(logs[0].indexOf(`Helm release "${helmName}" failed to delete:`) >= 0);
    }

    @test()
    async failCleanupK8sObjects() {
        Container.get(FlowService).debug = true;
        const cleanupService = Container.get(K8sCleanupServiceMock);

        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});
        const clusterMember = 'not-existed-cluster-source';
        const cleanupOptions = {
            dryRun: false,
            namespace: 'default',
            kind: 'ConfigMap',
        };

        await cleanupService.cleanupK8sObjectsMock(
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
