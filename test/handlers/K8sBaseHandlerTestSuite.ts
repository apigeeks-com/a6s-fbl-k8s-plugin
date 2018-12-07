import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';
import Container from 'typedi';
import {K8sCleanupService} from '../../src/services';
import {TempPathsRegistry} from 'fbl/dist/src/services';

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
