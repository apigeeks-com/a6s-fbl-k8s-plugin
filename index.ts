import {IPlugin} from "fbl/dist/src/interfaces";
import {
    K8sApplyConfigMapActionHandler,
    K8sApplyDockerRegistrySecretActionHandler,
    K8sApplyGenericSecretActionHandler,
    K8sApplyObjectActionHandler,
    K8sApplyTLSSecretActionHandler
} from "./src/handlers";
import {K8sHelmDeleteActionHandler, K8sHelmUpgradeOrInstallActionHandler} from './src/handlers/helm';

const packageJson = require('../package.json');

module.exports = <IPlugin> {
  name: packageJson.name,

  description: `kubectl and helm wrapper plugin`,

  tags: packageJson.keywords,

  version: packageJson.version,

  requires: {
    fbl: `>=${packageJson.dependencies.fbl}`,
    applications: [
      'kubectl',
      'helm'
    ]
  },

  reporters: [],

  actionHandlers: [
      // helm
      new K8sHelmDeleteActionHandler(),
      new K8sHelmUpgradeOrInstallActionHandler(),

      // kubectl
      new K8sApplyConfigMapActionHandler(),
      new K8sApplyDockerRegistrySecretActionHandler(),
      new K8sApplyGenericSecretActionHandler(),
      new K8sApplyObjectActionHandler(),
      new K8sApplyTLSSecretActionHandler()
  ],

  templateUtils: []
};
