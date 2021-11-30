import { readFileSync, statSync, writeFileSync } from 'fs';

export function exportValue (filepath: string, payload: object | null) {
  writeFileSync(filepath, JSON.stringify(payload));
}

export function updateExportedValue (filepath: string, data: object | null) {
  let fileData;
  try {
    const st = statSync(filepath);
    if (st.isFile()) {
      fileData = JSON.parse(readFileSync(filepath).toString()) || {};
    }
  } catch (e) {}
  fileData = { ...fileData, ...data };
  exportValue(filepath, fileData);
}
