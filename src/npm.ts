import util from 'util';
import npm from 'npm';

export default class NPM {
  public static async install (...args: string[]) {
    const npmInstall = util.promisify(npm.commands.install);
    await npmInstall(args);
  }

  public static async load (cfg: {[key: string]: object | string | number | boolean | null }) {
    await new Promise((resolve) => {
      npm.load(cfg, () => {
        resolve(null);
      });
    });
  }

  public static async rebuild (...args: string[]) {
    const npmRebuild = util.promisify(npm.commands.rebuild);
    await npmRebuild(args);
  }
}

