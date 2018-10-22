import * as yaml from 'js-yaml';
import {Inject, Service} from 'typedi';
import {ChildProcessService} from './ChildProcessService';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {promisify} from 'util';
import {writeFile} from 'fs';
import {dump} from 'js-yaml';
import {IHelmChart, IHelmDeploymentInfo} from '../interfaces';

@Service()
export class K8sHelmService {
    @Inject(() => ChildProcessService)
    private childProcessService: ChildProcessService;

    @Inject(() => TempPathsRegistry)
    private tempPathsRegistry: TempPathsRegistry;

    /**
     * Remove helm chart
     * @param {string} name
     * @return {Promise<void>}
     */
    async remove(name: string): Promise<void> {
        const cmd = `helm del --purge ${name}`;
        const result = await this.childProcessService.exec(cmd);

        if (result.code !== 0) {
            throw new Error(result.stderr);
        }
    }

    /**
     * Update or install helm chart
     * @param {IHelmChart} config
     * @return {Promise<void>}
     */
    async updateOrInstall(config: IHelmChart): Promise<void> {
        const cmd = [
            'helm upgrade --install'
        ];

        if (config.namespace) {
            cmd.push('--namespace ' + config.namespace);
        }

        if (config.tillerNamespace) {
            cmd.push('--tiller-namespace ' + config.tillerNamespace);
        }

        if (config.hasOwnProperty('timeout')) {
            cmd.push('--timeout ' + config.timeout);
        }

        if (config.wait) {
            cmd.push('--wait');
        }

        // tslint:disable-next-line
        config.variable_files && config.variable_files.forEach(f => {
            cmd.push(`-f ${f}`);
        });

        if (config.variables) {
            const tmpFile = await this.tempPathsRegistry.createTempFile(false, '.yml');
            await promisify(writeFile)(tmpFile, dump(config.variables), 'utf8');
            cmd.push(`-f ${tmpFile}`);
        }

        cmd.push(config.name);
        cmd.push(config.chart);

        const result = await this.childProcessService.exec(cmd.join(' '));

        if (result.code !== 0) {
            throw new Error(result.stderr);
        }
    }

    /**
     * List installed helms
     * @returns {Promise<string[]>}
     */
    async listInstalledHelms(): Promise<string[]> {
        const result = await this.childProcessService.exec('helm list -q');

        return result.stdout
            .split('\n')
            .map(l => l.trim())
            .filter(l => l)
            ;
    }

    /**
     * Check if deployment exists
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async isDeploymentExists(name: string): Promise<boolean> {
        const helmResult = await this.childProcessService.exec(`helm get ${name}`);

        return helmResult.stdout.trim() !== `Error: release: "${name}" not found`;
    }

    /**
     * Get k8s objects in helm
     *
     * @param {string} name
     * @return {Promise<IK8sObject[]>}
     */
    async getHelmObjects(name: string) {
        const helmResult = await this.childProcessService.exec(`helm get ${name}`);

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
        const helmResult = await this.childProcessService.exec(`helm get ${name}`);

        if (helmResult.stdout.indexOf('Error') === 0) {
            throw new Error(helmResult.stdout);
        }

        helmResult.stdout
            .replace('COMPUTED VALUES', 'COMPUTE-VALUES')
            .replace('USER-SUPPLIED VALUES', 'USER-SUPPLIED-VALUES')
        ;

        const lines = helmResult.stdout.split('\n').map(l => l.trim());

        const revisionKey = 'REVISION: ';
        const releasedKey = 'RELEASED: ';
        const chartKey = 'CHART: ';
        const userSuppliedValuesKey = 'USER-SUPPLIED VALUES:';
        const computedValuesKey = 'COMPUTED VALUES:';

        const revisionLine = lines.find(l => l.indexOf(revisionKey) === 0);
        const releasedLine = lines.find(l => l.indexOf(releasedKey) === 0);
        const chartLine = lines.find(l => l.indexOf(chartKey) === 0);
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

        return <IHelmDeploymentInfo> {
            revision: revisionLine && revisionLine.substring(revisionKey.length),
            released: releasedLine && new Date(releasedLine.substring(releasedKey.length)),
            chart: chartLine && chartLine.substring(chartKey.length),
            userSuppliedValues: userSuppliedValues,
            computedValues: computedValues
        };
    }
}
