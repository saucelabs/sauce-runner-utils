const fs = require('fs');

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
  exportValue, updateExportedValue,
};