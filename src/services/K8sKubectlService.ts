import {IK8sObject} from '../interfaces';
import {Inject, Service} from 'typedi';
import {IContext, IContextEntity} from 'fbl/dist/src/interfaces';
import {ChildProcessService, TempPathsRegistry} from 'fbl/dist/src/services';
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
     * Execute "helm" command
     * @param {string[]} args
     * @param {string} wd
     * @return {Promise<{code: number; stdout: string; stderr: string}>}
     */
    async execKubectlCommand(args: string[], wd?: string): Promise<{code: number, stdout: string, stderr: string}> {
        const stdout: string[] = [];
        const stderr: string[] = [];

        const code = await this.childProcessService.exec(
            'kubectl',
            args,
            wd || '.',
            {
                stdout: (chunk: any) => {
                    stdout.push(chunk.toString().trim());
                },
                stderr: (chunk: any) => {
                    stderr.push(chunk.toString().trim());
                }
            }
        );

        return {
            code,
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n')
        };
    }

    /**
     * Delete K8s object
     * @param {IK8sObject} k8sObject
     * @param {IContext} context
     * @return {Promise<void>}
     */
    async deleteObject(k8sObject: IK8sObject, context: IContext): Promise<void> {
        const args = [
            'delete',
            k8sObject.kind,
            k8sObject.metadata.name
        ];

        if (k8sObject.metadata.namespace) {
            args.push('-n', k8sObject.metadata.namespace);
        }

        const result = await this.execKubectlCommand(args);

        if (result.code !== 0) {
            throw new Error('Unexpected error occurred ' + JSON.stringify(result));
        }

        const contextEntity = K8sKubectlService.createEntity(k8sObject);
        context.entities.unregistered.push(contextEntity);
        context.entities.deleted.push(contextEntity);
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

        const result = await this.execKubectlCommand([
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

        const result = await this.execKubectlCommand([
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
        const result = await this.execKubectlCommand([
            'get',
            k8sObject.kind,
            k8sObject.metadata.name,
            '-o', 'json'
        ]);

        if (result.stderr.trim().indexOf('Error from server (NotFound)') === 0) {
            throw new Error(`Object ${k8sObject.kind} with name ${k8sObject.metadata.name} not found`);
        }

        if (result.code) {
            throw new Error(`Unexpected error occurred upon getting object ${k8sObject.kind} with name ${k8sObject.metadata.name}. ${result.stderr.trim()}`);
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

        const result = await this.execKubectlCommand(args);

        return result.stdout
            .split('\n')
            .map(l => l.trim().split('/').pop())
            .filter(l => l);
    }
}
