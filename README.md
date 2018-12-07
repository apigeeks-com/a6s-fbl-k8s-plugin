# Kubectl and Helm wrapper plugin

[FBL](https://www.npmjs.com/package/fbl) plugin that wrapps kubectl and helm cli utilities into fbl specific actions.

Additionally plugin contains handy utility actions to help you work with the cluster, like an action to automatically clean cluster from non-used objects and helm releases.

## Who might want to use it? 

- One who needs to have a single place to describe what his/her cluster should be like.
- One who needs to manage deployment in just few minutes for dozens of services.
- One who wants to make the cluster clean.

## Documentation

Available action handlers:

- [kubectl](docs/kubectl.md)
- [helm](docs/helm.md)

 