/* istanbul ignore file */
import * as npm from './npm';
import * as utils from './utils';
import * as preExec from './preExec';
import { zip } from './zip';
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
  escapeXML,
} from './utils';

export {
  npm,
  utils,
  preExec,
  zip,

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
  escapeXML,
};
