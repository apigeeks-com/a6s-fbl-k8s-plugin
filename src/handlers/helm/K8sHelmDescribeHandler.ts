import * as Joi from 'joi';
import { Container } from 'typedi';
import {
    FBL_ASSIGN_TO_SCHEMA,
    FBL_PUSH_TO_SCHEMA,
    ActionHandler,
    ActionSnapshot,
    IContext,
    IActionHandlerMetadata,
    IDelegatedParameters,
    ContextUtil,
} from 'fbl';

import { K8sHelmService } from '../../services';

export class K8sHelmDescribeHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.helm.describe',
        aliases: ['k8s.helm.describe', 'helm.describe'],
    };

    private static schema = Joi.object({
        name: Joi.string()
            .min(1)
            .required(),
        chart: Joi.object({
            assignTo: FBL_ASSIGN_TO_SCHEMA,
            pushTo: FBL_PUSH_TO_SCHEMA,
        }).or('assignTo', 'pushTo'),
        objects: Joi.object({
            assignTo: FBL_ASSIGN_TO_SCHEMA,
            pushTo: FBL_PUSH_TO_SCHEMA,
        }).or('assignTo', 'pushTo'),
    })
        .required()
        .options({
            allowUnknown: true,
        });

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sHelmDescribeHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sHelmDescribeHandler.schema;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        /* istanbul ignore else */
        if (options.chart) {
            const deployment = await Container.get(K8sHelmService).getHelmDeployment(options.name);

            await ContextUtil.assignTo(context, parameters, snapshot, options.chart.assignTo, deployment);
            await ContextUtil.pushTo(context, parameters, snapshot, options.chart.pushTo, deployment);
        }

        /* istanbul ignore else */
        if (options.objects) {
            const helmObjects = await Container.get(K8sHelmService).getHelmObjects(options.name);

            await ContextUtil.assignTo(context, parameters, snapshot, options.objects.assignTo, helmObjects);
            await ContextUtil.pushTo(context, parameters, snapshot, options.objects.pushTo, helmObjects);
        }
    }
}
