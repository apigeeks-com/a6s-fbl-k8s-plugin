import * as assert from 'assert';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Container } from 'typedi';
import { suite, test } from 'mocha-typescript';
import { ContextUtil } from 'fbl/dist/src/utils';
import { ActionSnapshot } from 'fbl/dist/src/models';

import { K8sApplyObjectActionHandler, K8sDeleteObjectActionHandler } from '../../../src/handlers/kubectl';
import { K8sKubectlService } from '../../../src/services';
import { K8sBaseHandlerTestSuite } from '../K8sBaseHandlerTestSuite';

chai.use(chaiAsPromised);

@suite()
class K8sDeleteObjectActionHandlerTestSuite extends K8sBaseHandlerTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sDeleteObjectActionHandler();
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
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sDeleteObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate(
            {
                kind: 'CustomObject',
                metadata: {
                    name: 'test',
                },
            },
            context,
            snapshot,
            {},
        );
    }

    @test()
    async deleteObject(): Promise<void> {
        const applyActionHandler = new K8sApplyObjectActionHandler();
        const deleteActionHandler = new K8sDeleteObjectActionHandler();
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

        let result = await Container.get(K8sKubectlService).execKubectlCommand([
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

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);

        // delete object
        await deleteActionHandler.validate(obj, context, snapshot, {});
        await deleteActionHandler.execute(obj, context, snapshot, {});

        result = await Container.get(K8sKubectlService).execKubectlCommand([
            'get',
            obj.kind,
            obj.metadata.name,
            '-o',
            'json',
        ]);

        if (result.code === 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        assert.strictEqual(
            result.stderr.trim(),
            `Error from server (NotFound): configmaps "${obj.metadata.name}" not found`,
        );
    }
}
