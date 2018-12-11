export interface IHelmChart {
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
     * Variables
     */
    variables: {
        // Note: inline variables are passed after files
        inline?: any;
        // Paths to variable files
        files?: string[];
    };

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
