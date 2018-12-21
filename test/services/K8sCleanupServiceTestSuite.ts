import { K8sCleanupService } from '../../src/services';
import { IK8sCleanupOptions } from '../../src/interfaces';
import { ContextUtil, ActionSnapshot, FlowService, IActionStep, IContext } from 'fbl';
import { suite, test } from 'mocha-typescript';
import { Container } from 'typedi';
import * as assert from 'assert';

@suite()
export class K8sCleanupServiceTestSuite extends K8sCleanupService {
    constructor() {
        super();
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

    @test()
    async checkCleanHelmsFailed() {
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
}
