import * as assert from 'assert';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { suite, test } from 'mocha-typescript';
import { Container } from 'typedi';
import { join } from 'path';
import { ContextUtil, ActionSnapshot } from 'fbl';

import { K8sHelmUpgradeOrInstallActionHandler } from '../../../src/handlers/helm';
import { K8sHelmService } from '../../../src/services/';
import { K8sHelmBaseTestSuite } from './K8sHelmBaseTestSuite';

chai.use(chaiAsPromised);

@suite()
class K8sHelmUpgradeOrInstallActionHandlerTestSuite extends K8sHelmBaseTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate([], context, snapshot, {})).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    name: 'test',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(
            {
                chart: 'test',
            },
            context,
            snapshot,
            {},
        );
    }

    @test()
    async installHelm(): Promise<void> {
        const assetsDir = join(process.cwd(), 'test/assets');

        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, assetsDir, 0, {});

        const options = {
            chart: 'helm/sample',
            name: 'helm-test',
            namespace: 'helm-test',
            tillerNamespace: 'kube-system',
            wait: true,
            timeout: 400,
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        const result = await Container.get(K8sHelmService).execHelmCommand(['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.deepStrictEqual(result.stdout.trim(), options.name);
        assert.deepStrictEqual(context.entities.registered[0].payload, options);
    }

    @test()
    async checkVariablesInline() {
        const assetsDir = join(process.cwd(), 'test/assets');

        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, assetsDir, 0, {});

        const options = {
            chart: 'helm/sample',
            name: 'helm-test-var-inline',
            variables: {
                inline: {
                    hosts: ['alpha', 'beta'],
                },
            },
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        assert.deepStrictEqual(context.entities.registered[0].payload, options);
        assert.deepStrictEqual(context.entities.updated[0].payload, options);
    }

    @test()
    async checkRemoveFail() {
        const context = ContextUtil.generateEmptyContext();
        const helmName = 'fake-helm-name';

        await chai.expect(Container.get(K8sHelmService).remove(helmName, context)).to.be.rejectedWith(helmName);
    }

    @test()
    async checkUpdateOrInstallFail() {
        const assetsDir = join(process.cwd(), 'test/assets');

        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, assetsDir, 0, {});

        const options = {
            chart: 'helm/sample',
            name: 'helm-check-update-or-install-fail',
            variables: {
                files: ['/fake/file/path'],
            },
        };

        await actionHandler.validate(options, context, snapshot, {});

        await chai
            .expect(actionHandler.execute(options, context, snapshot, {}))
            .to.be.rejectedWith(options.variables.files[0]);
    }

    @test
    async checkGetHelmObjectsFail() {
        await chai
            .expect(Container.get(K8sHelmService).getHelmObjects(''))
            .to.be.rejectedWith('release name is required');
    }

    @test
    async checkGetHelmDeploymentFail() {
        await chai
            .expect(Container.get(K8sHelmService).getHelmDeployment(''))
            .to.be.rejectedWith('release name is required');
    }
}
