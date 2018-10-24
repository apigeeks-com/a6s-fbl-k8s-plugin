import {IK8sObject} from '../interfaces';
import {Inject, Service} from 'typedi';
import {ChildProcessService} from './ChildProcessService';
import {IContext, IContextEntity} from 'fbl/dist/src/interfaces';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';

@Service()
export class K8sKubectlService {

    @Inject(() => ChildProcessService)
    private childProcessService: ChildProcessService;

    @Inject(() => TempPathsRegistry)
    private tempPathsRegistry: TempPathsRegistry;

    /**
     * Delete K8s Object
     * @param {IK8sObject} k8sObject
     * @returns {Promise<void>}
     */
    async deleteObject(k8sObject: IK8sObject): Promise<void> {
        const result = await this.childProcessService.exec('kubectl',
            [
                'delete',
                k8sObject.kind,
                k8sObject.metadata.name
            ]
        );

        if (result.code !== 0) {
            throw new Error('Unexpected error occurred ' + JSON.stringify(result));
        }
    }

    /**
     * Create new K8s Object
     * @param {IK8sObject} k8sObject
     * @param {IContext} context
     * @returns {Promise<void>}
     */
    async createObject(k8sObject: IK8sObject, context: IContext): Promise<void> {
        const tmpFile = await this.tempPathsRegistry.createTempFile(false, '.yml');
        await promisify(writeFile)(tmpFile, dump(k8sObject), 'utf8');

        const result = await this.childProcessService.exec('kubectl', [
            'create',
            '-f', tmpFile
        ]);

        if (result.code !== 0) {
            throw new Error(
                `Unable to create K8s object with name: ${k8sObject.metadata.name} and kind: ${k8sObject.kind} Error: ${result.stderr}`
            );
        }

        const contextEntity = K8sKubectlService.createEntity(k8sObject);
        context.entities.registered.push(contextEntity);
        context.entities.created.push(contextEntity);
    }

    /**
     * Apply object
     * @param {IK8sObject} k8sObject
     * @param {IContext} context
     * @return {Promise<void>}
     */
    async applyObject(k8sObject: IK8sObject, context: IContext): Promise<void> {
        const tmpFile = await this.tempPathsRegistry.createTempFile(false, '.yml');
        await promisify(writeFile)(tmpFile, dump(k8sObject), 'utf8');

        const result = await this.childProcessService.exec('kubectl', [
            'apply',
            '-f', tmpFile
        ]);

        if (result.code !== 0) {
            throw new Error(
                `Unable to apply K8s object with name: ${k8sObject.metadata.name} and kind: ${k8sObject.kind} Error: ${result.stderr}`
            );
        }

        const contextEntity = K8sKubectlService.createEntity(k8sObject);
        context.entities.registered.push(contextEntity);

        if (result.stdout.split(' ')[1] === 'created') {
            context.entities.created.push(contextEntity);
        } else {
            context.entities.updated.push(contextEntity);
        }
    }

    private static createEntity(k8sObject: IK8sObject): IContextEntity {
        return <IContextEntity> {
            type: k8sObject.kind,
            payload: k8sObject,
            id: k8sObject.metadata.name
        };
    }

    /**
     * Get existing K8s Object
     * @param {IK8sObject} k8sObject
     * @returns {Promise<any>}
     */
    async getObject(k8sObject: IK8sObject): Promise<any> {
        const result = await this.childProcessService.exec('kubectl', [
            'get',
            k8sObject.kind,
            k8sObject.metadata.name,
            '-o', 'json'
        ]);

        if (result.stderr.trim().indexOf('Error from server (NotFound)') === 0) {
            return null;
        }

        if (result.stdout) {
            return JSON.parse(result.stdout);
        }

        throw new Error('Unexpected error occurred ' + JSON.stringify(result));
    }

    /**
     * Get k8s objects
     *
     * @param {string} kind
     * @param {string} namespace
     * @return {Promise<string[]>}
     */
    async listObjects(kind: string, namespace = ''): Promise<string[]> {
        const args = ['get', kind];

        if (namespace !== '') {
            args.push('--namespace', namespace);
        }

        args.push('-o name');

        const result = await this.childProcessService.exec('kubectl', args);

        return result.stdout
            .split('\n')
            .map(l => l.trim().split('/').pop())
            .filter(l => l);
    }
}
