export interface IK8sCleanupOptions {
    dryRun: boolean;
    namespace: string;
    kinds?: string[];
    allowed?: {[key: string]: string[]};
}
