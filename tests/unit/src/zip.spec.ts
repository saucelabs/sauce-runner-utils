import path from 'path';
import { isFolderOutside } from '../../../src/zip';

describe('isFolderOutside', () => {
  const baseFolder = path.resolve('path/to/base');
  const insideFolder = path.resolve('path/to/base/inside');
  const outsideFolder = path.resolve('path/to/outside');

  test('should return false for a folder inside the specified folder', () => {
    expect(isFolderOutside(insideFolder, baseFolder)).toBeFalsy();
  });

  test('should return true for a folder outside the specified folder', () => {
    expect(isFolderOutside(outsideFolder, baseFolder)).toBeTruthy();
  });

  test('should handle relative paths correctly', () => {
    const relativeOutside = '../outside';
    expect(isFolderOutside(relativeOutside, baseFolder)).toBeTruthy();
  });

  test('should return false for the same folder', () => {
    expect(isFolderOutside(baseFolder, baseFolder)).toBeFalsy();
  });
});
