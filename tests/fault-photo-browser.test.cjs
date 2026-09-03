const assert = require('node:assert/strict');
const path = require('node:path');

const moduleRoot = process.env.CODEX_NODE_MODULES;
if(!moduleRoot) throw new Error('Set CODEX_NODE_MODULES to the bundled node_modules directory.');
const {chromium} = require(path.join(moduleRoot, 'playwright'));

const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.LIFTCHECK_TEST_URL || 'http://127.0.0.1:4173/index.html?v=5.381';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:edge});
  const context = await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if(url.hostname === '127.0.0.1') return route.continue();
    return route.abort('internetdisconnected');
  });
  const page = await context.newPage();
  const dialogs = [];
  page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(String(err)));

  await page.goto(baseUrl, {waitUntil:'domcontentloaded'});
  await page.getByRole('button', {name:'Hlášení poruch', exact:true}).click();
  await page.getByRole('button', {name:'Přidat hlášení', exact:true}).click();
  await page.locator('#faultType').fill('TEST-IDB');
  await page.locator('#faultSerial').fill('TEST-IDB-OFFLINE-381');
  await page.locator('#faultDesc').fill('Automatický test lokální fotografie');
  await page.locator('#faultPhotoInput').setInputFiles({name:'fault.png', mimeType:'image/png', buffer:png});
  await page.getByText(/Připraveno 1\/4 fotek/).waitFor({timeout:15000});
  await page.getByRole('button', {name:'Uložit hlášení', exact:true}).click();
  await page.locator('.fault-card').filter({hasText:'TEST-IDB-OFFLINE-381'}).first().waitFor({timeout:30000});

  const offlineState = await page.evaluate(async () => {
    const rows = JSON.parse(localStorage.getItem('liftcheck_faults_local') || '[]');
    const row = rows.find(item => item.serial === 'TEST-IDB-OFFLINE-381');
    const key = row?.photos?.[0]?.localPhotoKey;
    const db = await openFaultPhotoDb();
    const stored = key ? await new Promise((resolve,reject) => {
      const request = db.transaction(FAULT_PHOTO_STORE_NAME, 'readonly').objectStore(FAULT_PHOTO_STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }) : null;
    return {json:JSON.stringify(row || {}), row, stored};
  });
  assert.ok(offlineState.row, 'Offline report must be stored locally');
  assert.equal(offlineState.json.includes('data:image'), false, 'localStorage must contain no Base64 image');
  assert.ok(offlineState.row.photos[0].localPhotoKey, 'Metadata must point to IndexedDB');
  assert.match(offlineState.stored.dataUrl, /^data:image\/jpeg;base64,/, 'IndexedDB must contain compressed image data');

  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button', {name:'Hlášení poruch', exact:true}).click();
  const card = page.locator('.fault-card').filter({hasText:'TEST-IDB-OFFLINE-381'}).first();
  await card.getByRole('button', {name:'Upravit', exact:true}).click();
  await page.locator('#faultPhotoPreview img').waitFor({timeout:10000});
  await page.locator('#faultFormWrap').getByRole('button', {name:'Smazat', exact:true}).click();
  await page.getByRole('button', {name:'Uložit hlášení', exact:true}).click();
  await page.waitForTimeout(500);
  const removed = await page.evaluate(async () => {
    const rows = JSON.parse(localStorage.getItem('liftcheck_faults_local') || '[]');
    const row = rows.find(item => item.serial === 'TEST-IDB-OFFLINE-381');
    const keys = await faultPhotoKeysForRecord(row.id);
    return {photoCount:(row.photos || []).length, keyCount:keys.length};
  });
  assert.deepEqual(removed, {photoCount:0, keyCount:0}, 'Removing a photo must clean metadata and IndexedDB');

  await page.getByRole('button', {name:'Přidat hlášení', exact:true}).click();
  const fourPhotos = Array.from({length:4}, (_,i) => ({name:`fault-${i+1}.png`, mimeType:'image/png', buffer:png}));
  await page.locator('#faultPhotoInput').setInputFiles(fourPhotos);
  await page.getByText(/Připraveno 4\/4 fotek/).waitFor({timeout:20000});
  assert.equal(await page.locator('#faultPhotoInput').isDisabled(), true, 'Current four-photo limit must remain enforced');

  await page.getByRole('button', {name:'Zrušit', exact:true}).click();
  await page.evaluate(() => {
    window.uploadDataUrl = async path => `https://storage.test/${encodeURIComponent(path)}`;
    window.setAndVerifyFirestore = async () => ({exists:true});
  });
  await page.getByRole('button', {name:'Přidat hlášení', exact:true}).click();
  await page.locator('#faultType').fill('TEST-IDB');
  await page.locator('#faultSerial').fill('TEST-IDB-ONLINE-381');
  await page.locator('#faultDesc').fill('Automatický test úspěšné synchronizace fotografie');
  await page.locator('#faultPhotoInput').setInputFiles({name:'online.png', mimeType:'image/png', buffer:png});
  await page.getByText(/Připraveno 1\/4 fotek/).waitFor({timeout:15000});
  await page.getByRole('button', {name:'Uložit hlášení', exact:true}).click();
  await page.locator('.fault-card').filter({hasText:'TEST-IDB-ONLINE-381'}).first().waitFor({timeout:30000});
  const onlineState = await page.evaluate(async () => {
    const rows = JSON.parse(localStorage.getItem('liftcheck_faults_local') || '[]');
    const row = rows.find(item => item.serial === 'TEST-IDB-ONLINE-381');
    return {row, keyCount:await faultPhotoKeysForRecord(row.id)};
  });
  assert.match(onlineState.row.photos[0].url, /^https:\/\/storage\.test\//);
  assert.equal('localPhotoKey' in onlineState.row.photos[0], false, 'Uploaded photo must drop its device-only key');
  assert.equal(onlineState.keyCount.length, 0, 'Uploaded photo must be removed from IndexedDB only after cloud metadata succeeds');

  await page.getByRole('button', {name:'Přidat hlášení', exact:true}).click();
  await page.locator('#faultType').fill('TEST-IDB');
  await page.locator('#faultSerial').fill('TEST-IDB-NO-PHOTO-381');
  await page.locator('#faultDesc').fill('Automatický test bez fotografie');
  await page.getByRole('button', {name:'Uložit hlášení', exact:true}).click();
  await page.locator('.fault-card').filter({hasText:'TEST-IDB-NO-PHOTO-381'}).first().waitFor({timeout:30000});
  const noPhotoCount = await page.evaluate(() => {
    const rows = JSON.parse(localStorage.getItem('liftcheck_faults_local') || '[]');
    return (rows.find(item => item.serial === 'TEST-IDB-NO-PHOTO-381')?.photos || []).length;
  });
  assert.equal(noPhotoCount, 0, 'Report without a photo must remain supported');

  assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join(' | ')}`);
  await browser.close();
  console.log('fault-photo-browser: online/offline save, reload/edit, delete and max-photo flow passed');
})().catch(err => { console.error(err); process.exit(1); });
