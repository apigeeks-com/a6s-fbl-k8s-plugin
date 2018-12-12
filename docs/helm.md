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
  chart: stable/jenkins
  # [optional] release name (if not provided - helm will give a random one, it is highly recommended to provide own one)
  name: jenkins
  # [optional] k8s namespace to use
  namespace: default
  # [optional] chart version
  version: 1.0.0
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
    wait: true
    # [optional] timeout in seconds - min 0, max 3600 (1 hour)
    timeout: 300
```

## Action Handler: Helm Delete

**ID:** a6s.k8s.helm.delete

**Aliases:**

- k8s.helm.delete
- helm.delete

**Example:**

```yaml
helm.delete:
  # release name
  name: release-name
```

## Action Handler: Helm Describe

**ID:** a6s.k8s.helm.describe

**Aliases:**

- k8s.helm.describe
- helm.describe

**Example:**

```yaml
helm.describe:
  # [required] helm chart release name
  name: ftpo
  # [optional] define paths to store chart information
  chart:
    assignTo: '$.ctx.chart'
    pushTo: '$.ctx.chart'
  # [optional] define paths to store helm k8s objects
  objects:
    assignTo: '$.ctx.chart'
    pushTo: '$.ctx.chart'
```
