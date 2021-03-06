import * as Joi from 'joi';
import { Container } from 'typedi';
import { basename } from 'path';
import { ActionHandler, ActionSnapshot, IContext, IActionHandlerMetadata, IDelegatedParameters, FSUtil } from 'fbl';

import { K8sKubectlService } from '../../services';
import { IK8sObject } from '../../interfaces';

export class K8sApplyConfigMapActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.kubectl.apply.ConfigMap',
        aliases: ['k8s.kubectl.apply.ConfigMap', 'kubectl.apply.ConfigMap', 'kubectl.ConfigMap'],
    };

    private static schema = Joi.object()
        .keys({
            name: Joi.string()
                .required()
                .min(1),
            namespace: Joi.string().min(1),
            files: Joi.array()
                .min(1)
                .items(Joi.string().required())
                .optional(),
            inline: Joi.object()
                .pattern(/[\w|\d]+/, Joi.alternatives([Joi.string(), Joi.number()]))
                .min(1)
                .optional(),
        })
        .or(['files', 'inline']);

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sApplyConfigMapActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sApplyConfigMapActionHandler.schema;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const object: IK8sObject = {
            apiVersion: 'v1',
            kind: 'ConfigMap',
            metadata: {
                name: options.name,
            },
            data: {},
        };

        if (options.namespace) {
            object.metadata.namespace = options.namespace;
        }

        if (options.inline) {
            for (const key of Object.keys(options.inline)) {
                object.data[key] = options.inline[key].toString();
            }
        }

        if (options.files) {
            for (const file of options.files) {
                object.data[basename(file)] = await FSUtil.readTextFile(FSUtil.getAbsolutePath(file, snapshot.wd));
            }
        }

        await Container.get(K8sKubectlService).applyObject(object, context);
    }
}
