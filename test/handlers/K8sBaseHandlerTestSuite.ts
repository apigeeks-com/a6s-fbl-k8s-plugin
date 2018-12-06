import {K8sCleanupActionHandler} from '../../src/handlers';
import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';

export class K8sBaseHandlerTestSuite {
    static async after(): Promise<void> {
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const cleanupHandler = new K8sCleanupActionHandler();
        const cleanupOptions = {
            namespace: 'default',
        };

        await cleanupHandler.validate(cleanupOptions, context, snapshot, {});
        await cleanupHandler.execute(cleanupOptions, context, snapshot, {});
    }
}
