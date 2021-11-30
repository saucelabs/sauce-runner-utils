import fs from 'fs';
import mock from 'mock-fs';
import * as saucectl from '../../../src/saucectl';

const TEST_OUTPUT_FILEPATH = '/tmp/output.json';

describe('saucectl', function () {
  afterEach(function () {
    mock.restore();
  });

  it('should set value in output', function () {
    mock({
      [TEST_OUTPUT_FILEPATH]: '{}',
    });

    saucectl.exportValue(TEST_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(TEST_OUTPUT_FILEPATH).toString());
    expect(data.jobDetailsUrl).toBe('myurl');
  });

  it('should overwrite value in output', function () {
    mock({
      [TEST_OUTPUT_FILEPATH]: '{"previousField":"present"}',
    });

    saucectl.exportValue(TEST_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(TEST_OUTPUT_FILEPATH).toString());
    expect(data.jobDetailsUrl).toBe('myurl');
    expect(data.previousField).toBeUndefined();
  });

  it('should append value in output when empty', function () {
    mock({
      [TEST_OUTPUT_FILEPATH]: '{}',
    });

    saucectl.updateExportedValue(TEST_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(TEST_OUTPUT_FILEPATH).toString());
    expect(data.jobDetailsUrl).toBe('myurl');
  });

  it('should overwrite value in output', function () {
    mock({
      [TEST_OUTPUT_FILEPATH]: '{"previousField":"present"}',
    });

    saucectl.updateExportedValue(TEST_OUTPUT_FILEPATH, { jobDetailsUrl: 'myurl' });

    const data = JSON.parse(fs.readFileSync(TEST_OUTPUT_FILEPATH).toString());
    expect(data.jobDetailsUrl).toBe('myurl');
    expect(data.previousField).toBe('present');
  });
});
