import * as Joi from 'joi';
import { get } from 'lodash';
import { Container } from 'typedi';
import { ActionHandler, ActionSnapshot } from 'fbl/dist/src/models';
import { IContext, IActionHandlerMetadata, IDelegatedParameters } from 'fbl/dist/src/interfaces';
import { K8sHelmService } from '../../services';
import { FBL_ASSIGN_TO_SCHEMA, FBL_PUSH_TO_SCHEMA, ContextUtil } from 'fbl';

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
        }),
        objects: Joi.object({
            assignTo: FBL_ASSIGN_TO_SCHEMA,
            pushTo: FBL_PUSH_TO_SCHEMA,
        }),
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
        if (get(options, 'chart.assignTo') || get(options, 'chart.pushTo')) {
            const deployment = await Container.get(K8sHelmService).getHelmDeployment(options.name);

            if (get(options, 'chart.assignTo')) {
                await ContextUtil.assignTo(context, parameters, snapshot, options.chart.assignTo, deployment);
            }

            if (get(options, 'chart.pushTo')) {
                await ContextUtil.pushTo(context, parameters, snapshot, options.chart.pushTo, deployment);
            }
        }

        if (get(options, 'objects.assignTo') || get(options, 'objects.pushTo')) {
            const helmObjects = await Container.get(K8sHelmService).getHelmDeployment(options.name);

            if (get(options, 'objects.assignTo')) {
                await ContextUtil.assignTo(context, parameters, snapshot, options.objects.assignTo, helmObjects);
            }

            if (get(options, 'objects.pushTo')) {
                await ContextUtil.pushTo(context, parameters, snapshot, options.objects.pushTo, helmObjects);
            }
        }
    }
}
