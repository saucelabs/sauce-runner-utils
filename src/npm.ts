import { spawn } from 'child_process';
import { lstat, rename } from 'fs/promises';
import { NodeContext } from './types';

const temporarilyMovedFiles: { [key: string]: string } = {
  'package.json': `.package.json-${process.pid}`,
  'package-lock.json': `.package-lock.json-${process.pid}`,
};

export default class NPM {
  static async renamePackageJson() {
    for (const [name, replacement] of Object.entries(temporarilyMovedFiles)) {
      try {
        // Note: we don't need the return value.
        // lstat is only used to check that the file exists.
        await lstat(name);
        await rename(name, replacement);
      } catch {
        console.debug(`no ${name} to archive`);
      }
    }
  }

  static async restorePackageJson() {
    for (const [name, replacement] of Object.entries(temporarilyMovedFiles)) {
      try {
        // Note: we don't need the return value.
        // lstat is only used to check that the file exists.
        await lstat(replacement);
        await rename(replacement, name);
      } catch {
        console.debug(`no ${name} was archived`);
      }
    }
  }

  public static async install(nodeCtx: NodeContext, pkgs: string[]) {
    await this.renamePackageJson();

    let p;

    if (nodeCtx.useGlobals) {
      p = spawn('npm', ['install', ...pkgs], { shell: true });
    } else {
      p = spawn(nodeCtx.nodePath, [nodeCtx.npmPath, 'install', ...pkgs]);
    }
    p.stdout.pipe(process.stdout);
    p.stderr.pipe(process.stderr);

    const exitPromise = new Promise((resolve) => {
      p.on('exit', (exitCode) => {
        resolve(exitCode);
      });
    });

    const exitCode = await exitPromise;

    await this.restorePackageJson();

    return exitCode;
  }

  public static configure(
    nodeCtx: NodeContext,
    cfg: { [key: string]: object | string | number | boolean | null },
  ): Promise<number | null> {
    return new Promise((resolve) => {
      const args = Object.keys(cfg)
        .filter((k) => cfg[k] !== null && cfg[k] !== undefined)
        .map((k) => `${k}=${cfg[k]}`);

      let p;

      if (nodeCtx.useGlobals) {
        p = spawn('npm', ['config', 'set', ...args], { shell: true });
      } else {
        p = spawn(nodeCtx.nodePath, [
          nodeCtx.npmPath,
          'config',
          'set',
          ...args,
        ]);
      }
      p.stdout.pipe(process.stdout);
      p.stderr.pipe(process.stderr);
      p.on('exit', () => {
        console.log('Finished');
        resolve(0);
      });
    });
  }

  public static rebuild(
    nodeCtx: NodeContext,
    ...args: string[]
  ): Promise<number | null> {
    return new Promise((resolve) => {
      let p;
      if (nodeCtx.useGlobals) {
        p = spawn('npm', ['rebuild', ...args], { shell: true });
      } else {
        p = spawn(nodeCtx.nodePath, [nodeCtx.npmPath, 'rebuild', ...args]);
      }
      p.stdout.pipe(process.stdout);
      p.stderr.pipe(process.stderr);
      p.on('exit', (exitCode) => {
        resolve(exitCode);
      });
    });
  }
}
