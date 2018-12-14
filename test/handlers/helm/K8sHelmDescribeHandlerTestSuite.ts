import * as assert from 'assert';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Container } from 'typedi';
import { join } from 'path';
import { suite, test } from 'mocha-typescript';
import { ContextUtil, ActionSnapshot } from 'fbl';

import { K8sHelmService } from '../../../src/services/';
import { K8sHelmBaseTestSuite } from './K8sHelmBaseTestSuite';
import { K8sHelmDescribeHandler } from '../../../src/handlers/helm';
import { IK8sObject } from '../../../src/interfaces';

chai.use(chaiAsPromised);

@suite()
class K8sHelmDescribeHandlerTestSuite extends K8sHelmBaseTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sHelmDescribeHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(actionHandler.validate([], context, snapshot, {})).to.be.rejected;
        await chai.expect(actionHandler.validate({}, context, snapshot, {})).to.be.rejected;
        await chai.expect(
            actionHandler.validate(
                {
                    chart: {
                        assignTo: 'foo',
                    },
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sHelmDescribeHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(
            {
                name: 'test',
            },
            context,
            snapshot,
            {},
        );
    }

    @test()
    async describeHelm(): Promise<void> {
        const name = 'delete-helm-test';
        const assetsDir = join(__dirname, '../../../../test/assets');

        // install helm chart
        let result = await Container.get(K8sHelmService).execHelmCommand(
            ['install', '-n', name, '--wait', 'helm/sample'],
            assetsDir,
        );

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        // verify helm exists
        result = await Container.get(K8sHelmService).execHelmCommand(['list', '-q']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.deepStrictEqual(result.stdout.trim(), name);

        const actionHandler = new K8sHelmDescribeHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '.', 0, {});

        const options = {
            name: name,
            chart: {
                assignTo: '$.ctx.chart.assignTo',
                pushTo: '$.ctx.chart.pushTo',
            },
            objects: {
                assignTo: '$.ctx.objects.assignTo',
                pushTo: '$.ctx.objects.pushTo',
            },
        };

        await actionHandler.validate(options, context, snapshot, {});
        await actionHandler.execute(options, context, snapshot, {});

        const expectedResult = {
            revision: '1',
            released: context.ctx.chart.assignTo.released, // The date is always different can not be reliably verified
            chart: 'sample-0.1.0',
            userSuppliedValues: {},
            computedValues: {},
        };

        assert.deepStrictEqual(context.ctx.chart.assignTo, expectedResult);
        assert.deepStrictEqual(context.ctx.chart.pushTo, [expectedResult]);
        assert.deepStrictEqual(context.ctx.objects.assignTo.map((o: IK8sObject) => o.kind), ['Service', 'Deployment']);
        assert.deepStrictEqual(context.ctx.objects.pushTo[0].map((o: IK8sObject) => o.kind), ['Service', 'Deployment']);
    }
}
