import * as Joi from 'joi';
import { Container } from 'typedi';
import {
    ActionHandler,
    ActionSnapshot,
    IContext,
    IActionHandlerMetadata,
    IDelegatedParameters,
    ContextUtil,
} from 'fbl';

import { K8sKubectlService } from '../../services';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA } from 'fbl';

export class K8sGetObjectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.kubectl.get',
        aliases: ['k8s.kubectl.get', 'kubectl.get'],
    };

    private static schema = Joi.object({
        kind: Joi.string()
            .min(1)
            .required(),
        assignTo: FBL_ASSIGN_TO_SCHEMA,
        pushTo: FBL_PUSH_TO_SCHEMA,
        metadata: Joi.object({
            name: Joi.string()
                .min(1)
                .required(),
            namespace: Joi.string().min(1),
        })
            .required()
            .options({
                allowUnknown: true,
            }),
    })
        .or('assignTo', 'pushTo')
        .required()
        .options({
            allowUnknown: true,
        });

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sGetObjectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sGetObjectActionHandler.schema;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const object = await Container.get(K8sKubectlService).getObject(options);

        await ContextUtil.assignTo(context, parameters, snapshot, options.assignTo, object);
        await ContextUtil.pushTo(context, parameters, snapshot, options.pushTo, object);

        snapshot.setContext(context);
    }
}
