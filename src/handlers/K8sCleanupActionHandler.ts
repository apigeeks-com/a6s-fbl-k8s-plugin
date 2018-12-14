import * as Joi from 'joi';
import Container from 'typedi';
import { ActionHandler, ActionSnapshot, IContext, IActionHandlerMetadata, IDelegatedParameters } from 'fbl';

import { K8sCleanupService } from '../services';

export class K8sCleanupActionHandler extends ActionHandler {
    /**
     * {@inheritDoc}
     */
    private metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.cleanup',
        aliases: ['k8s.cleanup'],
    };

    /**
     * {@inheritDoc}
     */
    private schema = Joi.object()
        .keys({
            dryRun: Joi.boolean(),
            namespace: Joi.string()
                .min(1)
                .required(),
            kinds: Joi.array()
                .min(1)
                .items(Joi.string().required()),
            ignored: Joi.object().keys({
                objects: Joi.object().pattern(
                    /\w+/,
                    Joi.array()
                        .min(1)
                        .items(Joi.string().required()),
                ),
                helms: Joi.array()
                    .min(1)
                    .items(Joi.string().required()),
            }),
        })
        .required()
        .options({
            abortEarly: true,
        });

    /**
     * {@inheritDoc}
     */
    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return this.metadata;
    }

    /**
     * {@inheritDoc}
     */
    getValidationSchema(): Joi.SchemaLike | null {
        return this.schema;
    }

    /**
     * {@inheritDoc}
     */
    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const k8sCleanupService = Container.get(K8sCleanupService);

        await k8sCleanupService.cleanup(options, context, snapshot);
    }
}
