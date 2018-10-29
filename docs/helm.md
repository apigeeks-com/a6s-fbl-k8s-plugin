# Helm wrapper

Allows to use common helm commands inside fbl flow.

## Action Handler: Update or Install Helm Chart

**ID:** a6s.k8s.helm.upgradeOrInstall

**Aliases:**
 - k8s.helm.upgradeOrInstall
 - helm.upgradeOrInstall
 - helm.install
 
**Example:**
```yaml
helm.install:
  # chart name or relative path
  chart: Joi.string().required(),
  # [optional] release name (if not provided - helm will give a random one, it is highly recommended to provide own one)
  name: Joi.string(),
  # [optional] k8s namespace to use
  namespace: Joi.string(),
  # [optional] chart version
  version: Joi.string(),
  # [optional] chart variables      
  variables:
    # [optional] define values inline
    inline:       
      port: 8000 
      
    # [optional] and/or via files.
    # Note: inline variables will be applied after files, so they may override values in files 
    files: 
      - /path/to/vars.yml
    
    # [optional] whether to wait for helm chart to be installed
    wait: Joi.boolean(),
    # [optional] timeout in seconds - min 0, max 3600 (1 hour)
    timeout: Joi.number().integer().min(0).max(60 * 60)
```