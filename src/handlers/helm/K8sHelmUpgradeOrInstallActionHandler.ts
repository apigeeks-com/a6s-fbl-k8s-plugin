import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {HelmChart_JOI_SCHEMA} from '../../interfaces';
import {K8sHelmService} from '../../services/K8sHelmService';

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
        await Container.get(K8sHelmService).updateOrInstall(options, snapshot.wd);
    }
}
