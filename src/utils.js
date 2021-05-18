// vim: tabstop=2 shiftwidth=2 expandtab
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const yargs = require('yargs/yargs');
const npm = require('./npm');

const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

function getAbsolutePath (pathToDir) {
  if (path.isAbsolute(pathToDir)) {
    return pathToDir;
  }
  return path.join(process.cwd(), pathToDir);
}

function shouldRecordVideo () {
  let isVideoRecording = process.env.SAUCE_CYPRESS_VIDEO_RECORDING;
  if (isVideoRecording === undefined) {
    return true;
  }
  let videoOption = String(isVideoRecording).toLowerCase();
  return videoOption === 'true' || videoOption === '1';
}

let runConfig = null;

function loadRunConfig (cfgPath) {
  if (runConfig) {
    return runConfig;
  }
  if (fs.existsSync(cfgPath)) {
    runConfig = require(cfgPath);
    return runConfig;
  }
  throw new Error(`Runner config (${cfgPath}) unavailable.`);
}

function getDefaultRegistry () {
  return process.env.SAUCE_NPM_CACHE || DEFAULT_REGISTRY;
}

async function setUpNpmConfig (userConfig) {
  console.log('Preparing npm environment');
  const defaultConfig = {
    retry: { retries: 3 },
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
  await npm.load(Object.assign({}, defaultConfig, userConfig));
}

async function installNpmDependencies (packageList) {
  console.log(`\nInstalling packages: ${packageList.join(' ')}`);
  await npm.install(...packageList);
}

async function rebuildNpmDependencies (path) {
  console.log(`\nRebuilding packages:`);
  if (path) {
    await npm.rebuild('--prefix', path);
  } else {
    await npm.rebuild();
  }
}

// Check if node_modules already exists in provided project
function hasNodeModulesFolder (runCfg) {
  const projectFolder = path.dirname(runCfg.path);

  // Docker: if sauce-runner.json is in home, node_module won't be users'
  //         but the one of the runner => Discard it.
  if (!process.SAUCE_VM && projectFolder === process.env.HOME) {
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

function getNpmConfig (runnerConfig) {
  if (runnerConfig.npm === undefined) {
    return {};
  }
  return {
    registry: runnerConfig.npm.registry || getDefaultRegistry(),
    'strict-ssl': runnerConfig.npm.strictSSL !== false,
    // https://docs.npmjs.com/cli/v6/using-npm/config#package-lock
    // By default, `npm install $package` will install `$package` as well
    // as any dependency defined in package-lock.json that is missing from
    // node_modules.
    // Setting to false means `npm install $package` only installs `$package`
    'package-lock': runnerConfig.npm.packageLock === true
  };
}

async function prepareNpmEnv (runCfg) {
  const npmMetrics = {
    name: 'npm_metrics.json', data: {}
  };
  const packageList = runCfg && runCfg.npm && runCfg.npm.packages || {};
  const npmPackages = Object.entries(packageList).map(([pkg, version]) => `${pkg}@${version}`);
  if (npmPackages.length === 0) {
    return npmMetrics;
  }

  const npmConfig = getNpmConfig(runCfg);
  let startTime = (new Date()).getTime();
  await setUpNpmConfig(npmConfig);
  let endTime = (new Date()).getTime();
  npmMetrics.data.setup = {duration: endTime - startTime};

  let nodeModulesPresent = hasNodeModulesFolder(runCfg);

  // rebuild npm packages if node_modules provided
  if (nodeModulesPresent) {
    console.log(`Detected node_modules, running npm rebuilding.`);

    const projectPath = path.dirname(runCfg.path);
    npmMetrics.data.rebuild = {};
    startTime = (new Date()).getTime();
    await rebuildNpmDependencies(projectPath);
    endTime = (new Date()).getTime();
    npmMetrics.data.rebuild = {duration: endTime - startTime};
  }

  // install npm packages
  npmMetrics.data.install = {};
  startTime = (new Date()).getTime();
  await installNpmDependencies(npmPackages);
  endTime = (new Date()).getTime();
  npmMetrics.data.install = {duration: endTime - startTime};
  return npmMetrics;
}

let args = null;

function getArgs () {
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

function getEnv (suite) {
  let env = {};
  if (_.isObject(suite.env)) {
    env = {...env, ...suite.env};
  }
  if (_.isObject(suite.config) && _.isObject(suite.config.env)) {
    env = {...env, ...suite.config.env};
  }
  // If the variable starts with $, pull that environment variable from the process
  for (const [name, value] of _.toPairs(env)) {
    if (value.startsWith('$')) {
      env[name] = process.env[value.slice(1)];
    }
  }
  return env;
}

function getSuite (runConfig, suiteName) {
  return runConfig.suites.find((testSuite) => testSuite.name === suiteName);
}

// renameScreenshot renames screenshot.
// nested/example.test.js/screenshot.png will be renamed to nested__example.test.js__screenshot.png
// example.test.js/screenshot.png will be renamed to example.test.js__screenshot.png
function renameScreenshot (specFile, oldFilePath, folderName, fileName) {
  let newName = path.join(folderName, specFile.replace(path.sep, '__') + '__' + fileName);
  fs.renameSync(oldFilePath, newName);
  return newName;
}

// renameAsset renames asset.
// nested/example.test.js.xml will be renamed to nested__example.test.js.xml
// example.test.js.xml will not be renamed and stay example.test.js.xml
function renameAsset ({specFile, oldFilePath, resultsFolder}) {
  const splittedSpecFile = specFile.split(path.sep);
  if (splittedSpecFile.length < 2) {
    return oldFilePath;
  }
  // create new file name
  let newFile = splittedSpecFile.slice(0, splittedSpecFile.length).join('__');
  let newFilePath = path.join(resultsFolder, newFile);
  fs.renameSync(oldFilePath, newFilePath);
  return newFilePath;
}

module.exports = {
  getAbsolutePath, shouldRecordVideo, loadRunConfig,
  prepareNpmEnv, setUpNpmConfig, installNpmDependencies, rebuildNpmDependencies,
  getArgs, getEnv, getSuite, renameScreenshot, renameAsset, getNpmConfig
};
