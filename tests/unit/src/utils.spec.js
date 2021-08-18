// vim: tabstop=2 shiftwidth=2 expandtab
jest.mock('child_process');
jest.mock('../../../src/npm');

const path = require('path');
const fs = require('fs');
const { getAbsolutePath,
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
        escapeXML } = require('../../../src/utils');
const _ = require('lodash');
const npm = require('../../../src/npm');

describe('utils', function () {
  describe('.getNpmConfig', function () {
    const emptyConfig = {
      npm: {}
    };

    it('should return empty dict when runner config is empty', function () {
      const npmConfig = getNpmConfig({});

      expect(npmConfig).toStrictEqual({});
    });

    it('should set values when runner npm config is empty', function () {
      const npmConfig = getNpmConfig(emptyConfig);

      expect(npmConfig).toHaveProperty('strict-ssl');
      expect(npmConfig).toHaveProperty('registry');
      expect(npmConfig).toHaveProperty('package-lock');
    });

    it('should set strictSSL to true by default', function () {
      const npmConfig = getNpmConfig(emptyConfig);
      expect(npmConfig).toHaveProperty('strict-ssl', true);
    });

    it('should set strictSSL from runner config', function () {
      const runnerConfig = {
        npm: {
          strictSSL: false
        }
      };
      let npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('strict-ssl', false);

      runnerConfig.npm.strictSSL = true;
      npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('strict-ssl', true);

      runnerConfig.npm.strictSSL = 'truthy?';
      npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('strict-ssl', true);
    });

    it('should set packageLock to false by default', function () {
      const npmConfig = getNpmConfig(emptyConfig);

      expect(npmConfig).toHaveProperty('package-lock', false);
    });

    it('should set packageLock from runner config', function () {
      const runnerConfig = {
        npm: {
          'packageLock': true
        }
      };
      let npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('package-lock', true);

      runnerConfig.npm.packageLock = false;
      npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('package-lock', false);

      runnerConfig.npm.packageLock = 'truthy?';
      npmConfig = getNpmConfig(runnerConfig);
      expect(npmConfig).toHaveProperty('package-lock', false);
    });

    it('should set the default npm registry by default', function () {
      const npmConfig = getNpmConfig(emptyConfig);

      expect(npmConfig).toHaveProperty('registry');
      expect(npmConfig.registry).not.toBe('');
    });

    it('should set registry from runner config', function () {
      const runnerConfig = {
        npm: {
          registry: 'http://my-private-registry.com'
        }
      };
      const npmConfig = getNpmConfig(runnerConfig);

      expect(npmConfig).toHaveProperty('registry', 'http://my-private-registry.com');
    });
  });

  describe('.prepareNpmEnv', function () {
    let backupEnv;
    const runCfg = {
      path: '/fake/runner/path',
      npm: {
        packages: {
          'left-pad': '1.3.0',
          jquery: 2,
        }
      }
    };
    beforeEach(function () {
      backupEnv = {...process.env};
    });
    afterEach(function () {
      process.env = backupEnv;
    });
    it('should set right registry for npm', async function () {
      const config = {
        registry: 'my.registry',
        'strict-ssl': true,
        'package-lock': false
      };
      await setUpNpmConfig(config);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should call npm install', async function () {
      await installNpmDependencies(['mypackage@1.2.3']);
      expect(npm.install.mock.calls[npm.install.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should use env var for registry', async function () {
      process.env.SAUCE_NPM_CACHE = 'npmland.io';
      await prepareNpmEnv(runCfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should use user registry', async function () {
      let cfg = _.cloneDeep(runCfg);
      cfg.npm.registry = 'registryland.io';
      await prepareNpmEnv(cfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should use default registry', async function () {
      await prepareNpmEnv(runCfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should use true as the default value for strictSSL', async function () {
      await prepareNpmEnv(runCfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should use true as the default value for strictSSL if it\'s null in cfg', async function () {
      let cfg = _.cloneDeep(runCfg);
      cfg.npm.strictSSL = null;
      cfg.npm.registry = 'test.strictSSL.null';
      await prepareNpmEnv(runCfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should be able to set strictSSL to false', async function () {
      let cfg = _.cloneDeep(runCfg);
      cfg.npm.strictSSL = false;
      cfg.npm.registry = 'test.strictSSL.false';
      await prepareNpmEnv(cfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should be able to set strictSSL to true', async function () {
      let cfg = _.cloneDeep(runCfg);
      cfg.npm.strictSSL = true;
      cfg.npm.registry = 'test.strictSSL.true';
      await prepareNpmEnv(cfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
    it('should be able to set cafile', async function () {
      let cfg = _.cloneDeep(runCfg);
      cfg.npm.registry = 'test.cafile';
      process.env.CA_FILE = '/fake/path';
      await prepareNpmEnv(cfg);
      expect(npm.load.mock.calls[npm.load.mock.calls.length - 1]).toMatchSnapshot();
    });
  });
  describe('.renameScreenshot', function () {
    it('replace path separator (backslash for Windows, forward slash for mac/linux) with __', function () {
      const spy = jest.spyOn(fs, 'renameSync').mockImplementation(function () {});
      const nestedExample = path.join('nested', 'example.test.js');
      expect(renameScreenshot(nestedExample, 'old_path', 'new_path', 'screenshot.png')).toEqual(path.join('new_path', 'nested__example.test.js__screenshot.png'));
      expect(spy).toHaveBeenCalled();
    });
  });
  describe('.renameAsset', function () {
    it('root folder no need to rename asset with path separator', function () {
      const nestedExampleTest = path.join('assets', 'example.test.js.xml');
      expect(renameAsset({
        specFile: 'example.test.js.xml',
        oldFilePath: nestedExampleTest,
        resultsFolder: '/new_path'
      })).toEqual('assets/example.test.js.xml');
    });
    it('asset is in nested folder and replacing path separator with __', function () {
      const nestedExampleTest = path.join('nested', 'example.test.js.xml');
      const spy = jest.spyOn(fs, 'renameSync').mockImplementation(function () {});
      expect(renameAsset({
        specFile: nestedExampleTest,
        oldFilePath: '/assets/example.test.js.xml',
        resultsFolder: '/new_path'
      })).toEqual(path.join(path.sep, 'new_path', 'nested__example.test.js.xml'));
      expect(spy).toHaveBeenCalled();
    });
  });
  describe('.getAbsolutePath', function () {
    it('returns absolute path unmodified', function () {
      jest.mock('fs');
      expect(getAbsolutePath('/absolute/path/to/asset/')).toEqual('/absolute/path/to/asset/');
    });
    it('translates relative path to absolute', function () {
      expect(getAbsolutePath('path/to/asset/')).toMatch(/\/path\/to\/asset\/$/);
    });
  });
  describe('.shouldRecordVideo', function () {
    let previousEnv;
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
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = 0;
      expect(shouldRecordVideo()).toEqual(false);
    });
    it('returns true when SAUCE_CYPRESS_VIDEO_RECORDING is 1', function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = 1;
      expect(shouldRecordVideo()).toEqual(true);
    });
    it('returns true when SAUCE_CYPRESS_VIDEO_RECORDING is true', function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = true;
      expect(shouldRecordVideo()).toEqual(true);
    });
    it('returns false when SAUCE_CYPRESS_VIDEO_RECORDING is false', function () {
      process.env.SAUCE_CYPRESS_VIDEO_RECORDING = false;
      expect(shouldRecordVideo()).toEqual(false);
    });
  });
  describe('.getArgs', function () {
    let backupArgv;
    beforeEach(function () {
      backupArgv = process.argv;
      process.argv = [
        '/path/to/node',
        '/path/to/sauce-cypress-runner',
        '--suiteName', 'kitchen-sink-1',
        '--runCfgPath', './tests/kitchen-sink-tests/sauce-runner.json'
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
      const runCfg = {
        suites: [
          {name: 'hello', arg: 'world'}
        ]
      };
      expect(getSuite(runCfg, 'hello').arg).toEqual('world');
      expect(getSuite(runCfg, 'non-existent')).toBeUndefined();
    });
  });
  describe('.getEnv', function () {
    let backupEnv;
    beforeEach(function () {
      backupEnv = process.env;
      process.env = {
        'HELLO': 'WORLD',
        'FOO': 'BAR',
      };
    });
    afterEach(function () {
      process.env = backupEnv;
    });
    it('should parse env variables from runConfig', function () {
      const suite = {
        env: {
          'A': '1',
          'B': '2',
          'HELLO': '$HELLO',
        },
        config: {
          env: {
            'C': '3',
          }
        }
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
