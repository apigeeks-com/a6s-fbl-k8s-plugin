import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata} from 'fbl/dist/src/interfaces';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../services';
import {IK8sObject, IK8sObject_JOI_SCHEMA} from '../../interfaces';

const packageJson = require('../../../../package.json');

export class K8sApplyDockerRegistrySecretActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.kubectl.apply.Secret.docker-registry',
        version: packageJson.version,
        aliases: [
            'k8s.kubectl.apply.Secret.docker-registry',
            'kubectl.apply.Secret.docker-registry',
            'kubectl.Secret.docker-registry'
        ]
    };

    private static schema = Joi.object()
        .keys({
            name: Joi.string().required().min(1),
            namespace: Joi.string().min(1),
            server: Joi.string().required(),
            username: Joi.string().required(),
            password: Joi.string().required(),
            email: Joi.string().required()
        });

    getMetadata(): IActionHandlerMetadata {
        return K8sApplyDockerRegistrySecretActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return K8sApplyDockerRegistrySecretActionHandler.schema;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        const object = <IK8sObject> {
            apiVersion: 'v1',
            kind: 'Secret',
            metadata: {
                name: options.name,
            },
            type: 'kubernetes.io/dockerconfigjson',
            data: {
                '.dockerconfigjson': Buffer.from(JSON.stringify({
                    auths: {
                        [options.server]: {
                            'username': options.username,
                            'password': options.password,
                            'email': options.email,
                            'auth': Buffer.from(`${options.username}:${options.password}`).toString('base64'),
                        },
                    },
                })).toString('base64'),
            },
        };

        if (options.namespace) {
            object.metadata.namespace = options.namespace;
        }

        await Container.get(K8sKubectlService).applyObject(object, context);
    }
}
