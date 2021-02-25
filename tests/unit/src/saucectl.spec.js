const fs = require('fs');
const mock = require('mock-fs');
const saucectl = require('../../../src/saucectl');

describe('saucectl', function () {
  afterEach(function () {
    mock.restore();
  });

  it('should set value in output', function () {
    mock({
      [saucectl.OUTPUT_FILE_PATH]: '{}',
    });

    saucectl.exportValue({ jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.OUTPUT_FILE_PATH));
    expect(data.jobDetailsUrl).toBe('myurl');
  });

  it('should overwrite value in output', function () {
    mock({
      [saucectl.OUTPUT_FILE_PATH]: '{"previousField":"present"}',
    });

    saucectl.exportValue({ jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.OUTPUT_FILE_PATH));
    expect(data.jobDetailsUrl).toBe('myurl');
    expect(data.previousField).toBeUndefined();
  });

  it('should append value in output when empty', function () {
    mock({
      [saucectl.OUTPUT_FILE_PATH]: '{}',
    });

    saucectl.updateExportedValue({ jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.OUTPUT_FILE_PATH));
    expect(data.jobDetailsUrl).toBe('myurl');
  });

  it('should overwrite value in output', function () {
    mock({
      [saucectl.OUTPUT_FILE_PATH]: '{"previousField":"present"}',
    });

    saucectl.updateExportedValue({ jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(saucectl.OUTPUT_FILE_PATH));
    expect(data.jobDetailsUrl).toBe('myurl');
    expect(data.previousField).toBe('present');
  });
});