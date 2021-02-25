const fs = require('fs');

// Store file containing job-details url.
// Path has to match the value of the Dockerfile label com.saucelabs.job-info !
const DEFAULT_OUTPUT_FILEPATH = '/tmp/output.json';

function exportValue (filepath, payload) {
  fs.writeFileSync(filepath, JSON.stringify(payload));
}

function updateExportedValue (filepath, data) {
  let fileData;
  try {
    const st = fs.statSync(filepath);
    if (st.isFile()) {
      fileData = JSON.parse(fs.readFileSync(filepath)) || {};
    }
  } catch (e) {}
  fileData = { ...fileData, ...data };
  exportValue(filepath, fileData);
}

module.exports = {
  DEFAULT_OUTPUT_FILEPATH, exportValue, updateExportedValue,
};