export interface IK8sCleanupOptions {
    dryRun: boolean;
    namespace: string;
    allowed?: {
        storageClass?: string[],
        persistentVolumeClaims?: string[],
        helms?: string[],
        secrets?: string[],
        configMaps?: string[],
    };
}
