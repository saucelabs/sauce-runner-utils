const fs = require('fs');
const mock = require('mock-fs');
const saucectl = require('../../../src/saucectl');

describe('saucectl', function () {
  afterEach(function () {
    mock.restore();
  });

  it('should set value in output', function () {
    mock({
      [saucectl.DEFAULT_OUTPUT_FILEPATH]: '{}',
    });

    saucectl.exportValue(saucectl.DEFAULT_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.DEFAULT_OUTPUT_FILEPATH));
    expect(data.jobDetailsUrl).toBe('myurl');
  });

  it('should overwrite value in output', function () {
    mock({
      [saucectl.DEFAULT_OUTPUT_FILEPATH]: '{"previousField":"present"}',
    });

    saucectl.exportValue(saucectl.DEFAULT_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.DEFAULT_OUTPUT_FILEPATH));
    expect(data.jobDetailsUrl).toBe('myurl');
    expect(data.previousField).toBeUndefined();
  });

  it('should append value in output when empty', function () {
    mock({
      [saucectl.DEFAULT_OUTPUT_FILEPATH]: '{}',
    });

    saucectl.updateExportedValue(saucectl.DEFAULT_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.DEFAULT_OUTPUT_FILEPATH));
    expect(data.jobDetailsUrl).toBe('myurl');
  });

  it('should overwrite value in output', function () {
    mock({
      [saucectl.DEFAULT_OUTPUT_FILEPATH]: '{"previousField":"present"}',
    });

    saucectl.updateExportedValue(saucectl.DEFAULT_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.DEFAULT_OUTPUT_FILEPATH));
    expect(data.jobDetailsUrl).toBe('myurl');
    expect(data.previousField).toBe('present');
  });
});