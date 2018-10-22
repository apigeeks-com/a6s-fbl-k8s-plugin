export interface IHelmDeploymentInfo {
    revision: string;
    released: Date;
    chart: string;
    userSuppliedValues: {[key: string]: any};
    computedValues: {[key: string]: any};
}
