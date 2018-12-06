import {K8sBaseHandlerTestSuite} from '../K8sBaseHandlerTestSuite';
import {Container} from 'typedi';
import {TempPathsRegistry} from 'fbl/dist/src/services';

export class K8sKubectlBaseTestSuite extends K8sBaseHandlerTestSuite  {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }
}
