const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function functionSource(name){
  const start = html.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `Missing function ${name}`);
  const brace = html.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for(let i=brace; i<html.length; i++){
    const ch = html[i];
    if(escaped){ escaped = false; continue; }
    if(quote){
      if(ch === '\\'){ escaped = true; continue; }
      if(ch === quote) quote = '';
      continue;
    }
    if(ch === '"' || ch === "'" || ch === '`'){ quote = ch; continue; }
    if(ch === '{') depth++;
    if(ch === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error(`Unclosed function ${name}`);
}

const context = {
  cloneForCloudSync: value => JSON.parse(JSON.stringify(value)),
  dataUrlBytes: value => Math.floor((((value || '').split(',')[1] || '').length * 3) / 4),
  errorText: err => String(err && err.message || err || ''),
  storageSyncErrorText: err => String(err && err.message || err || ''),
  Date,
};
vm.createContext(context);
[
  'faultPhotoLocalKey',
  'faultPhotoMetadataForLocal',
  'faultRecordForLocalStorage',
  'faultRecordsForLocalStorage',
  'faultPhotosNeedUpload',
  'faultPhotoSyncPending',
  'markFaultPhotoSyncState',
  'faultCloudCopy',
].forEach(name => vm.runInContext(functionSource(name), context));

const dataUrl = 'data:image/jpeg;base64,' + 'A'.repeat(240000);
const record = {
  id:'porucha_test',
  description:'Test',
  photos:[{id:'foto_1', dataUrl, bytes:180000, width:800, height:600}],
};
const local = context.faultRecordForLocalStorage(record);
const localJson = JSON.stringify(local);
assert.equal(localJson.includes('data:image'), false, 'Base64 must never be written to localStorage metadata');
assert.equal(local.photos[0].localPhotoKey, 'porucha_test::foto_1');
assert.equal(local.photos[0].pendingUpload, true);
assert.equal(context.faultPhotoSyncPending(local), true);

const cloud = context.faultCloudCopy(local);
assert.equal('localPhotoKey' in cloud.photos[0], false, 'Device-only IndexedDB key must not enter Firestore');
assert.equal('dataUrl' in cloud.photos[0], false, 'Base64 must not enter Firestore metadata');

const synced = {id:'porucha_test', photos:[{id:'foto_1', url:'https://example.test/photo.jpg', pendingUpload:false}]};
assert.equal(context.faultPhotoSyncPending(synced), false);

assert.match(html, /indexedDB\.open\(FAULT_PHOTO_DB_NAME, FAULT_PHOTO_DB_VERSION\)/);
assert.match(functionSource('saveLocalFaults'), /faultRecordsForLocalStorage\(rows\)/);
assert.doesNotMatch(functionSource('prepareFaultForSave'), /Promise\.all/);
assert.match(functionSource('retryPendingFaultSync'), /faultPhotoSyncPending\(f\)/);
assert.match(functionSource('deleteFaultRecord'), /deleteFaultPhotosForRecord\(id\)/);
assert.match(functionSource('updateFaultPhotoProcessingUi'), /currentFaultPhotos\.length >= 4/);

console.log('fault-photo-storage: all tests passed');
