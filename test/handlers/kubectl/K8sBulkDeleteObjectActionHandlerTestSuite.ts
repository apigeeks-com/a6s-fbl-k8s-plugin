import {suite, test} from 'mocha-typescript';

import {K8sApplyObjectActionHandler, K8sBulkDeleteObjectActionHandler} from '../../../src/handlers/kubectl';
import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../../src/services';
import {K8sBaseHandlerTestSuite} from '../K8sBaseHandlerTestSuite';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class K8sBulkDeleteObjectActionHandlerTestSuite extends K8sBaseHandlerTestSuite {
    @test()
    async failValidation() {
        const actionHandler = new K8sBulkDeleteObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                names: ['test']
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                kind: 'CustomObject',
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                kind: 'CustomObject',
                names: []
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sBulkDeleteObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate({
            kind: 'CustomObject',
            names: ['test-*']
        }, context, snapshot, {});
    }

    @test()
    async deleteObject(): Promise<void> {
        const applyActionHandler = new K8sApplyObjectActionHandler();
        const deleteActionHandler = new K8sBulkDeleteObjectActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        const deleteObjectOne = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            data: {
                test: 'true'
            },
            metadata: {
                name: 'delete-obj-one'
            }
        };

        const deleteObjectTwo = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            data: {
                test: 'true'
            },
            metadata: {
                name: 'delete-obj-two'
            }
        };

        const notDeleteObject = {
            kind: 'ConfigMap',
            apiVersion: 'v1',
            data: {
                test: 'true'
            },
            metadata: {
                name: 'not-delete-obj'
            }
        };

        await applyActionHandler.execute(deleteObjectOne, context, snapshot, {});
        await applyActionHandler.execute(deleteObjectTwo, context, snapshot, {});
        await applyActionHandler.execute(notDeleteObject, context, snapshot, {});

        const configMapsAfterCreate = await Container.get(K8sKubectlService).listObjects('ConfigMap');

        chai.expect(configMapsAfterCreate).to.be.an('array').that.includes('not-delete-obj');
        chai.expect(configMapsAfterCreate).to.be.an('array').that.includes('delete-obj-one');
        chai.expect(configMapsAfterCreate).to.be.an('array').that.includes('delete-obj-two');

        const deleteContext = ContextUtil.generateEmptyContext();
        const deleteSnapshot = new ActionSnapshot('.', {}, '', 0, {});

        await deleteActionHandler.execute(
            {
                kind: 'ConfigMap',
                names: [
                    'delete-obj-*',
                ]
            },
            deleteContext,
            deleteSnapshot,
            {}
        );

        const configMapsAfterBulkDelete = await Container.get(K8sKubectlService).listObjects('ConfigMap');

        chai.expect(configMapsAfterBulkDelete).to.be.an('array').that.includes('not-delete-obj');
        chai.expect(configMapsAfterBulkDelete).to.be.an('array').that.not.includes('delete-obj-one');
        chai.expect(configMapsAfterBulkDelete).to.be.an('array').that.not.includes('delete-obj-two');
    }
}
