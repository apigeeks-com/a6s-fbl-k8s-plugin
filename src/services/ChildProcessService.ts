import {exec, spawn} from 'child_process';
import {Service} from 'typedi';

@Service()
export class ChildProcessService {
    /**
     * Exec shell command
     * @param {string} cmd
     * @param {string[]} args
     * @param {string} cwd
     * @returns {Promise<{stdout: string, stderr: string, code: number}>}
     */
    exec(cmd: string, args: string[], cwd = '.'): Promise<{stdout: string, stderr: string, code: number}> {
        return new Promise<{code: number, stdout: string, stderr: string}>(async (resolve) => {
            const process = spawn(cmd, args, {
                cwd: cwd
            });

            const stdout: string[] = [];
            process.stdout.on('data', (data) => {
                stdout.push(data.toString().trim());
            });

            const stderr: string[] = [];
            process.stderr.on('data', (data) => {
                stderr.push(data.toString().trim());
            });

            process.on('close', (code) => {
                resolve({
                    stdout: stdout.join('\n'),
                    stderr: stderr.join('\n'),
                    code: code
                });
            });
        });
    }
}
