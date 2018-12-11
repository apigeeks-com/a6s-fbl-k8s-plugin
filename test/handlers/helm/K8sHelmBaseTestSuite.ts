import { Container } from 'typedi';

import { K8sHelmService } from '../../../src/services';
import { K8sBaseHandlerTestSuite } from '../K8sBaseHandlerTestSuite';

export class K8sHelmBaseTestSuite extends K8sBaseHandlerTestSuite {
    async before(): Promise<void> {
        let result = await Container.get(K8sHelmService).execHelmCommand(['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        if (result.stdout.trim().length) {
            for (const name of result.stdout.split('\n')) {
                result = await Container.get(K8sHelmService).execHelmCommand(['del', '--purge', name.trim()]);

                if (result.code !== 0) {
                    throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
                }
            }
        }
    }
}
