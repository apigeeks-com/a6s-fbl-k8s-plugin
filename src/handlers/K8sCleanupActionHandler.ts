import * as Joi from 'joi';
import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import {IContext, IActionHandlerMetadata, IDelegatedParameters} from 'fbl/dist/src/interfaces';
import {K8sCleanupService} from '../services';

const packageJson = require('../../../package.json');

export class K8sCleanupActionHandler extends ActionHandler {
    /**
     * {@inheritDoc}
     */
    private metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.cleanup',
        version: packageJson.version,
        aliases: [
            'k8s.cleanup',
            'cleanup',
        ]
    };

    /**
     * {@inheritDoc}
     */
    private schema = Joi.object()
        .keys({
            dryRun: Joi.boolean().default(false),
            namespace: Joi.string().min(1).required(),
            kinds: Joi.array()
                .min(1)
                .items(Joi.string().required())
            ,
            allowed: Joi.object()
                .pattern(
                    /\w+/,
                    Joi.array()
                        .min(1)
                        .items(Joi.string().required())
                ),
        })
        .required()
        .options({
            abortEarly: true,
        })
    ;

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
    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const k8sCleanupService = new K8sCleanupService(options, context, snapshot);

        await k8sCleanupService.cleanup();
    }
}
