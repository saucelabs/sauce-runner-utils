// vim: tabstop=2 shiftwidth=2 expandtab
jest.mock('child_process');
jest.mock('fs');
jest.mock('../../../src/npm');

import path from 'path';
import fs from 'fs';
import {
  getAbsolutePath,
  shouldRecordVideo,
  getArgs,
  getEnv,
  getSuite,
  renameScreenshot,
  renameAsset,
  prepareNpmEnv,
  setUpNpmConfig,
  getNpmConfig,
  installNpmDependencies,
  escapeXML,
  getRegistryURIFragment,
} from '../../../src/utils';
import _ from 'lodash';
import npm from '../../../src/npm';
import {
  NodeContext,
  NpmConfigContainer,
  PathContainer,
  SuitesContainer,
  Suite,
} from '../../../src/types';

describe('utils', function () {
  const nodeCtx: NodeContext = {
    nodePath: 'node-bin',
    npmPath: 'npm-bin',
    useGlobals: false,
  };

  describe('.getNpmConfig', function () {
    const emptyConfig = {
      npm: {},
    };

    it('should return empty dict when runner config is empty', function () {
      const npmConfig = getNpmConfig({});

      expect(npmConfig).toStrictEqual({});
    });

    it('should set values when runner npm config is empty', function () {
      const npmConfig = getNpmConfig(emptyConfig);

      expect(npmConfig).toHaveProperty('strict-ssl');
      expect(npmConfig).toHaveProperty('registry');
    });

    it('should set strictSSL to undefined if not set', function () {
      const npmConfig = getNpmConfig(emptyConfig);
      expect(npmConfig).toHaveProperty('strict-ssl', undefined);
    });

    it('should set strictSSL from runner config', function () {
      const runnerConfig: NpmConfigContainer = {
        npm: {
          strictSSL: false,
        },
      };
      let npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('strict-ssl', false);

      runnerConfig.npm ||= {};
      runnerConfig.npm.strictSSL = true;
      npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('strict-ssl', true);
    });

    it('should set the default npm registry by default', function () {
      const npmConfig = getNpmConfig(emptyConfig);

      expect(npmConfig).toHaveProperty('registry');
      expect(npmConfig.registry).not.toBe('');
    });

    it('should set registry from runner config', function () {
      const runnerConfig = {
        npm: {
          registry: 'http://my-private-registry.com',
        },
      };
      const npmConfig = getNpmConfig(runnerConfig);

      expect(npmConfig).toHaveProperty(
        'registry',
        'http://my-private-registry.com',
      );
    });

    describe.each([
      { value: undefined, expected: true },
      { value: null, expected: true },
      { value: '', expected: true },
      { value: 'true', expected: true },
      { value: true, expected: true },
      { value: 'false', expected: false },
      { value: false, expected: false },
    ])('legacy-peer-deps', function ({ value, expected }) {
      test(`set to ${expected} when given ${value}`, function () {
        const config = getNpmConfig({
          npm: {
            legacyPeerDeps: value,
          },
        });

        expect(config['legacy-peer-deps']).toBe(expected);
      });
    });
  });

  describe('.prepareNpmEnv', function () {
    let backupEnv: { [key: string]: string | undefined };
    const runCfg: NpmConfigContainer & PathContainer = {
      path: '/fake/runner/path',
      npm: {
        packages: {
          'left-pad': '1.3.0',
          jquery: 2,
        },
      },
    };
    beforeEach(function () {
      backupEnv = { ...process.env };
    });
    afterEach(function () {
      process.env = backupEnv;
    });
    it('should set right registry for npm', async function () {
      const config = {
        registry: 'my.registry',
        'strict-ssl': true,
      };
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await setUpNpmConfig(nodeCtx, config);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should call npm install', async function () {
      const installSpyOn = jest.spyOn(npm, 'install');
      await installNpmDependencies(nodeCtx, { mypackage: '1.2.3' });
      expect(
        installSpyOn.mock.calls[installSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should use env var for registry', async function () {
      process.env.SAUCE_NPM_CACHE = 'npmland.io';
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await prepareNpmEnv(runCfg, nodeCtx);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should use user registry', async function () {
      const cfg = _.cloneDeep(runCfg);
      cfg.npm ||= {};
      cfg.npm.registries = [{ url: 'registryland.io' }];
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await prepareNpmEnv(cfg, nodeCtx);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should use default registry', async function () {
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await prepareNpmEnv(runCfg, nodeCtx);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should use true as the default value for strictSSL', async function () {
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await prepareNpmEnv(runCfg, nodeCtx);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it("should use true as the default value for strictSSL if it's null in cfg", async function () {
      const cfg = _.cloneDeep(runCfg);
      cfg.npm ||= {};
      cfg.npm.strictSSL = null;
      cfg.npm.registries = [{ url: 'test.strictSSL.null' }];
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await prepareNpmEnv(runCfg, nodeCtx);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should be able to set strictSSL to false', async function () {
      const cfg = _.cloneDeep(runCfg);
      cfg.npm ||= {};
      cfg.npm.strictSSL = false;
      cfg.npm.registries = [{ url: 'test.strictSSL.false' }];
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await prepareNpmEnv(cfg, nodeCtx);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should be able to set strictSSL to true', async function () {
      const cfg = _.cloneDeep(runCfg);
      cfg.npm ||= {};
      cfg.npm.strictSSL = true;
      cfg.npm.registries = [{ url: 'test.strictSSL.true' }];
      const loadSpyOn = jest.spyOn(npm, 'configure');
      await prepareNpmEnv(cfg, nodeCtx);
      expect(
        loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should configure scoped-registry', async function () {
      const cfg = _.cloneDeep(runCfg);
      cfg.npm ||= {};
      cfg.npm.registries = [
        {
          url: 'http://demo.registry.com/npm-test/',
          scope: '@saucelabs',
        },
      ];
      const loadSpyOn = jest.spyOn(npm, 'configure');
      loadSpyOn.mockClear();
      await prepareNpmEnv(cfg, nodeCtx);

      expect(loadSpyOn).toHaveBeenCalledTimes(1);
      const call = loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1];
      expect(call[1]['@saucelabs:registry']).toBe(
        'http://demo.registry.com/npm-test/',
      );
      expect(call[1].registry).toBe('https://registry.npmjs.org');
    });
    it('should configure scoped-registry with authentication', async function () {
      const cfg = _.cloneDeep(runCfg);
      cfg.npm ||= {};
      cfg.npm.registries = [
        {
          url: 'http://demo.registry.com/npm-test/',
          scope: '@saucelabs',
          authToken: 'secretToken',
        },
      ];
      const loadSpyOn = jest.spyOn(npm, 'configure');
      loadSpyOn.mockClear();
      await prepareNpmEnv(cfg, nodeCtx);
      expect(loadSpyOn).toHaveBeenCalledTimes(1);
      const call = loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1];
      expect(call[1]['//demo.registry.com/npm-test/:_authToken']).toBe(
        'secretToken',
      );
      expect(call[1]['@saucelabs:registry']).toBe(
        'http://demo.registry.com/npm-test/',
      );
      expect(call[1].registry).toBe('https://registry.npmjs.org');
    });
    it('registries should be prioritary on registry', async function () {
      const cfg = _.cloneDeep(runCfg);
      cfg.npm ||= {};
      cfg.npm.registry = 'http://demo.bad-registry.com';
      cfg.npm.registries = [
        {
          url: 'http://demo.registry.com',
        },
        {
          url: 'http://demo.registry.com/npm-test/',
          scope: '@saucelabs',
          authToken: 'secretToken',
        },
      ];
      const loadSpyOn = jest.spyOn(npm, 'configure');
      loadSpyOn.mockClear();
      await prepareNpmEnv(cfg, nodeCtx);
      expect(loadSpyOn).toHaveBeenCalledTimes(1);
      const call = loadSpyOn.mock.calls[loadSpyOn.mock.calls.length - 1];
      expect(call[1]['//demo.registry.com/npm-test/:_authToken']).toBe(
        'secretToken',
      );
      expect(call[1]['@saucelabs:registry']).toBe(
        'http://demo.registry.com/npm-test/',
      );
      expect(call[1].registry).toBe('http://demo.registry.com');
    });
    it('should use rebuild node_modules', async function () {
      const rebuildSpyOn = jest.spyOn(npm, 'rebuild');
      const statSyncSpyOn = jest.spyOn(fs, 'statSync');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      statSyncSpyOn.mockReturnValue({ isDirectory: () => true });
      await prepareNpmEnv(runCfg, nodeCtx);
      expect(
        rebuildSpyOn.mock.calls[rebuildSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
    it('should use rebuild node_modules when not package installed', async function () {
      const cfg = _.cloneDeep(runCfg);
      delete cfg.npm;
      const rebuildSpyOn = jest.spyOn(npm, 'rebuild');
      const statSyncSpyOn = jest.spyOn(fs, 'statSync');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      statSyncSpyOn.mockReturnValue({ isDirectory: () => true });
      await prepareNpmEnv(cfg, nodeCtx);
      expect(
        rebuildSpyOn.mock.calls[rebuildSpyOn.mock.calls.length - 1],
      ).toMatchSnapshot();
    });
  });

  describe('.getRegistryURIFragment', function () {
    it('should get the uri fragment from http registry url', function () {
      const url = 'http://my_registry/';
      expect(getRegistryURIFragment(url)).toEqual('//my_registry/:');
    });
    it('should get the uri fragment from https registry url', function () {
      const url = 'https://my_registry/';
      expect(getRegistryURIFragment(url)).toEqual('//my_registry/:');
    });
  });

  describe('.renameScreenshot', function () {
    it('replace path separator (backslash for Windows, forward slash for mac/linux) with __', function () {
      const spy = jest.spyOn(fs, 'renameSync').mockImplementation(function () {
        return undefined;
      });
      const nestedExample = path.join('nested', 'example.test.js');
      expect(
        renameScreenshot(
          nestedExample,
          'old_path',
          'new_path',
          'screenshot.png',
        ),
      ).toEqual(
        path.join('new_path', 'nested__example.test.js__screenshot.png'),
      );
      expect(spy).toHaveBeenCalled();
    });
  });
  describe('.renameAsset', function () {
    it('root folder no need to rename asset with path separator', function () {
      const nestedExampleTest = path.join('assets', 'example.test.js.xml');
      expect(
        renameAsset({
          specFile: 'example.test.js.xml',
          oldFilePath: nestedExampleTest,
          resultsFolder: '/new_path',
        }),
      ).toEqual('assets/example.test.js.xml');
    });
    it('asset is in nested folder and replacing path separator with __', function () {
      const nestedExampleTest = path.join('nested', 'example.test.js.xml');
      const spy = jest.spyOn(fs, 'renameSync').mockImplementation(function () {
        return undefined;
      });
      expect(
        renameAsset({
          specFile: nestedExampleTest,
          oldFilePath: '/assets/example.test.js.xml',
          resultsFolder: '/new_path',
        }),
      ).toEqual(path.join(path.sep, 'new_path', 'nested__example.test.js.xml'));
      expect(spy).toHaveBeenCalled();
    });
  });
  describe('.getAbsolutePath', function () {
    it('returns absolute path unmodified', function () {
      jest.mock('fs');
      expect(getAbsolutePath('/absolute/path/to/asset/')).toEqual(
        '/absolute/path/to/asset/',
      );
    });
    it('translates relative path to absolute', function () {
      expect(getAbsolutePath('path/to/asset/')).toMatch(/\/path\/to\/asset\/$/);
    });
  });
  describe('.shouldRecordVideo', function () {
    let previousEnv: string | undefined;
    beforeEach(function () {
      previousEnv = process.env.SAUCE_CYPRESS_VIDEO_RECORDING;
    });
    afterEach(function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = previousEnv;
    });
    it('returns true when SAUCE_CYPRESS_VIDEO_RECORDING is undefined', function () {
      expect(shouldRecordVideo()).toEqual(true);
    });
    it('returns false when SAUCE_CYPRESS_VIDEO_RECORDING is 0', function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = '0';
      expect(shouldRecordVideo()).toEqual(false);
    });
    it('returns true when SAUCE_CYPRESS_VIDEO_RECORDING is 1', function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = '1';
      expect(shouldRecordVideo()).toEqual(true);
    });
    it('returns true when SAUCE_CYPRESS_VIDEO_RECORDING is true', function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = 'true';
      expect(shouldRecordVideo()).toEqual(true);
    });
    it('returns false when SAUCE_CYPRESS_VIDEO_RECORDING is false', function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = 'false';
      expect(shouldRecordVideo()).toEqual(false);
    });
  });
  describe('.getArgs', function () {
    let backupArgv: string[];
    beforeEach(function () {
      backupArgv = process.argv;
      process.argv = [
        '/path/to/node',
        '/path/to/sauce-cypress-runner',
        '--suiteName',
        'kitchen-sink-1',
        '--runCfgPath',
        './tests/kitchen-sink-tests/sauce-runner.json',
      ];
    });
    afterEach(function () {
      process.argv = backupArgv;
    });
    it('should parse the args', function () {
      const commandLineArgs = getArgs();
      expect(commandLineArgs).toMatchSnapshot();
      expect(getArgs()).toBe(commandLineArgs);
    });
  });
  describe('.getSuite', function () {
    it('should get a suite from a list', function () {
      const runCfg: SuitesContainer = {
        suites: [{ name: 'hello' }],
      };
      expect(getSuite(runCfg, 'hello')?.name).toEqual('hello');
      expect(getSuite(runCfg, 'non-existent')).toBeUndefined();
    });
  });
  describe('.getEnv', function () {
    let backupEnv: { [key: string]: string | undefined };
    beforeEach(function () {
      backupEnv = process.env;
      process.env = {
        HELLO: 'WORLD',
        FOO: 'BAR',
      };
    });
    afterEach(function () {
      process.env = backupEnv;
    });
    it('should parse env variables from runConfig', function () {
      const suite: Suite = {
        name: 'Demo suite',
        env: {
          A: '1',
          B: '2',
          HELLO: '$HELLO',
        },
        config: {
          env: {
            C: '3',
          },
        },
      };
      const env = getEnv(suite);
      expect(env).toMatchSnapshot();
      expect(env.FOO).toBeUndefined();
    });
  });
  describe('.escapeXML', function () {
    it('should escape special characters for XML', function () {
      const str = `<>&\\"`;
      const result = escapeXML(str);
      expect(result).toBe('&lt;&gt;&amp;\\&quot;');
    });
  });
});
