import spawk from 'spawk';

import { Stats } from 'fs';

jest.mock('fs/promises');
import fs from 'fs/promises';
const fsMocked = fs as jest.Mocked<typeof fs>;

import NPM from '../../../src/npm';
import { NodeContext } from '../../../src/types';

describe('NPM', function () {
  const nodePath: NodeContext = { nodePath: 'node-bin', npmPath: 'npm-bin' };

  beforeEach(function () {
    spawk.load();
    spawk.preventUnmatched();
    jest.resetAllMocks();
  });

  afterEach(function () {
    spawk.unload();
  });

  it('.configure must invoke npm config set', async function () {
    const interceptor = spawk.spawn(nodePath.nodePath).stdout('npm runned').exit(0);
    await NPM.configure(nodePath, { registry: 'myregistry' });

    expect(interceptor.calledWith.command).toEqual(nodePath.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodePath.npmPath, 'config', 'set', 'registry=myregistry']);
  });

  it('.rebuild must invoke npm rebuild', async function () {
    const interceptor = spawk.spawn(nodePath.nodePath).stdout('npm runned').exit(0);
    await NPM.rebuild(nodePath);
    expect(interceptor.calledWith.command).toEqual(nodePath.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodePath.npmPath, 'rebuild']);
  });

  it('.install must invoke npm install', async function () {
    const interceptor = spawk.spawn(nodePath.nodePath).stdout('npm runned').exit(0);
    fsMocked.lstat.mockRejectedValue('non-existing');
    let writeFile, writeContent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fsMocked.writeFile.mockImplementation(function (name: any, data: any): Promise<void> {
      writeFile = name;
      writeContent = data;
      return new Promise((resolve) => {
        resolve();
      });
    });
    await NPM.install(nodePath, {
      cypress: '12.6.0'
    });
    expect(interceptor.calledWith.command).toEqual(nodePath.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodePath.npmPath, 'install']);
    expect(fsMocked.lstat).toBeCalledTimes(4);
    expect(fsMocked.writeFile).toBeCalledTimes(1);
    expect(writeFile).toEqual('package.json');
    expect(writeContent).toEqual(JSON.stringify({dependencies: { cypress: '12.6.0' }}));
  });

  it('.install moves package.json / package-lock.json', async function () {
    const interceptor = spawk.spawn(nodePath.nodePath).stdout('npm runned').exit(0);
    fsMocked.lstat.mockRejectedValue('non-existing');

    fsMocked.lstat.mockResolvedValue({} as Stats);
    fsMocked.rename.mockResolvedValue();
    fsMocked.writeFile.mockResolvedValue();

    await NPM.install(nodePath, {
      cypress: '12.6.0'
    });
    expect(interceptor.calledWith.command).toEqual(nodePath.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodePath.npmPath, 'install']);
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
    expect(fsMocked.writeFile.mock.calls).toEqual([
      ['package.json', JSON.stringify({dependencies: { cypress: '12.6.0' }})],
    ]);
  });
});
