import {suite, test} from 'mocha-typescript';

import {K8sHelmUpgradeOrInstallActionHandler} from '../../../src/handlers/helm';
import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';
import * as assert from 'assert';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {ChildProcessService} from '../../../src/services';
import * as Joi from 'joi';
import {join} from 'path';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class K8sHelmUpgradeOrInstallActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

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

        // name: Joi.string(),
        //     namespace: Joi.string(),
        //     chart: Joi.string().required(),
        //     version: Joi.string(),
        //     variables: Joi.any(),
        //     variable_files: Joi.array().items(Joi.string()),
        //     wait: Joi.boolean(),
        //     timeout: Joi.number().integer().min(0).max(60 * 60) // 1h deployment limit
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

        const result = await Container.get(ChildProcessService).exec('helm', ['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.deepStrictEqual(result.stdout.trim(), options.name);
    }
}
