import * as yaml from 'js-yaml';
import { Inject, Service } from 'typedi';
import { promisify } from 'util';
import { exists, writeFile } from 'fs';
import { dump } from 'js-yaml';
import { ChildProcessService, TempPathsRegistry } from 'fbl/dist/src/services';
import { FSUtil } from 'fbl/dist/src/utils';
import { IContext, IContextEntity } from 'fbl/dist/src/interfaces';

import { IHelmChart, IHelmDeploymentInfo, IK8sObject, IExecOutput } from '../interfaces';

@Service()
export class K8sHelmService {
    @Inject(() => ChildProcessService)
    private childProcessService: ChildProcessService;

    @Inject(() => TempPathsRegistry)
    private tempPathsRegistry: TempPathsRegistry;

    /**
     * Execute "helm" command
     * @param {string[]} args
     * @param {string} wd
     * @return {Promise<IExecOutput>}
     */
    async execHelmCommand(args: string[], wd?: string): Promise<IExecOutput> {
        const stdout: string[] = [];
        const stderr: string[] = [];

        const code = await this.childProcessService.exec('helm', args, wd || '.', {
            stdout: (chunk: any) => {
                stdout.push(chunk.toString().trim());
            },
            stderr: (chunk: any) => {
                stderr.push(chunk.toString().trim());
            },
        });

        return {
            code,
            stdout: stdout.join('\n'),
            stderr: stderr.join('\n'),
        };
    }

    /**
     * Remove helm chart
     * @param {string} name
     * @param {IContext} context
     * @return {Promise<void>}
     */
    async remove(name: string, context: IContext): Promise<void> {
        const result = await this.execHelmCommand(['del', '--purge', name]);

        if (result.code !== 0) {
            throw new Error(
                `Unable to delete helm, command returned non-zero exit code. Code: ${result.code}\nstderr: ${
                    result.stderr
                }\nstdout: ${result.stdout}`,
            );
        }

        const contextEntity = this.createEntity(<IHelmChart>{ name });
        context.entities.unregistered.push(contextEntity);
        context.entities.deleted.push(contextEntity);
    }

    private createEntity(helmConfig: IHelmChart): IContextEntity {
        return <IContextEntity>{
            type: 'helm',
            payload: helmConfig,
            id: helmConfig.name,
        };
    }

    /**
     * Update or install helm chart
     * @param {IHelmChart} config
     * @param {string} wd working directory
     * @param context
     * @return {Promise<void>}
     */
    async updateOrInstall(config: IHelmChart, wd: string, context: IContext): Promise<void> {
        const args = ['upgrade', '--install'];

        if (config.namespace) {
            args.push('--namespace', config.namespace);
        }

        if (config.tillerNamespace) {
            args.push('--tiller-namespace', config.tillerNamespace);
        }

        if (config.hasOwnProperty('timeout')) {
            args.push('--timeout', config.timeout.toString());
        }

        if (config.wait) {
            args.push('--wait');
        }

        if (config.variables) {
            if (config.variables.files) {
                config.variables.files.forEach(f => {
                    args.push('-f', FSUtil.getAbsolutePath(f, wd));
                });
            }

            if (config.variables.inline) {
                const tmpFile = await this.tempPathsRegistry.createTempFile(false, '.yml');
                await promisify(writeFile)(tmpFile, dump(config.variables.inline), 'utf8');
                args.push('-f', tmpFile);
            }
        }

        args.push(config.name);

        const localPath = FSUtil.getAbsolutePath(config.chart, wd);
        const existsLocally = await promisify(exists)(localPath);

        if (existsLocally) {
            args.push(localPath);
        } else {
            args.push(config.chart);
        }

        const isHelmUpdated = await this.isDeploymentExists(config.name);
        const result = await this.execHelmCommand(args);

        if (result.code !== 0) {
            throw new Error(
                `Unable to update or install helm chart, command returned non-zero exit code. Code: ${
                    result.code
                }\nstderr: ${result.stderr}\nstdout: ${result.stdout}`,
            );
        }

        const contextEntity = this.createEntity(config);
        context.entities.registered.push(contextEntity);

        if (!isHelmUpdated) {
            context.entities.created.push(contextEntity);
        } else {
            context.entities.updated.push(contextEntity);
        }
    }

    /**
     * List installed helms
     * @returns {Promise<string[]>}
     */
    async listInstalledHelms(): Promise<string[]> {
        const result = await this.execHelmCommand(['list', '-q']);

        return (
            result.stdout
                .split('\n')
                .map(l => l.trim())
                .filter(l => l) || []
        );
    }

    /**
     * Check if deployment exists
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async isDeploymentExists(name: string): Promise<boolean> {
        const helmResult = await this.execHelmCommand(['get', name]);

        return helmResult.stdout.trim() !== `Error: release: "${name}" not found`;
    }

    /**
     * Get k8s objects in helm
     *
     * @param {string} name
     * @return {Promise<IK8sObject[]>}
     */
    async getHelmObjects(name: string) {
        const helmResult = await this.execHelmCommand(['get', name]);

        if (helmResult.stdout.indexOf('Error') === 0) {
            throw new Error(helmResult.stdout);
        }

        const objects = helmResult.stdout.split('---\n');
        objects.shift();

        return objects.map((rawObject: string) => {
            return yaml.safeLoad(rawObject.replace(/^#.*Source.+?$/m, ''));
        });
    }

    /**
     * Get information about helm deployment
     * @param {string} name
     * @returns {Promise<IHelmDeploymentInfo>}
     */
    async getHelmDeployment(name: string): Promise<IHelmDeploymentInfo> {
        const helmResult = await this.execHelmCommand(['get', name]);

        if (helmResult.stdout.indexOf('Error') === 0) {
            throw new Error(helmResult.stdout);
        }

        const lines = helmResult.stdout
            .replace('COMPUTED VALUES', 'COMPUTE-VALUES')
            .replace('USER-SUPPLIED VALUES', 'USER-SUPPLIED-VALUES')
            .split('\n')
            .map(l => l.trim());

        const userSuppliedValuesKey = 'USER-SUPPLIED VALUES:';
        const computedValuesKey = 'COMPUTED VALUES:';

        const userValuesLine = lines.find(l => l.indexOf(userSuppliedValuesKey) === 0);
        const computedValuesLine = lines.find(l => l.indexOf(computedValuesKey) === 0);

        let userSuppliedValues = {};
        let computedValues = {};

        if (userValuesLine) {
            let idx = lines.indexOf(userValuesLine);
            const values = [];

            while (lines[++idx]) {
                const line = lines[idx].trimRight();

                if (line.length) {
                    values.push(line);
                }
            }

            userSuppliedValues = yaml.safeLoad(values.join('\n')) || {};
        }

        if (computedValuesLine) {
            let idx = lines.indexOf(computedValuesLine);
            const values = [];

            while (lines[++idx]) {
                const line = lines[idx].trimRight();

                if (line.length) {
                    values.push(line);
                }
            }

            computedValues = yaml.safeLoad(values.join('\n')) || {};
        }

        const searchValue = (text: string, label: string) => {
            const value = text.split(new RegExp(`^${label}:\s*(.+?)^[A-Z]{2,}`, 'gmus'))[1];

            if (value) {
                return value.replace(/\n/gs, '');
            }
        };

        return <IHelmDeploymentInfo>{
            revision: searchValue(helmResult.stdout, 'REVISION'),
            released:
                searchValue(helmResult.stdout, 'RELEASED') && new Date(searchValue(helmResult.stdout, 'RELEASED')),
            chart: searchValue(helmResult.stdout, 'CHART'),
            userSuppliedValues: userSuppliedValues,
            computedValues: computedValues,
        };
    }
}
