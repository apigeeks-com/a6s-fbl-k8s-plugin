import * as Joi from 'joi';
import { Container } from 'typedi';
import { basename } from 'path';
import { ActionHandler, ActionSnapshot } from 'fbl/dist/src/models';
import { IContext, IActionHandlerMetadata, IDelegatedParameters } from 'fbl/dist/src/interfaces';
import { FSUtil } from 'fbl/dist/src/utils';

import { K8sKubectlService } from '../../services';
import { IK8sObject } from '../../interfaces';

export class K8sApplyGenericSecretActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata>{
        id: 'a6s.k8s.kubectl.apply.Secret.generic',
        aliases: [
            'k8s.kubectl.apply.Secret.generic',
            'kubectl.apply.Secret.generic',
            'kubectl.Secret.generic',
            'kubectl.Secret',
        ],
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
        return K8sApplyGenericSecretActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sApplyGenericSecretActionHandler.schema;
    }

    async execute(
        options: any,
        context: IContext,
        snapshot: ActionSnapshot,
        parameters: IDelegatedParameters,
    ): Promise<void> {
        const object: IK8sObject = {
            apiVersion: 'v1',
            kind: 'Secret',
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
                object.data[key] = Buffer.from(options.inline[key].toString()).toString('base64');
            }
        }

        if (options.files) {
            for (const file of options.files) {
                object.data[basename(file)] = (await FSUtil.readFile(
                    FSUtil.getAbsolutePath(file, snapshot.wd),
                )).toString('base64');
            }
        }

        await Container.get(K8sKubectlService).applyObject(object, context);
    }
}
