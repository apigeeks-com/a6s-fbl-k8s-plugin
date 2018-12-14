import { suite, test } from 'mocha-typescript';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as assert from 'assert';
import { Container } from 'typedi';
import { ContextUtil, ActionSnapshot } from 'fbl';

import { K8sApplyObjectActionHandler, K8sGetObjectActionHandler } from '../../../src/handlers/kubectl';
import { K8sKubectlService } from '../../../src/services';
import { K8sBaseHandlerTestSuite } from '../K8sBaseHandlerTestSuite';

chai.use(chaiAsPromised);

@suite()
class K8sGetObjectActionHandlerTestSuite extends K8sBaseHandlerTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sGetObjectActionHandler();
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

        await chai.expect(
            actionHandler.validate(
                {
                    kind: 'CustomObject',
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    kind: 'CustomObject',
                    metadata: {},
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    kind: 'CustomObject',
                    metadata: {
                        name: 'test',
                    },
                },
                context,
                snapshot,
                {},
            ),
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate(
                {
                    kind: 'CustomObject',
                    metadata: {
                        name: 'test',
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
        const actionHandler = new K8sGetObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(
            {
                kind: 'CustomObject',
                metadata: {
                    name: 'test',
                },
                assignTo: {
                    ctx: '$.test',
                },
            },
            context,
            snapshot,
            {},
        );
    }

    @test()
    async getObject(): Promise<void> {
        const applyActionHandler = new K8sApplyObjectActionHandler();
        const getActionHandler = new K8sGetObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const obj = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            data: {
                test: 'true',
            },
            metadata: {
                name: 'delete-obj-test',
            },
        };

        await applyActionHandler.validate(obj, context, snapshot, {});
        await applyActionHandler.execute(obj, context, snapshot, {});

        const result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            obj.kind,
            obj.metadata.name,
            '-o',
            'json',
        ]);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, obj.data);

        // get object
        const options = {
            kind: obj.kind,
            metadata: {
                name: obj.metadata.name,
            },
            assignTo: {
                ctx: '$.test',
                secrets: '$.test',
            },
            pushTo: {
                ctx: '$.testPush',
            },
        };
        await getActionHandler.validate(options, context, snapshot, {});
        await getActionHandler.execute(options, context, snapshot, {});

        assert.strictEqual(context.ctx.test.kind, obj.kind);
        assert.strictEqual(context.ctx.test.kind, obj.kind);
        assert.deepStrictEqual(context.ctx.test.data, obj.data);
        assert.deepStrictEqual(context.ctx.testPush[0].kind, obj.kind);

        assert.strictEqual(context.secrets.test.kind, obj.kind);
        assert.strictEqual(context.secrets.test.kind, obj.kind);
        assert.deepStrictEqual(context.secrets.test.data, obj.data);
    }
}
