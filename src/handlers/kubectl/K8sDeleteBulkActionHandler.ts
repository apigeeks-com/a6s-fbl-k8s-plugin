import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata, IDelegatedParameters} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../services';
import {IK8sBulkDelete} from '../../interfaces';

const packageJson = require('../../../../package.json');

export class K8sDeleteBulkActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.kubectl.delete.bulk',
        version: packageJson.version,
        aliases: [
            'k8s.kubectl.delete.bulk',
            'kubectl.delete.bulk'
        ]
    };

    private static schema = Joi.object({
        kind: Joi.string().min(1).required(),
        namespace: Joi.string().min(1),
        names:  Joi.array()
            .min(1)
            .items(Joi.string().required())
            .required()
        ,
    }).required().options({
        allowUnknown: true
    });

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sDeleteBulkActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sDeleteBulkActionHandler.schema;
    }

    async execute(options: IK8sBulkDelete, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await Container.get(K8sKubectlService).deleteObjects(options, context);
    }
}
