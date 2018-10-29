import {suite, test} from 'mocha-typescript';

import {K8sApplyTLSSecretActionHandler} from '../../../src/handlers/kubectl';
import {ContextUtil} from 'fbl/dist/src/utils';
import {ActionSnapshot} from 'fbl/dist/src/models';
import * as assert from 'assert';
import {TempPathsRegistry} from 'fbl/dist/src/services';
import {Container} from 'typedi';
import {K8sKubectlService} from '../../../src/services';
import {promisify} from 'util';
import {readFile} from 'fs';
import {join} from 'path';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

@suite()
class K8sApplyTLSSecretActionHandlerTestSuite {
    async after(): Promise<void> {
        await Container.get(TempPathsRegistry).cleanup();
        Container.reset();
    }

    @test()
    async failValidation() {
        const actionHandler = new K8sApplyTLSSecretActionHandler();
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

        await chai.expect(
            actionHandler.validate({
                name: 'test',
                files: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                name: 'test',
                inline: []
            }, context, snapshot)
        ).to.be.rejected;

        await chai.expect(
            actionHandler.validate({
                name: 'test',
                inline: {
                    cert: 'inline:cert',
                    key: 'inline:key'
                },
                files: {
                    cert: 'cert.crt',
                    key: 'key.key'
                }
            }, context, snapshot)
        ).to.be.rejected;
    }

    @test()
    async passValidation() {
        const actionHandler = new K8sApplyTLSSecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        await actionHandler.validate({
            name: 'test',
            inline: {
                cert: 'inline:cert',
                key: 'inline:key'
            }
        }, context, snapshot);

        actionHandler.validate({
            name: 'test',
            files: {
                cert: 'cert.crt',
                key: 'key.key'
            }
        }, context, snapshot);
    }

    @test()
    async registerTLSSecretWithInlineParams(): Promise<void> {
        const actionHandler = new K8sApplyTLSSecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const assetsDir = join(__dirname, '../../../../test/assets');
        const cert = await promisify(readFile)(join(assetsDir, 'cert.crt'), 'utf8');
        const key = await promisify(readFile)(join(assetsDir, 'cert.key'), 'utf8');

        const options = {
            name: 'secret-tls-test-inline',
            inline: {
                cert: cert,
                key: key
            }
        };

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        const result = await Container.get(K8sKubectlService).execKubectlCommand(['get', 'secret', options.name, '-o', 'json']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            'tls.crt': new Buffer(cert).toString('base64'),
            'tls.key': new Buffer(key).toString('base64')
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }

    @test()
    async registerTLSSecretWithFilesParams(): Promise<void> {
        const actionHandler = new K8sApplyTLSSecretActionHandler();
        const context = ContextUtil.generateEmptyContext();
        const snapshot = new ActionSnapshot('.', {}, '', 0);

        const assetsDir = join(__dirname, '../../../../test/assets');
        const cert = join(assetsDir, 'cert.crt');
        const key = join(assetsDir, 'cert.key');

        const options = {
            name: 'secret-tls-test-files',
            namespace: 'default',
            files: {
                cert: cert,
                key: key
            }
        };

        await actionHandler.validate(options, context, snapshot);
        await actionHandler.execute(options, context, snapshot);

        const result = await Container.get(K8sKubectlService).execKubectlCommand(['get', 'secret', options.name, '-o', 'json']);

        if (result.code !== 0) {
            throw new Error(`code: ${result.code};\nstdout: ${result.stdout};\nstderr: ${result.stderr}`);
        }

        const crtContent = await promisify(readFile)(cert, 'utf8');
        const keyContent = await promisify(readFile)(key, 'utf8');

        const configMap = JSON.parse(result.stdout);
        assert.deepStrictEqual(configMap.data, {
            'tls.crt': new Buffer(crtContent).toString('base64'),
            'tls.key': new Buffer(keyContent).toString('base64')
        });

        assert.strictEqual(context.entities.registered.length, 1);
        assert.strictEqual(context.entities.created.length, 1);
    }
}
