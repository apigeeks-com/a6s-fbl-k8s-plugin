import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata, IDelegatedParameters} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../services';

const packageJson = require('../../../../package.json');

export class K8sDeleteObjectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.kubectl.delete',
        version: packageJson.version,
        aliases: [
            'k8s.kubectl.delete',
            'kubectl.delete'
        ]
    };

    private static schema = Joi.object({
        kind: Joi.string().min(1).required(),
        metadata: Joi.object({
            name: Joi.string().min(1).required(),
            namespace: Joi.string().min(1)
        }).required().options({
            allowUnknown: true
        })
    }).required().options({
        allowUnknown: true
    });

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sDeleteObjectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sDeleteObjectActionHandler.schema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await Container.get(K8sKubectlService).deleteObject(options);
    }
}
