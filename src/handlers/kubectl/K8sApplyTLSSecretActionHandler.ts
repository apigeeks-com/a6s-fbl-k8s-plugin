import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../services';
import {IK8sObject, IK8sObject_JOI_SCHEMA} from '../../interfaces';
import {FSUtil} from 'fbl/dist/src/utils';

const packageJson = require('../../../package.json');

export class K8sApplyTLSSecretActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.kubectl.apply.secret.tls',
        version: packageJson.version,
        aliases: [
            'k8s.kubectl.apply.secret.tls',
            'kubectl.apply.secret.tls',
            'kubectl.secret.tls'
        ]
    };

    private static schema = IK8sObject_JOI_SCHEMA
        .keys({
            cert: Joi.string().required(),
            key: Joi.string().required(),
        });

    getMetadata(): IActionHandlerMetadata {
        return K8sApplyTLSSecretActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sApplyTLSSecretActionHandler.schema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
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
        object.data['tls.crt'] = await FSUtil.readTextFile(FSUtil.getAbsolutePath(options.cert, snapshot.wd));
        object.data['tls.key'] = await FSUtil.readTextFile(FSUtil.getAbsolutePath(options.key, snapshot.wd));

        await Container.get(K8sKubectlService).applyObject(object, context);
    }
}
