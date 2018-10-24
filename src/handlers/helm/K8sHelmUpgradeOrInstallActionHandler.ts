import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {FSUtil} from 'fbl/dist/src/utils';
import {HelmChart_JOI_SCHEMA} from '../../interfaces';
import {K8sHelmService} from '../../services/K8sHelmService';
import {promisify} from 'util';
import {exists} from 'fs';

const packageJson = require('../../../../package.json');

export class K8sHelmUpgradeOrInstallActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.helm.upgradeOrInstall',
        version: packageJson.version,
        aliases: [
            'k8s.helm.upgradeOrInstall',
            'helm.upgradeOrInstall',
            'helm.install',
        ]
    };

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sHelmUpgradeOrInstallActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return HelmChart_JOI_SCHEMA;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        if (options.variable_files) {
            options.variable_files = options.variable_files.map((path: string) => FSUtil.getAbsolutePath(path, snapshot.wd));
        }

        const localPath = FSUtil.getAbsolutePath(options.chart, snapshot.wd);
        const existsLocally = await promisify(exists)(localPath);

        if (existsLocally) {
            options.chart = localPath;
        }

        await Container.get(K8sHelmService).updateOrInstall(options);
    }
}
