export interface IK8sCleanupOptions {
    dryRun: boolean;
    namespace: string;
    kinds?: string[];
    ignored?: {
        objects: { [key: string]: string[] };
        helms: string[];
    };
}
