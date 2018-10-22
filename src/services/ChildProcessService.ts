import {exec} from 'child_process';
import {Service} from 'typedi';

@Service()
export class ChildProcessService {
    /**
     * Exec shell command
     * @param {string} command
     * @returns {Promise<{stdout: string, stderr: string, code: number}>}
     */
    exec(command: string): Promise<{stdout: string, stderr: string, code: number}> {
        return new Promise<{stdout: string, stderr: string, code: number}>((resolve) => {
            exec(command, (err, stdout, stderr) => {
                stdout = stdout && stdout.trim();
                stderr = stderr && stderr.trim();
                let code = 0;

                if (err) {
                    const _err: any = err;

                    if (_err.code) {
                        code = _err.code;
                    }
                }

                resolve({stdout, stderr, code});
            });
        });
    }
}
