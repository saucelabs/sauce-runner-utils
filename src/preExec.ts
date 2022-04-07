import ChildProcess from 'child_process';
import os from 'os';

function spawnAsync (cmd: string, args: string[]) {
  return new Promise(function (resolve) {
    const proc = ChildProcess.spawn(cmd, args);
    proc.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });
    proc.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
    proc.on('exit', function (exitCode) {
      resolve(exitCode);
    });
    proc.on('error', function (err) {
      console.log(`Unable to start command: ${err}`);
      resolve(1);
    });
  });
}

async function preExecRunner (preExecs: string[]) {
  const cmdInvoker = (os.platform() === 'win32') ? 'cmd' : 'sh';
  const cmdArg = (os.platform() === 'win32') ? '/C' : '-c';

  for (const command of preExecs) {
    console.log(`Executing pre-exec command: ${command}`);
    const exitCode = await spawnAsync(cmdInvoker, [cmdArg, command]);
    console.log('\n');

    if (exitCode !== 0) {
      return false;
    }
  }
  return true;
}

export default async function preExec (suite: { preExec: string[] | undefined | null }, timeoutSec: number): Promise<boolean> {
  if (!suite.preExec) {
    return true;
  }

  let timeout;
  const timeoutPromise = new Promise((resolve) => {
    timeout = setTimeout(() => {
      console.error(`Pre-Exec timed out after ${timeoutSec} seconds`);
      resolve(false);
    }, timeoutSec * 1000);
  });
  const hasPassed: boolean = await Promise.race([timeoutPromise, preExecRunner(suite.preExec)]) as boolean;
  clearTimeout(timeout);
  return hasPassed;
}
