import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { platform } from 'os';
import { errCode } from './error';

function validate(workspace: string, source: string, dest: string) {
  if (!source.trim()) {
    throw new Error('The source path cannot be empty.');
  }
  if (!dest.trim()) {
    throw new Error('The destination file cannot be empty.');
  }

  // Verify the source folder exists and is not a file.
  try {
    const stats = fs.statSync(source);
    if (!stats.isDirectory()) {
      throw new Error('Invalid source folder: the source must be a directory.');
    }
  } catch (err) {
    if (errCode(err) === 'ENOENT') {
      throw new Error('Invalid source folder: not exist.');
    }
    throw new Error(`Failed to access source folder: ${err}`);
  }

  if (path.isAbsolute(source)) {
    throw new Error('Invalid source folder: absolute path is not supported.');
  }
  if (isFolderOutside(source, workspace)) {
    throw new Error(
      'Invalid source folder: the source path is outside the user workspace.',
    );
  }
  if (!dest.endsWith('.zip')) {
    throw new Error('Invalid zip filename: Only .zip file is permitted.');
  }
}

/**
 * Checks if a folder is outside of a specified folder.
 *
 * @param {string} targetFolder The path to the target folder.
 * @param {string} specifiedFolder The path to the specified folder.
 * @returns {boolean} Returns true if the target folder is outside of the specified folder, false otherwise.
 */
export function isFolderOutside(
  targetFolder: string,
  specifiedFolder: string,
): boolean {
  // Resolve absolute paths.
  const absoluteTargetFolder = path.resolve(targetFolder);
  const absoluteSpecifiedFolder = path.resolve(specifiedFolder);

  // Check if the target folder is the same as the specified folder (not outside).
  if (absoluteTargetFolder === absoluteSpecifiedFolder) {
    return false;
  }

  // Ensure the specified folder path ends with a path separator to avoid partial matches.
  const specifiedFolderWithTrailingSlash = absoluteSpecifiedFolder.endsWith(
    path.sep,
  )
    ? absoluteSpecifiedFolder
    : `${absoluteSpecifiedFolder}${path.sep}`;

  // Check if the target folder is outside of the specified folder.
  return !absoluteTargetFolder.startsWith(specifiedFolderWithTrailingSlash);
}

/**
 * Generates a platform-specific command string for compressing files into a zip archive.
 *
 * On macOS, it constructs a shell command using the `zip` utility with options to
 * recursively zip the content, preserve symlinks, and operate quietly.
 *
 * On Windows, it constructs a PowerShell command using `Compress-Archive` with options to
 * specify the source and destination paths directly, and the `-Force` option to overwrite
 * any existing destination file.
 *
 * For other operating systems, an empty string is returned, indicating that no supported
 * command is available.
 *
 * @param source The path of the directory or file to be compressed.
 * @param dest The path where the output zip file should be saved, including the file name.
 * @returns A string containing the command to execute, or an empty string if the platform is not supported.
 */
function getCommand(source: string, dest: string): string {
  const osPlatform = platform();
  if (osPlatform === 'darwin') {
    return `zip -ryq "${dest}" "${source}"`;
  }
  if (osPlatform === 'win32') {
    return `Compress-Archive -Path ${source} -DestinationPath ${dest} -Force`;
  }
  return '';
}

/**
 * Compresses the specified source into a zip file at the destination path.
 *
 * @param workspace The user workspace directory.
 * @param source The path of the directory or file to be compressed.
 * @param dest The path where the output zip file should be saved.
 */
export function zip(workspace: string, source: string, dest: string) {
  try {
    validate(workspace, source, dest);
    const command = getCommand(source, dest);
    if (command) {
      execSync(getCommand(source, dest));
    }
  } catch (error) {
    console.error(
      `Zip file creation failed for destination: "${dest}", source: "${source}". Error: ${error}.`,
    );
  }
}
