import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import yargs from 'yargs/yargs';
import npm from './npm';
import {
  NpmConfigContainer,
  PathContainer,
  SuitesContainer,
  Suite,
  NpmConfig,
  NodeContext,
} from './types';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

export function getAbsolutePath(pathToDir: string) {
  if (path.isAbsolute(pathToDir)) {
    return pathToDir;
  }
  return path.join(process.cwd(), pathToDir);
}

export function shouldRecordVideo() {
  const isVideoRecording = process.env.SAUCE_CYPRESS_VIDEO_RECORDING;
  if (isVideoRecording === undefined) {
    return true;
  }
  const videoOption = String(isVideoRecording).toLowerCase();
  return videoOption === 'true' || videoOption === '1';
}

let runConfig: NpmConfigContainer | PathContainer | SuitesContainer;

export function loadRunConfig(cfgPath: string) {
  if (runConfig) {
    return runConfig;
  }
  if (fs.existsSync(cfgPath)) {
    runConfig = require(cfgPath);
    return runConfig;
  }
  throw new Error(`Runner config (${cfgPath}) unavailable.`);
}

export function getDefaultRegistry() {
  return process.env.SAUCE_NPM_CACHE || DEFAULT_REGISTRY;
}

export async function setUpNpmConfig(
  nodeCtx: NodeContext,
  userConfig: NpmConfig,
) {
  console.log('Preparing npm environment');
  const defaultConfig = {
    json: false,
    save: false,
    audit: false,
    fund: false,
    noproxy: 'registry.npmjs.org',
    'package-lock': false,
    'strict-ssl': true,
    registry: getDefaultRegistry(),
    'update-notifier': false,
  };

  await npm.configure(nodeCtx, Object.assign({}, defaultConfig, userConfig));
}

export async function installNpmDependencies(
  nodeCtx: NodeContext,
  packageList: { [key: string]: string },
) {
  const packages = Object.entries(packageList).map(([k, v]) => `${k}@${v}`);
  console.log(`\nInstalling packages: ${packages.join(' ')}`);
  await npm.install(nodeCtx, packages);
}

export async function rebuildNpmDependencies(
  nodeCtx: NodeContext,
  path: string,
) {
  console.log(`\nRebuilding packages:`);
  if (path) {
    await npm.rebuild(nodeCtx, '--prefix', path);
  } else {
    await npm.rebuild(nodeCtx);
  }
}

// Check if node_modules already exists in provided project
export function hasNodeModulesFolder(runCfg: PathContainer) {
  const projectFolder = path.dirname(runCfg.path);

  // Docker: if sauce-runner.json is in home, node_module won't be users'
  //         but the one of the runner => Discard it.
  if (!process.env.SAUCE_VM && projectFolder === process.env.HOME) {
    return false;
  }

  // Assumption: sauce-runner.json is at the root level of project folder.
  // With this location, the presence of node_modules can be checked.
  const nodeModulePath = path.join(projectFolder, 'node_modules');
  try {
    const st = fs.statSync(nodeModulePath);
    if (st && st.isDirectory()) {
      return true;
    }
  } catch (e) {
    /* empty */
  }
  return false;
}

// Extracts and formats the URI fragment required for npm auth configuration.
// Expected URI fragment format: "//registry.npmjs.org/:" or "//my-custom-registry.org/unique/path:"
export function getRegistryURIFragment(url: string): string {
  let uriFragment = url;

  if (url.startsWith('http://')) {
    uriFragment = url.substring(5);
  } else if (url.startsWith('https://')) {
    uriFragment = url.substring(6);
  }
  return `${uriFragment}:`;
}

export function getNpmConfig(runnerConfig: NpmConfigContainer) {
  if (runnerConfig.npm === undefined) {
    return {};
  }
  const cfg: { [key: string]: string | boolean | null } = {
    registry: runnerConfig.npm.registry || getDefaultRegistry(),
    'strict-ssl': runnerConfig.npm.strictSSL,
    // Setting to false to avoid dealing with the generated file.
    'package-lock': runnerConfig.npm.packageLock === true,
    'legacy-peer-deps':
      runnerConfig.npm.legacyPeerDeps !== 'false' &&
      runnerConfig.npm.legacyPeerDeps !== false,
  };

  // As npm config accepts only key-value pairs, we do the translation.
  if (runnerConfig.npm.registries) {
    for (const r of runnerConfig.npm.registries) {
      if (r.scope) {
        cfg[`${r.scope}:registry`] = r.url;
      } else {
        cfg.registry = r.url;
      }

      // Configures npm auth fields by prefixing a scoped URI Fragment.
      // For more info, check the npm doc https://docs.npmjs.com/cli/v10/configuring-npm/npmrc#auth-related-configuration
      const uriFragment = getRegistryURIFragment(r.url);
      if (r.authToken) {
        cfg[`${uriFragment}_authToken`] = r.authToken;
      }
      if (r.auth) {
        cfg[`${uriFragment}_auth`] = r.auth;
      }
      if (r.username) {
        cfg[`${uriFragment}username`] = r.username;
      }
      if (r.password) {
        cfg[`${uriFragment}_password`] = r.password;
      }
      if (r.email) {
        cfg[`${uriFragment}email`] = r.email;
      }
    }
  }
  return cfg;
}

export async function prepareNpmEnv(
  runCfg: NpmConfigContainer & PathContainer,
  nodeCtx: NodeContext,
) {
  const data: {
    install: { duration: number };
    rebuild?: { duration: number };
    setup: { duration: number };
  } = { install: { duration: 0 }, setup: { duration: 0 } };
  const npmMetrics = { name: 'npm_metrics.json', data };
  const packageList = runCfg?.npm?.packages || {};

  const nodeModulesPresent = hasNodeModulesFolder(runCfg);

  const npmConfig = getNpmConfig(runCfg);
  let startTime = new Date().getTime();
  await setUpNpmConfig(nodeCtx, npmConfig);
  let endTime = new Date().getTime();
  npmMetrics.data.setup = { duration: endTime - startTime };

  // rebuild npm packages if node_modules provided
  if (nodeModulesPresent) {
    console.log(`Detected node_modules, running npm rebuilding.`);

    const projectPath = path.dirname(runCfg.path);
    startTime = new Date().getTime();
    await rebuildNpmDependencies(nodeCtx, projectPath);
    endTime = new Date().getTime();
    npmMetrics.data.rebuild = { duration: endTime - startTime };
  }

  if (Object.keys(packageList).length === 0) {
    return npmMetrics;
  }

  // Ensure version is a string value as NPM only accepts strings.
  const fixedPackageList = Object.fromEntries(
    Object.entries(packageList).map(([k, v]) => [k, String(v)]),
  );

  // install npm packages
  startTime = new Date().getTime();
  await installNpmDependencies(nodeCtx, fixedPackageList);
  endTime = new Date().getTime();
  npmMetrics.data.install = { duration: endTime - startTime };
  return npmMetrics;
}

let args: { nodeBin: string; runCfgPath: string; suiteName: string } | null =
  null;

export function getArgs() {
  if (args) {
    return args;
  }
  const argv = yargs(process.argv.slice(2))
    .command('$0', 'the default command')
    .option('runCfgPath', {
      alias: 'r',
      type: 'string',
      description: 'Path to sauce runner json',
    })
    .option('suiteName', {
      alias: 's',
      type: 'string',
      description: 'Select the suite to run',
    })
    .demandOption(['runCfgPath', 'suiteName'])
    .parseSync();
  const { runCfgPath, suiteName } = argv;
  const nodeBin = process.argv[0];
  args = { nodeBin, runCfgPath, suiteName };
  return args;
}

export function getEnv(suite: Suite) {
  let env: { [key: string]: string } = {};
  if (_.isObject(suite.env)) {
    env = { ...env, ...suite.env };
  }
  if (_.isObject(suite.config?.env)) {
    env = { ...env, ...suite?.config?.env };
  }
  // If the variable starts with $, pull that environment variable from the process
  for (const [name, value] of _.toPairs(env)) {
    const expectedValue = process.env[value.substring(1)];
    if (value.startsWith('$') && expectedValue) {
      env[name] = expectedValue;
    }
  }
  return env;
}

export function getSuite(runConfig: SuitesContainer, suiteName: string) {
  return runConfig.suites.find((testSuite) => testSuite.name === suiteName);
}

// renameScreenshot renames screenshot.
// nested/example.test.js/screenshot.png will be renamed to nested__example.test.js__screenshot.png
// example.test.js/screenshot.png will be renamed to example.test.js__screenshot.png
export function renameScreenshot(
  specFile: string,
  oldFilePath: string,
  folderName: string,
  fileName: string,
) {
  const newName = path.join(
    folderName,
    specFile.replace(path.sep, '__') + '__' + fileName,
  );
  fs.renameSync(oldFilePath, newName);
  return newName;
}

// renameAsset renames asset.
// nested/example.test.js.xml will be renamed to nested__example.test.js.xml
// example.test.js.xml will not be renamed and stay example.test.js.xml
export function renameAsset({
  specFile,
  oldFilePath,
  resultsFolder,
}: {
  specFile: string;
  oldFilePath: string;
  resultsFolder: string;
}) {
  const splittedSpecFile = specFile.split(path.sep);
  if (splittedSpecFile.length < 2) {
    return oldFilePath;
  }
  // create new file name
  const newFile = splittedSpecFile.slice(0, splittedSpecFile.length).join('__');
  const newFilePath = path.join(resultsFolder, newFile);
  fs.renameSync(oldFilePath, newFilePath);
  return newFilePath;
}

export function escapeXML(val: string) {
  return val.replace(/[<>&'"]/g, (c: string) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
    }
    return c;
  });
}
