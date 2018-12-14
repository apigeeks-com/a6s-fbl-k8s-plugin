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

export class K8sGetObjectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.kubectl.get',
        aliases: ['k8s.kubectl.get', 'kubectl.get'],
    };

    private static schema = Joi.object({
        kind: Joi.string()
            .min(1)
            .required(),
        assignObjectTo: Joi.object({
            ctx: Joi.string()
                .regex(/^\$\.[^.]+(\.[^.]+)*$/)
                .min(1),
            secrets: Joi.string()
                .regex(/^\$\.[^.]+(\.[^.]+)*$/)
                .min(1),
        }).required(),
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

        /* istanbul ignore else */
        if (options.assignObjectTo.ctx) {
            await ContextUtil.assignToField(context.ctx, options.assignObjectTo.ctx, object, false);
        }

        /* istanbul ignore else */
        if (options.assignObjectTo.secrets) {
            await ContextUtil.assignToField(context.secrets, options.assignObjectTo.secrets, object, false);
        }

        snapshot.setContext(context);
    }
}
