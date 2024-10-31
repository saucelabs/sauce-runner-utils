import spawk from 'spawk';

jest.mock('fs/promises');
import fs from 'fs/promises';

const fsMocked = fs as jest.Mocked<typeof fs>;

import NPM from '../../../src/npm';
import { NodeContext } from '../../../src/types';

describe('NPM', function () {
  const nodeCtx: NodeContext = {
    nodePath: 'node-bin',
    npmPath: 'npm-bin',
    useGlobals: false,
  };

  beforeEach(function () {
    spawk.load();
    spawk.preventUnmatched();
    jest.resetAllMocks();
  });

  afterEach(function () {
    spawk.unload();
  });

  it('.configure must invoke npm config set', async function () {
    const interceptor = spawk
      .spawn(nodeCtx.nodePath)
      .stdout('npm runned')
      .exit(0);
    await NPM.configure(nodeCtx, {
      registry: 'myregistry',
      '@saucelabs:registry': 'https://google.com/',
    });

    expect(interceptor.calledWith.command).toEqual(nodeCtx.nodePath);
    expect(interceptor.calledWith.args).toEqual([
      nodeCtx.npmPath,
      'config',
      'set',
      'registry=myregistry',
      '@saucelabs:registry=https://google.com/',
    ]);
  });

  it('.rebuild must invoke npm rebuild', async function () {
    const interceptor = spawk
      .spawn(nodeCtx.nodePath)
      .stdout('npm runned')
      .exit(0);
    await NPM.rebuild(nodeCtx);
    expect(interceptor.calledWith.command).toEqual(nodeCtx.nodePath);
    expect(interceptor.calledWith.args).toEqual([nodeCtx.npmPath, 'rebuild']);
  });

  it('.install must invoke npm install', async function () {
    const interceptor = spawk
      .spawn(nodeCtx.nodePath)
      .stdout('npm runned')
      .exit(0);
    fsMocked.lstat.mockRejectedValue('non-existing');
    await NPM.install(nodeCtx, ['cypress@12.6.0']);
    expect(interceptor.calledWith.command).toEqual(nodeCtx.nodePath);
    expect(interceptor.calledWith.args).toEqual([
      nodeCtx.npmPath,
      'install',
      'cypress@12.6.0',
    ]);
  });
});
