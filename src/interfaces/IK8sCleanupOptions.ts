export interface IK8sCleanupOptions {
    dryRun: boolean;
    namespace: string;
    kins?: string[];
    allowed?: {[key: string]: string[]};
}
