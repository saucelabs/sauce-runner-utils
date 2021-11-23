import util from 'util';
import npm from 'npm';

export default class NPM {
  public static async install (...args: string[]) {
    const npmInstall = util.promisify(npm.commands.install);
    await npmInstall(args);
  }

  public static load (cfg: any) {
    npm.load(cfg);
  }

  public static async rebuild (...args: string[]) {
    const npmRebuild = util.promisify(npm.commands.rebuild);
    await npmRebuild(args);
  }
}

