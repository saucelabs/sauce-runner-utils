import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { platform } from 'os';

function validate(source: string, dest: string, workspace: string) {
  if (!source.trim()) {
    throw new Error('The source path cannot be empty.');
  }
  if (!dest.trim()) {
    throw new Error('The destination file cannot be empty.');
  }
  if (!workspace.trim()) {
    throw new Error('The workspace path cannot be empty.');
  }
  if (path.isAbsolute(source)) {
    throw new Error('Invalid source folder: absolute path is not supported.');
  }
  if (isFolderOutside(source, workspace)) {
    throw new Error(
      'Invalid source folder: the source path is outside the user workspace.',
    );
  }
  const stats = fs.statSync(source);
  if (!stats.isDirectory()) {
    throw new Error('Invalid source folder: the source must be a directory.');
  }
  if (!dest.endsWith('.zip')) {
    throw new Error('Invalid zip filename: Only .zip files are permitted.');
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
 * On macOS (Darwin), it constructs a shell command using the `zip` utility with options to
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
 * @param source The path of the directory or file to be compressed.
 * @param dest The path where the output zip file should be saved.
 * @param workspace The root directory to validate the source path against, ensuring the source
 *                  is within the workspace boundaries.
 */
export function zip(source: string, dest: string, workspace: string) {
  try {
    validate(source, dest, workspace);
    const command = getCommand(source, dest);
    if (command) {
      execSync(getCommand(source, dest));
    }
  } catch (error) {
    console.error(`Error occurred: ${error}`);
  }
}
