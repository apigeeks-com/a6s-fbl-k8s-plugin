import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../services';
import {FSUtil} from 'fbl/dist/src/utils';
import {IK8sObject, IK8sObject_JOI_SCHEMA} from '../../interfaces';
import {basename} from 'path';
import {promisify} from 'util';
import {readFile} from 'fs';

const packageJson = require('../../../package.json');

export class K8sApplyGenericSecretActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.kubectl.apply.Secret.generic',
        version: packageJson.version,
        aliases: [
            'k8s.kubectl.apply.Secret.generic',
            'kubectl.apply.Secret.generic',
            'kubectl.Secret.generic',
            'kubectl.Secret',
        ]
    };

    private static schema = IK8sObject_JOI_SCHEMA
        .keys({
            files: Joi.array().min(1).items(Joi.string().required()).optional(),
            inline: Joi.object()
                .pattern(
                    /[\w|\d]+/,
                    Joi.alternatives([Joi.string(), Joi.number()]),
                )
                .min(1)
                .optional(),
        });

    getMetadata(): IActionHandlerMetadata {
        return K8sApplyGenericSecretActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sApplyGenericSecretActionHandler.schema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
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
                object.data[basename(file)] = (await FSUtil.readFile(FSUtil.getAbsolutePath(file, snapshot.wd)))
                    .toString('base64');
            }
        }

        await Container.get(K8sKubectlService).applyObject(object, context);
    }
}
