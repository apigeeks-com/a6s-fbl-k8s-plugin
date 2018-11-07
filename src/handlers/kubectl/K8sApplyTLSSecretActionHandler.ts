import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata, IDelegatedParameters} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../services';
import {IK8sObject, IK8sObject_JOI_SCHEMA} from '../../interfaces';
import {FSUtil} from 'fbl/dist/src/utils';
import {promisify} from 'util';
import {exists} from 'fs';

const packageJson = require('../../../../package.json');

export class K8sApplyTLSSecretActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.kubectl.apply.Secret.tls',
        version: packageJson.version,
        aliases: [
            'k8s.kubectl.apply.Secret.tls',
            'kubectl.apply.Secret.tls',
            'kubectl.Secret.tls'
        ]
    };

    private static schema = Joi.object()
        .keys({
            name: Joi.string().required().min(1),
            namespace: Joi.string().min(1),
            inline: Joi.object({
                cert: Joi.string().required(),
                key: Joi.string().required()
            }),
            files: Joi.object({
                cert: Joi.string().required(),
                key: Joi.string().required()
            })
        }).xor(['inline', 'files']);

    /* istanbul ignore next */
    getMetadata(): IActionHandlerMetadata {
        return K8sApplyTLSSecretActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sApplyTLSSecretActionHandler.schema;
    }

    async validate(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        await super.validate(options, context, snapshot, parameters);

        if (options.files) {
            const existsAsync = promisify(exists);

            const certExists = await existsAsync(FSUtil.getAbsolutePath(options.files.cert, snapshot.wd));
            if (!certExists) {
                throw new Error('Unable to locate cert file for given path');
            }

            const keyExists = await existsAsync(FSUtil.getAbsolutePath(options.files.key, snapshot.wd));
            if (!keyExists) {
                throw new Error('Unable to locate key file for given path');
            }
        }
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot, parameters: IDelegatedParameters): Promise<void> {
        const object: IK8sObject = {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: options.name,
            },
            type: 'kubernetes.io/tls',
            data: {},
        };

        if (options.namespace) {
            object.metadata.namespace = options.namespace;
        }

        object.data = {};
        if (options.inline) {
            object.data['tls.crt'] = new Buffer(options.inline.cert).toString('base64');
            object.data['tls.key'] = new Buffer(options.inline.key).toString('base64');
        } else {
            object.data['tls.crt'] = (await FSUtil.readFile(FSUtil.getAbsolutePath(options.files.cert, snapshot.wd))).toString('base64');
            object.data['tls.key'] = (await FSUtil.readFile(FSUtil.getAbsolutePath(options.files.key, snapshot.wd))).toString('base64');
        }

        await Container.get(K8sKubectlService).applyObject(object, context);
    }
}
