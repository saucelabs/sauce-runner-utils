/* istanbul ignore file */
import * as saucectl from './saucectl';
import * as npm from './npm';
import * as preExec from './preExec';
import * as utils from './utils';
import {
  getAbsolutePath,
  shouldRecordVideo,
  loadRunConfig,
  getDefaultRegistry,
  setUpNpmConfig,
  installNpmDependencies,
  rebuildNpmDependencies,
  hasNodeModulesFolder,
  getNpmConfig,
  prepareNpmEnv,
  getArgs,
  getEnv,
  getSuite,
  renameScreenshot,
  renameAsset,
  escapeXML
} from './utils';

export {
  npm,
  saucectl,
  utils,
  preExec,

  // Exporting all to keep compatibility with previous API
  getAbsolutePath,
  shouldRecordVideo,
  loadRunConfig,
  getDefaultRegistry,
  setUpNpmConfig,
  installNpmDependencies,
  rebuildNpmDependencies,
  hasNodeModulesFolder,
  getNpmConfig,
  prepareNpmEnv,
  getArgs,
  getEnv,
  getSuite,
  renameScreenshot,
  renameAsset,
  escapeXML
};
