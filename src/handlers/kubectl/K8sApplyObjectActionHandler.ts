import * as Joi from 'joi';
import { Container } from 'typedi';
import { ActionHandler, ActionSnapshot } from 'fbl/dist/src/models';
import { IContext, IActionHandlerMetadata, IDelegatedParameters } from 'fbl/dist/src/interfaces';

import { k8sObjectJoiSchema } from '../../interfaces';
import { K8sKubectlService } from '../../services';

export class K8sApplyObjectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.kubectl.apply',
        aliases: ['k8s.kubectl.apply', 'kubectl.apply'],
    };

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sApplyObjectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return k8sObjectJoiSchema;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        await Container.get(K8sKubectlService).applyObject(options, context);
    }
}
