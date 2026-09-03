const assert = require('node:assert/strict');
const path = require('node:path');

const moduleRoot = process.env.CODEX_NODE_MODULES;
if(!moduleRoot) throw new Error('Set CODEX_NODE_MODULES to the bundled node_modules directory.');
const {chromium} = require(path.join(moduleRoot, 'playwright'));
const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.LIFTCHECK_TEST_URL || 'http://127.0.0.1:4173/index.html?v=5.383';

const source = {
  id:'quarterly-with-issue', vc:'REPAIR-001', typ:'JLG 450 AJ', rok:'2022',
  datum:'2026-08-20', dalsiKontrola:'2026-11-20', revizeDo:'2027-12',
  umisteni:'Zeppelin CZ s.r.o. – Znojemská 82, 586 01 Jihlava', mh:'1250',
  technik:'Petr Čáp', enteredBy:'Petr Čáp', cLogic:'legacy',
  chargerPresent:'ANO', socket230Present:'ANO',
  C2:'ANO', C2_p:'Poškozené levé přední kolo', B1:'NE', B1_p:'Vyměnit kolo',
  zaverOprava:'ANO', zaverBezpecny:'NE',
  photos:{right:{url:'https://example.invalid/right.jpg',path:'protocols/old/right.jpg'},front:{dataUrl:'data:image/jpeg;base64,AA'}},
  issuePhotos:{C2:[{url:'https://example.invalid/issue.jpg'}]},
  savedAt:'2026-08-20T10:00:00.000Z', appVersion:'1.6 / 5.382'
};

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:edge});
  const context = await browser.newContext({viewport:{width:390,height:844}, serviceWorkers:'block'});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort('internetdisconnected');
  });
  await context.addInitScript(row => {
    localStorage.setItem('ctvrtletni_protokoly_local', JSON.stringify([row]));
    localStorage.setItem('liftcontrol_last_entered_by', 'Jan Bartoš');
    localStorage.removeItem('liftcontrol_quarterly_protocol_draft_v2');
  }, source);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(baseUrl, {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    window.saveProtocol = async record => {
      data = upsertLocalRow(loadLocalData, saveLocalData, record);
      return {local:true,cloud:true,record};
    };
  });
  await page.getByRole('button', {name:'Archiv čtvrtletních kontrol'}).click();
  const sourceCard = page.locator('#protocol-card-quarterly-with-issue');
  await sourceCard.getByRole('button', {name:'Opraveno'}).click();
  await page.waitForFunction(() => loadLocalData().length === 2);

  const rows = await page.evaluate(() => loadLocalData());
  const original = rows.find(row => row.id === 'quarterly-with-issue');
  const repaired = rows.find(row => row.repairFollowUpOf === 'quarterly-with-issue');
  assert.ok(original, 'Original protocol must remain in history');
  assert.equal(original.C2, 'ANO', 'Original issue must stay unchanged');
  assert.ok(repaired, 'A new follow-up protocol must be created');
  assert.notEqual(repaired.id, original.id, 'Follow-up must use a new id');
  assert.equal(await page.evaluate(id => hasIssue(loadLocalData().find(row => row.id === id)), repaired.id), false, 'Follow-up protocol must be without issues');
  assert.equal(repaired.technik, 'Jan Bartoš');
  assert.equal(repaired.enteredBy, 'Jan Bartoš');
  assert.equal(repaired.zaverOprava, 'NE');
  assert.equal(repaired.zaverBezpecny, 'ANO');
  assert.deepEqual(repaired.issuePhotos, {}, 'Issue photos must not be copied');
  assert.equal(repaired.photos.right.url, 'https://example.invalid/right.jpg', 'Already uploaded machine photo may be referenced');
  assert.equal(repaired.photos.front, undefined, 'Local Base64 photo must not be duplicated');
  assert.match(repaired.poznamka, /Navazující protokol po odstranění závad/);
  assert.equal(repaired.appVersion, '1.6 / 5.383');

  assert.equal(await sourceCard.getByRole('button', {name:'Opraveno'}).count(), 0, 'A duplicate repair action must not remain available');
  assert.ok(await sourceCard.getByText(/Opraveno · nový protokol/).isVisible());
  const followUpCard = page.locator(`#protocol-card-${repaired.id}`);
  assert.ok(await followUpCard.getByText('Navazující protokol po opravě').isVisible());
  assert.ok(await followUpCard.getByText('Bez závad', {exact:true}).isVisible());

  await page.evaluate(() => createRepairedQuarterlyProtocol('quarterly-with-issue'));
  assert.equal(await page.evaluate(() => loadLocalData().length), 2, 'Repeated action must not create a duplicate protocol');
  assert.equal(errors.length, 0, `Page errors: ${errors.join(' | ')}`);
  await context.close();
  await browser.close();
  console.log('quarterly-repaired-protocol-browser: original preserved, issue-free follow-up created and duplicates blocked');
})().catch(err => { console.error(err); process.exit(1); });
