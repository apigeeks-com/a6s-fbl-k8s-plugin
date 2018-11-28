export interface IK8sCleanupOptions {
    dryRun: boolean;
    namespace: string;
    abstractions?: string[];
    allowed?: {[key: string]: string[]};
}
