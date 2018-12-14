import * as Joi from 'joi';
import { Container } from 'typedi';
import { ActionHandler, ActionSnapshot, IContext, IActionHandlerMetadata, IDelegatedParameters } from 'fbl';

import { K8sHelmService } from '../../services';

export class K8sHelmUpgradeOrInstallActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.helm.upgradeOrInstall',
        aliases: ['k8s.helm.upgradeOrInstall', 'helm.upgradeOrInstall', 'helm.install'],
    };

    private static schema = Joi.object({
        name: Joi.string(),
        namespace: Joi.string(),
        chart: Joi.string().required(),
        version: Joi.string(),
        variables: Joi.object({
            inline: Joi.any(),
            files: Joi.array().items(Joi.string()),
        }),
        wait: Joi.boolean(),
        timeout: Joi.number()
            .integer()
            .min(0)
            .max(60 * 60), // 1h deployment limit
    }).options({ abortEarly: true });

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sHelmUpgradeOrInstallActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sHelmUpgradeOrInstallActionHandler.schema;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        await Container.get(K8sHelmService).updateOrInstall(options, snapshot.wd, context);
    }
}
