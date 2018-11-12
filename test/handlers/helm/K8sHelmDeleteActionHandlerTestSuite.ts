import {suite, test} from 'mocha-typescript';

import {K8sHelmDeleteActionHandler} from '../../../src/handlers/helm';
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
class K8sHelmDeleteActionHandlerTestSuite extends K8sHelmBaseTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sHelmDeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({}, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sHelmDeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate({
            name: 'test'
        }, context, snapshot, {});
    }

    @test()
    async deleteHelm(): Promise<void> {
        const name = 'delete-helm-test';
        const assetsDir = join(__dirname, '../../../../test/assets');

        // install helm chart
        let result = await Container.get(K8sHelmService)
            .execHelmCommand(['install', '-n', name, '--wait', 'helm/sample'], assetsDir);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        // verify helm exists
        result = await Container.get(K8sHelmService)
            .execHelmCommand(['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.deepStrictEqual(result.stdout.trim(), name);

        const actionHandler = new K8sHelmDeleteActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '.', 0, {});

        const options = {
            name: name
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        result = await Container.get(K8sHelmService)
            .execHelmCommand(['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.deepStrictEqual(result.stdout.trim(), '');
    }
}
