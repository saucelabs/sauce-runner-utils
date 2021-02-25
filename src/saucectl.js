const fs = require('fs');

// Store file containing job-details url.
// Path has to match the value of the Dockerfile label com.saucelabs.job-info !
const OUTPUT_FILE_PATH = '/tmp/output.json';

function exportValue (payload) {
  fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(payload));
}

function updateExportedValue (data) {
  let fileData;
  try {
    const st = fs.statSync(OUTPUT_FILE_PATH);
    if (st.isFile()) {
      fileData = JSON.parse(fs.readFileSync(OUTPUT_FILE_PATH)) || {};
    }
  } catch (e) {}
  fileData = { ...fileData, ...data };
  exportValue(fileData);
}

module.exports = {
  OUTPUT_FILE_PATH, exportValue, updateExportedValue,
};