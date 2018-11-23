import {suite, test} from 'mocha-typescript';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {ActionSnapshot} from 'fbl/dist/src/models';
import {ContextUtil} from 'fbl/dist/src/utils';
import {K8sCleanupActionHandler} from '../../src/handlers';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
export class K8sCleanupActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation() {
        const actionHandler = new K8sCleanupActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await chai.expect(
            actionHandler.validate([], context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                dryRun: true
            }, context, snapshot, {})
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                namespace: 'default',
                allowed: {
                    storageClasses: [],
                },
            }, context, snapshot, {})
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sCleanupActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0, {});

        await actionHandler.validate({
            namespace: 'CustomObject',
        }, context, snapshot, {});
    }
}
