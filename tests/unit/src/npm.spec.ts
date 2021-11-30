import * as npm from 'npm';
import { default as npmLocal } from '../../../src/npm';
import * as utils from '../../../src/utils';

describe('npm', function () {
  it('install should invoke npm', async function () {
    await utils.setUpNpmConfig({});
    const installSpy = jest.spyOn(npm.commands, 'install');

    installSpy.mockImplementation((val, callBack) => {
      console.log('install: finished');
      callBack();
    });
    await npmLocal.install('sl-dummy-package@2.0.0');

    expect(installSpy.mock.calls).toMatchSnapshot();
  });


  it('rebuild should invoke npm', async function () {
    await utils.setUpNpmConfig({});
    const rebuildSpy = jest.spyOn(npm.commands, 'rebuild');

    rebuildSpy.mockImplementation((val, callBack) => {
      console.log('rebuild: finished');
      callBack();
    });
    await npmLocal.rebuild();
    expect(rebuildSpy.mock.calls).toMatchSnapshot();
  });
});
