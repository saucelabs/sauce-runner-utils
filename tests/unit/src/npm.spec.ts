import spawk from 'spawk';

import { Stats } from 'fs';

jest.mock('fs/promises');
import fs from 'fs/promises';
const fsMocked = fs as jest.Mocked<typeof fs>;

import NPM from '../../../src/npm';
import { NodeContext } from '../../../src/types';

describe('NPM', function () {
  const nodeCtx: NodeContext = { nodePath: 'node-bin', npmPath: 'npm-bin' };

  beforeEach(function () {
    spawk.load();
    spawk.preventUnmatched();
    jest.resetAllMocks();
  });

  afterEach(function () {
    spawk.unload();
  });

  it.only('.configure must invoke npm config set', async function () {
    const interceptor = spawk.spawn(nodeCtx.nodePath).stdout('npm runned').exit(0);
    await NPM.configure(nodeCtx, { registry: 'myregistry', '@saucelabs:registry': 'https://google.com/' });

    expect(interceptor.calledWith.command).toEqual(nodeCtx.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodeCtx.npmPath, 'config', 'set', 'registry=myregistry', '@saucelabs:registry=https://google.com/']);
  });

  it('.rebuild must invoke npm rebuild', async function () {
    const interceptor = spawk.spawn(nodeCtx.nodePath).stdout('npm runned').exit(0);
    await NPM.rebuild(nodeCtx);
    expect(interceptor.calledWith.command).toEqual(nodeCtx.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodeCtx.npmPath, 'rebuild']);
  });

  it('.install must invoke npm install', async function () {
    const interceptor = spawk.spawn(nodeCtx.nodePath).stdout('npm runned').exit(0);
    fsMocked.lstat.mockRejectedValue('non-existing');
    await NPM.install(nodeCtx, ['cypress@12.6.0']);
    expect(interceptor.calledWith.command).toEqual(nodeCtx.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodeCtx.npmPath, 'install', 'cypress@12.6.0']);
    expect(fsMocked.lstat).toBeCalledTimes(4);
  });

  it('.install moves package.json / package-lock.json', async function () {
    const interceptor = spawk.spawn(nodeCtx.nodePath).stdout('npm runned').exit(0);
    fsMocked.lstat.mockRejectedValue('non-existing');

    fsMocked.lstat.mockResolvedValue({} as Stats);
    fsMocked.rename.mockResolvedValue();
    fsMocked.writeFile.mockResolvedValue();

    await NPM.install(nodeCtx, ['cypress@12.6.0']);
    expect(interceptor.calledWith.command).toEqual(nodeCtx.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodeCtx.npmPath, 'install', 'cypress@12.6.0']);
    expect(fsMocked.rename.mock.calls).toEqual([
      ['package.json', `.package.json-${process.pid}`],
      ['package-lock.json', `.package-lock.json-${process.pid}`],
      [`.package.json-${process.pid}`, 'package.json'],
      [`.package-lock.json-${process.pid}`, 'package-lock.json'],
    ]);
    expect(fsMocked.lstat.mock.calls).toEqual([
      ['package.json'],
      ['package-lock.json'],
      [`.package.json-${process.pid}`],
      [`.package-lock.json-${process.pid}`],
    ]);
  });
});
