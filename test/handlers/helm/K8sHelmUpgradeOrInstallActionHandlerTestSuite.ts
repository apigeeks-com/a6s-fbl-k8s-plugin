import {suite, test} from 'mocha-typescript';

import {K8sHelmUpgradeOrInstallActionHandler} from '../../../src/handlers/helm';
import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';
import * as assert from 'assert';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {join} from 'path';
import {K8sHelmService} from '../../../src/services/';
import {K8sHelmBaseTestSuite} from './K8sHelmBaseTestSuite';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class K8sHelmUpgradeOrInstallActionHandlerTestSuite extends K8sHelmBaseTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await chai.expect(
            actionHandler.validate([], context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                name: 'test'
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate({
            chart: 'test'
        }, context, snapshot);
    }

    @test()
    async installHelm(): Promise<void> {
        const assetsDir = join(__dirname, '../../../../test/assets');

        const actionHandler = new K8sHelmUpgradeOrInstallActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, assetsDir, 0);

        const options = {
            chart: 'helm/sample',
            name: 'helm-test'
        };

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        const result = await Container.get(K8sHelmService)
            .execHelmCommand(['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.deepStrictEqual(result.stdout.trim(), options.name);
    }
}