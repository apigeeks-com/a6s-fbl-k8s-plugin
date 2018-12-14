import * as Joi from 'joi';
import { Container } from 'typedi';
import { ActionHandler, ActionSnapshot, IContext, IActionHandlerMetadata, IDelegatedParameters } from 'fbl';

import { K8sKubectlService } from '../../services';
import { IK8sObject } from '../../interfaces';

export class K8sDeleteObjectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.kubectl.delete',
        aliases: ['k8s.kubectl.delete', 'kubectl.delete'],
    };

    private static schema = Joi.object({
        kind: Joi.string()
            .min(1)
            .required(),
        name: Joi.string()
            .min(1)
            .required(),
        namespace: Joi.string().min(1),
    })
        .required()
        .options({
            allowUnknown: true,
        });

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sDeleteObjectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sDeleteObjectActionHandler.schema;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const obj: IK8sObject = {
            apiVersion: 'v1',
            kind: options.kind,
            metadata: {
                name: options.name,
            },
        };

        if (options.namespace) {
            obj.metadata.namespace = options.namespace;
        }

        await Container.get(K8sKubectlService).deleteObject(obj, context);
    }
}
