import util from 'util';
import npm from 'npm';

export class NPM {
  public static async install (...args: string[]) {
    const npmInstall = util.promisify(npm.commands.install);
    await npmInstall(args);
  }

  public static async load () {
    const npmLoad = util.promisify(npm.load);
    await npmLoad();
  }

  public static async rebuild (...args: string[]) {
    const npmRebuild = util.promisify(npm.commands.rebuild);
    await npmRebuild(args);
  }
}

