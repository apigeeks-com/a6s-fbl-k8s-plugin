import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IDelegatedParameters, IActionHandlerMetadata} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {K8sHelmService} from '../../services';

const packageJson = require('../../../../package.json');

export class K8sHelmDeleteActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.helm.delete',
        version: packageJson.version,
        aliases: [
            'k8s.helm.delete',
            'helm.delete',
        ]
    };

    private static schema = Joi.object({
       name: Joi.string().min(1).required()
    }).required();

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sHelmDeleteActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sHelmDeleteActionHandler.schema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await Container.get(K8sHelmService).remove(options.name);
    }
}
