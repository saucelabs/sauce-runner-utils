// vim: tabstop=2 shiftwidth=2 expandtab
import path from 'path';
import fs from 'fs';
import _ from 'lodash';
import yargs from 'yargs/yargs';
import npm from './npm';
import { IHasNpmConfig, IHasPath, IHasSuites, Suite, NpmConfig } from './types';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

export function getAbsolutePath (pathToDir: string) {
  if (path.isAbsolute(pathToDir)) {
    return pathToDir;
  }
  return path.join(process.cwd(), pathToDir);
}

export function shouldRecordVideo () {
  const isVideoRecording = process.env.SAUCE_CYPRESS_VIDEO_RECORDING;
  if (isVideoRecording === undefined) {
    return true;
  }
  const videoOption = String(isVideoRecording).toLowerCase();
  return videoOption === 'true' || videoOption === '1';
}

let runConfig: IHasNpmConfig | IHasPath | IHasSuites;

export function loadRunConfig (cfgPath: string) {
  if (runConfig) {
    return runConfig;
  }
  if (fs.existsSync(cfgPath)) {
    runConfig = require(cfgPath);
    return runConfig;
  }
  throw new Error(`Runner config (${cfgPath}) unavailable.`);
}

export function getDefaultRegistry () {
  return process.env.SAUCE_NPM_CACHE || DEFAULT_REGISTRY;
}

export async function setUpNpmConfig (userConfig: NpmConfig) {
  console.log('Preparing npm environment');
  const defaultConfig = {
    // Note: This is temporarily removed, waiting to get the cli-version of it.
    // retry: { retries: 3 },
    json: false,
    save: false,
    audit: false,
    rollback: false,
    fund: false,
    noproxy: 'registry.npmjs.org',
    cafile: process.env.CA_FILE || null,
    'package-lock': false,
    'strict-ssl': true,
    registry: getDefaultRegistry()
  };
  await npm.configure(Object.assign({}, defaultConfig, userConfig));
}

export async function installNpmDependencies (packageList: {[key:string]: string}) {
  const packages = Object.entries(packageList).map(([k, v]) => (`${k}@${v}`));
  console.log(`\nInstalling packages: ${packages.join(' ')}`);
  await npm.install(packageList);
}

export async function rebuildNpmDependencies (path: string) {
  console.log(`\nRebuilding packages:`);
  if (path) {
    await npm.rebuild('--prefix', path);
  } else {
    await npm.rebuild();
  }
}

// Check if node_modules already exists in provided project
export function hasNodeModulesFolder (runCfg: IHasPath) {
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
  } catch (e) {}
  return false;
}

export function getNpmConfig (runnerConfig: IHasNpmConfig) {
  if (runnerConfig.npm === undefined) {
    return {};
  }
  return {
    registry: runnerConfig.npm.registry || getDefaultRegistry(),
    'strict-ssl': runnerConfig.npm.strictSSL !== false,
    // Setting to false avoid dealing with the generated file.
    'package-lock': runnerConfig.npm.packageLock === true
  };
}

export async function prepareNpmEnv (runCfg: IHasNpmConfig & IHasPath) {
  const data: {
    install: {duration: number},
    rebuild?: {duration: number},
    setup: {duration: number},
  } = { install: { duration: 0 }, setup: { duration: 0 } };
  const npmMetrics = { name: 'npm_metrics.json', data };
  const packageList = runCfg?.npm?.packages || {};

  const nodeModulesPresent = hasNodeModulesFolder(runCfg);

  const npmConfig = getNpmConfig(runCfg);
  let startTime = (new Date()).getTime();
  await setUpNpmConfig(npmConfig);
  let endTime = (new Date()).getTime();
  npmMetrics.data.setup = {duration: endTime - startTime};

  // rebuild npm packages if node_modules provided
  if (nodeModulesPresent) {
    console.log(`Detected node_modules, running npm rebuilding.`);

    const projectPath = path.dirname(runCfg.path);
    startTime = (new Date()).getTime();
    await rebuildNpmDependencies(projectPath);
    endTime = (new Date()).getTime();
    npmMetrics.data.rebuild = {duration: endTime - startTime};
  }

  if (Object.keys(packageList).length === 0) {
    return npmMetrics;
  }

  // Ensure version is a string value as NPM only accept strings.
  const fixedPackageList = Object.fromEntries(
    Object.entries(packageList).map(([k, v]) => [k, String(v)])
  );

  // install npm packages
  startTime = (new Date()).getTime();
  await installNpmDependencies(fixedPackageList);
  endTime = (new Date()).getTime();
  npmMetrics.data.install = {duration: endTime - startTime};
  return npmMetrics;
}

let args: { nodeBin: string, runCfgPath: string, suiteName: string } | null = null;

export function getArgs () {
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
      description: 'Select the suite to run'
    })
    .demandOption(['runCfgPath', 'suiteName'])
    .argv;
  const { runCfgPath, suiteName } = argv;
  const nodeBin = process.argv[0];
  args = { nodeBin, runCfgPath, suiteName };
  return args;
}

export function getEnv (suite: Suite) {
  let env: {[key: string]: string} = {};
  if (_.isObject(suite.env)) {
    env = {...env, ...suite.env};
  }
  if (_.isObject(suite.config?.env)) {
    env = {...env, ...suite?.config?.env};
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

export function getSuite (runConfig: IHasSuites, suiteName: string) {
  return runConfig.suites.find((testSuite) => testSuite.name === suiteName);
}

// renameScreenshot renames screenshot.
// nested/example.test.js/screenshot.png will be renamed to nested__example.test.js__screenshot.png
// example.test.js/screenshot.png will be renamed to example.test.js__screenshot.png
export function renameScreenshot (specFile: string, oldFilePath: string, folderName: string, fileName: string) {
  const newName = path.join(folderName, specFile.replace(path.sep, '__') + '__' + fileName);
  fs.renameSync(oldFilePath, newName);
  return newName;
}

// renameAsset renames asset.
// nested/example.test.js.xml will be renamed to nested__example.test.js.xml
// example.test.js.xml will not be renamed and stay example.test.js.xml
export function renameAsset ({specFile, oldFilePath, resultsFolder}: { specFile: string, oldFilePath: string, resultsFolder: string}) {
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

export function escapeXML (val: string) {
  return val.replace(/[<>&'"]/g, (c: string) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
    return c;
  });
}
