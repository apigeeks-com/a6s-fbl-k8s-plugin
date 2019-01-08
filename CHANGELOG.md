# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## 1.0.1 - 2019-01-08

### Fixed

- [\#42](https://github.com/apigeeks-com/a6s-fbl-k8s-plugin/issues/42) Fixed wrong fbl dependency version that didn't allow to use plugin without specifying unsafe option.

## 1.0.0 - 2018-12-25

### Added

- [\#9](https://github.com/apigeeks-com/a6s-fbl-k8s-plugin/issues/9) New action handler `kubectl.delete.bulk`.
- [\#10](https://github.com/apigeeks-com/a6s-fbl-k8s-plugin/issues/10) New action handler `helm.describe`.
- \[Development\] TS Lint, Git Commit Lint and other development oriented changes.

### Changed

- [\#11](https://github.com/apigeeks-com/a6s-fbl-k8s-plugin/issues/11) `kubectl.get` action handler signature was changed to follow same convention as other handlers.

## 0.0.5 - 2018-11-19

### Added

- Helm/kubectl cleanup action handler.

## 0.0.4 - 2018-11-12

### Added

- Kubectl "get" action handler.

### Changed

- Local kind (kubernetes in docker) creation logic.
