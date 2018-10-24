# Kubectl wrapper

Allows to use common kubectl commands inside fbl flow.

## Action Handler: Apply ConfigMap

**ID:** a6s.k8s.kubectl.apply.ConfigMap

**Aliases:**
 - k8s.kubectl.apply.ConfigMap
 - kubectl.apply.ConfigMap
 - kubectl.ConfigMap
 
**Example:**

```yaml
kubectl.ConfigMap: 
  # Name of the ConfigMap
  name: application-config-map
  # [optional] K8s namespace
  namespace: default
  # [optional] files to apply
  files:
    # note: just like with kubectl test.yml will be used as key inside the ConfigMap
    # make sure not to pass paths to files with same name
    - some/path/to/test.yml
  # [optional] define config map values inline (key/value pairs)
  inline:    
    # where value can be a string ...
    host: foo.bar
    # ... or number
    port: 8000 
```