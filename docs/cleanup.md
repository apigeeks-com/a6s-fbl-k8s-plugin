# Helm/K8s objects cleanup

Make you cluster clean from old and unused resources. 

Upon execution action handler looks into `entities.registered` list for K8s objects and helm charts that were previously created or updated and keeps them in cluster. All other resources will be removed.

Additionally, you have an option to whitelist resources by placing them into `ignored` section or manually push them into `entities.registered` section with [fbl core action](https://fbl.fireblink.com/plugins/context#action-handler-mark-entities-as-registered).

**ID:** `a6s.k8s.cleanup`

**Aliases:**
* `k8s.cleanup`

**Example 1: Remove all unknown objects**

```yaml
# cleanup all k8s objects inside `default` namespace with one of the following kind:
# - Secret
# - ConfigMap
# - StorageClass
# - PersistentVolumeClaim
k8s.cleanup:
  namespace: default
```

**Example 2: Dry run**

Instead of making actual cleanup - just print helm releases and K8s objects that will be found for removal. Make sure you're using `--verbose` fbl CLI option to see the output. 

```yaml
# cleanup all k8s objects inside `default` namespace with one of the following kind:
# - Secret
# - ConfigMap
# - StorageClass
# - PersistentVolumeClaim
k8s.cleanup:
  dryRun: true
  namespace: default
```

**Example 3: Provide own lists of k8s object kinds**

```yaml
# cleanup Ingress objects only inside the `default` namespace
k8s.cleanup:
  namespace: default
  kinds: 
    - Ingress      
```

**Example 4: Whitelist resources by pattern**

Allows to whitelist resources by name pattern. Useful to keep system objects and ones that not-managed by deployment process.

```yaml
# Remove all resource except:
# - Secrets that match `default-*` pattern
# - Helm release with name "jenkins" 
k8s.cleanup:
  namespace: default
  # define patterns to ignore
  ignored:
    # key value pair of Object kinds and array of name patterns for that kind 
    objects:
      Secret:
        - default-*  
    # list of release name patterns to ignore upon cleanup (keep them in cluster)
    helm:
      - jenkins    
```
