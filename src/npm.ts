import { spawn } from 'child_process';
import { lstat, rename, rm, writeFile } from 'fs/promises';

const temporarilyMovedFiles: {[key: string]: string} = {
  'package.json': `.package.json-${process.pid}`,
  'package-lock.json': `.package-lock.json-${process.pid}`,
};

export default class NPM {
  static async removePackageJson () {
    for (const [name, replacement] of Object.entries(temporarilyMovedFiles)) {
      try {
        // Note: we don't need the return value.
        // lstat is only used to check that the file exists.
        await lstat(name);
        await rename(name, replacement);
      } catch (e) {
        console.debug(`no ${name} to archive`);
      }
    }
  }

  static async restorePackageJson () {
    for (const [name, replacement] of Object.entries(temporarilyMovedFiles)) {
      try {
        // Note: we don't need the return value.
        // lstat is only used to check that the file exists.
        await lstat(replacement);
        await rename(replacement, name);
      } catch (e) {
        console.debug(`no ${name} was archived`);
      }
    }
  }

  public static async install (pkg: {[key: string]: string}) {
    await this.removePackageJson();
    await writeFile('package.json', JSON.stringify({
      dependencies: pkg,
    }));

    const p = spawn('npm', ['install']);
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);

    const exitPromise = new Promise((resolve) => {
      p.on('exit', (exitCode) => {
        resolve(exitCode);
      });
    });

    const exitCode = await exitPromise;

    await rm('package.json', { force: true });
    await this.restorePackageJson();

    return exitCode;
  }

  public static configure (cfg: {[key: string]: object | string | number | boolean | null }): Promise<number | null> {
    return new Promise((resolve) => {
      const args = Object.keys(cfg).map((k,) => `${k}=${cfg[k]}`);
      // FIXME: fix path to NPM
      const p = spawn('npm', ['config', 'set', ...args]);
      p.stdout.pipe(process.stdout);
      p.stderr.pipe(process.stderr);
      p.on('exit', () => {
        console.log('Finished');
        resolve(0);
      });
    });
  }

  public static rebuild (...args: string[]): Promise<number | null> {
    return new Promise((resolve) => {
      // FIXME: fix path to NPM
      const p = spawn('npm', ['rebuild', ...args]);
      p.stdout.pipe(process.stdout);
      p.stderr.pipe(process.stderr);
      p.on('exit', (exitCode) => {
        resolve(exitCode);
      });
    });
  }
}

