import {ActionHandler, ActionSnapshot} from 'fbl/dist/src/models';
import * as Joi from 'joi';
import {IContext, IActionHandlerMetadata} from 'fbl/dist/src/interfaces';
import {IK8sObject_JOI_SCHEMA} from '../../interfaces';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../services';

const packageJson = require('../../../package.json');

export class K8sApplyObjectActionHandler extends ActionHandler {
    private static metadata = <IActionHandlerMetadata> {
        id: 'a6s.k8s.kubectl.apply',
        version: packageJson.version,
        aliases: [
            'k8s.kubectl.apply',
            'kubectl.apply'
        ]
    };

    getMetadata(): IActionHandlerMetadata {
        return K8sApplyObjectActionHandler.metadata;
    }

    getValidationSchema(): Joi.SchemaLike | null {
        return IK8sObject_JOI_SCHEMA;
    }

    async execute(options: any, context: IContext, snapshot: ActionSnapshot): Promise<void> {
        await Container.get(K8sKubectlService).applyObject(options, context);
    }
}
