import * as Joi from 'joi';
import { Container } from 'typedi';
import { ActionHandler, ActionSnapshot } from 'fbl/dist/src/models';
import { IContext, IActionHandlerMetadata, IDelegatedParameters } from 'fbl/dist/src/interfaces';

import { K8sKubectlService } from '../../services';
import { IK8sBulkDelete } from '../../interfaces';

export class K8sBulkDeleteObjectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.kubectl.delete.bulk',
        aliases: ['k8s.kubectl.delete.bulk', 'kubectl.delete.bulk'],
    };

    private static schema = Joi.object({
        kind: Joi.string()
            .min(1)
            .required(),
        namespace: Joi.string().min(1),
        names: Joi.array()
            .min(1)
            .items(Joi.string().required())
            .required(),
    })
        .required()
        .options({
            allowUnknown: true,
        });

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sBulkDeleteObjectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sBulkDeleteObjectActionHandler.schema;
    }

    async execute(
        options: IK8sBulkDelete,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        await Container.get(K8sKubectlService).deleteObjectBulk(options, context);
    }
}
