import {Container} from 'typedi';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {K8sHelmService} from '../../../src/services';

export class K8sHelmBaseTestSuite {
    async before(): Promise<void> {
        let result = await Container.get(K8sHelmService)
            .execHelmCommand(['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        if (result.stdout.trim().length) {
            for (const name of result.stdout.split('\n')) {
                result = await Container.get(K8sHelmService)
                    .execHelmCommand(['del', '--purge', name.trim()]);

                if (result.code !== 0) {
                    throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
                }
            }
        }
    }

    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }
}