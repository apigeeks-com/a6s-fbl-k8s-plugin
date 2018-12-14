import Container from 'typedi';
import { ContextUtil, ActionSnapshot, TempPathsRegistry } from 'fbl';

import { K8sCleanupService } from '../../src/services';

export class K8sBaseHandlerTestSuite {
    async after(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const cleanupService = Container.get(K8sCleanupService);
        const cleanupOptions = {
            dryRun: false,
            namespace: 'default',
        };

        await cleanupService.cleanup(cleanupOptions, context, snapshot);

        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }
}
