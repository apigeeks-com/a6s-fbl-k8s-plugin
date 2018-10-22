import * as Joi from 'joi';

interface IHelmChart {
    /**
     * Release name
     */
    name: string;

    /**
     * Optional deployment namespace
     */
    namespace?: string;

    /**
     * Optional tiller namespace
     */
    tillerNamespace?: string;

    /**
     * Chart name (including repo prefix) to install, e.g: stable/rabbitmq or path to local file
     */
    chart: string;

    /**
     * Version to install.
     * If not specified latest will be used
     */
    version?: string;

    /**
     * Variable object to provide. Note: variables are passed after files
     */
    variables?: any;

    /**
     * Paths to variable files
     */
    variable_files?: string[];

    /**
     * If set, will wait until all Pods, PVCs, Services, and minimum number of Pods of a Deployment are in a ready state
     * before marking the release as successful. It will wait for as long as timeout
     */
    wait?: boolean;

    /**
     * Time in seconds to wait for any individual Kubernetes operation (like Jobs for hooks) (default 300)
     */
    timeout?: number;
}

const HelmChart_JOI_SCHEMA = Joi.object({
    name: Joi.string(),
    namespace: Joi.string(),
    chart: Joi.string().required(),
    version: Joi.string(),
    variables: Joi.any(),
    variable_files: Joi.array().items(Joi.string()),
    wait: Joi.boolean(),
    timeout: Joi.number().integer().min(0).max(60 * 60) // 1h deployment limit
}).options({ abortEarly: true });

export {IHelmChart, HelmChart_JOI_SCHEMA};
