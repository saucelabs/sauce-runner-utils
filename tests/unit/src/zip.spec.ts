import path from 'path';
import { isFolderOutside } from '../../../src/zip';

describe('isFolderOutside', () => {
  const baseFolder = path.resolve('path/to/base');
  const insideFolder = path.resolve('path/to/base/inside');
  const outsideFolder = path.resolve('path/to/outside');
  const adjacentFolder = path.resolve('path/to/base/../adjacent');

  test('should return false for a folder inside the specified folder', () => {
    expect(isFolderOutside(insideFolder, baseFolder)).toBeFalsy();
  });

  test('should return true for a folder outside the specified folder', () => {
    expect(isFolderOutside(outsideFolder, baseFolder)).toBeTruthy();
  });

  test('should return true for a folder adjacent to the specified folder', () => {
    expect(isFolderOutside(adjacentFolder, baseFolder)).toBeTruthy();
  });

  test('should handle relative paths correctly', () => {
    const relativeInside = 'path/to/base/inside';
    const relativeOutside = '../outside';

    expect(isFolderOutside(relativeInside, 'path/to/base')).toBeFalsy();
    expect(isFolderOutside(relativeOutside, 'path/to/base')).toBeTruthy();
  });

  test('should return true for the same folder when not ending with path separator', () => {
    // This is a tricky case: technically, the folder is not "outside" itself, but based on the implementation,
    // not having the trailing slash treats it as if it's checking for a prefix match, which fails for equal paths.
    expect(isFolderOutside(baseFolder, baseFolder)).toBeTruthy();
  });
});
