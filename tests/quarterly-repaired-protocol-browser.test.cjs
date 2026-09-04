const assert = require('node:assert/strict');
const path = require('node:path');

const moduleRoot = process.env.CODEX_NODE_MODULES;
if(!moduleRoot) throw new Error('Set CODEX_NODE_MODULES to the bundled node_modules directory.');
const {chromium} = require(path.join(moduleRoot, 'playwright'));
const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.LIFTCHECK_TEST_URL || 'http://127.0.0.1:4173/index.html?v=5.384';

const source = {
  id:'quarterly-with-issue', vc:'REPAIR-001', typ:'JLG 450 AJ', rok:'2022',
  datum:'2026-08-20', dalsiKontrola:'2026-11-20', revizeDo:'2027-12',
  umisteni:'Zeppelin CZ s.r.o. – Znojemská 82, 586 01 Jihlava', mh:'1250',
  technik:'Petr Čáp', enteredBy:'Petr Čáp', cLogic:'legacy',
  chargerPresent:'ANO', socket230Present:'ANO',
  C2:'ANO', C2_p:'Poškozené levé přední kolo', B1:'NE', B1_p:'Vyměnit kolo',
  poznamka:'Původní interní poznámka k závadě',
  zaverOprava:'ANO', zaverBezpecny:'NE',
  techSignature:'data:image/png;base64,OLDTECH', customerSignature:'data:image/png;base64,OLDCUSTOMER',
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
    if(!localStorage.getItem('ctvrtletni_protokoly_local')) localStorage.setItem('ctvrtletni_protokoly_local', JSON.stringify([row]));
    localStorage.setItem('liftcontrol_last_entered_by', 'Jan Bartoš');
    localStorage.removeItem('liftcontrol_quarterly_protocol_draft_v2');
  }, source);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(baseUrl, {waitUntil:'domcontentloaded'});
  await page.evaluate(() => {
    firebaseAvailable = false;
    storageAvailable = false;
    db = null;
    storage = null;
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
  assert.equal(repaired.techSignature, '', 'A signature from the old protocol must never be copied to a new date');
  assert.equal(repaired.customerSignature, '', 'A customer signature from the old protocol must never be copied to a new date');
  assert.equal(repaired.repairSourceNote, 'Původní interní poznámka k závadě', 'The original note remains in traceability metadata');
  assert.doesNotMatch(repaired.poznamka, /Původní interní poznámka/, 'An old issue note must not look like a current finding');
  assert.match(repaired.poznamka, /Původní závady byly odstraněny/);
  assert.equal(repaired.appVersion, '1.6 / 5.384');

  const compatibility = await page.evaluate(() => {
    const positive = buildRepairedQuarterlyProtocol({
      id:'positive-source', vc:'POSITIVE-001', typ:'JLG 450 AJ', datum:'2026-08-20', revizeDo:'2027-12',
      cLogic:'positive', chargerPresent:'ANO', socket230Present:'ANO', C2:'NE', C2_p:'Závada', B1:'NE', zaverOprava:'ANO', zaverBezpecny:'NE'
    }, 'Jan Bartoš');
    const charger = buildRepairedQuarterlyProtocol({
      id:'charger-source', vc:'CHARGER-001', typ:'JLG 450 AJ', datum:'2026-08-20', revizeDo:'2027-12',
      cLogic:'legacy', chargerPresent:'ZAVADA', chargerMissingIssue:'NE', chargerMissingIssue_p:'Nabíječ chybí', B1:'NE', zaverOprava:'ANO', zaverBezpecny:'NE'
    }, 'Jan Bartoš');
    return {
      positiveC2:positive.C2,
      positiveIssue:hasIssue(positive),
      chargerPresent:charger.chargerPresent,
      chargerIssue:hasIssue(charger)
    };
  });
  assert.deepEqual(compatibility, {positiveC2:'ANO',positiveIssue:false,chargerPresent:'ANO',chargerIssue:false}, 'Legacy, positive and missing-charger issue logic must all produce an issue-free follow-up');

  const printed = await page.evaluate(id => renderPaper(loadLocalData().find(row => row.id === id)), repaired.id);
  assert.match(printed, /Původní závady byly odstraněny/);
  assert.match(printed, /Zařízení vyhovuje provozu/);
  assert.doesNotMatch(printed, /class="status-bad"/, 'Printed follow-up must not contain an issue row');

  assert.equal(await sourceCard.getByRole('button', {name:'Opraveno'}).count(), 0, 'A duplicate repair action must not remain available');
  assert.ok(await sourceCard.getByText(/Opraveno · nový protokol/).isVisible());
  const followUpCard = page.locator(`#protocol-card-${repaired.id}`);
  assert.ok(await followUpCard.getByText('Navazující protokol po opravě').isVisible());
  assert.ok(await followUpCard.getByText('Bez závad', {exact:true}).isVisible());

  await page.evaluate(() => createRepairedQuarterlyProtocol('quarterly-with-issue'));
  assert.equal(await page.evaluate(() => loadLocalData().length), 2, 'Repeated action must not create a duplicate protocol');

  await page.locator('#statusFilter').selectOption('issues');
  assert.ok(await page.locator('#protocol-card-quarterly-with-issue').isVisible());
  assert.equal(await page.locator(`#protocol-card-${repaired.id}`).count(), 0, 'Issue filter must hide the repaired follow-up');
  await page.locator('#statusFilter').selectOption('ok');
  assert.equal(await page.locator('#protocol-card-quarterly-with-issue').count(), 0, 'OK filter must hide the original issue protocol');
  assert.ok(await page.locator(`#protocol-card-${repaired.id}`).isVisible());

  await page.reload({waitUntil:'domcontentloaded'});
  assert.equal(await page.evaluate(() => loadLocalData().length), 2, 'Both records must survive a full offline reload');
  await page.getByRole('button', {name:'Archiv čtvrtletních kontrol'}).click();
  assert.ok(await page.locator('#protocol-card-quarterly-with-issue').getByText(/Opraveno · nový protokol/).isVisible());
  assert.ok(await page.locator(`#protocol-card-${repaired.id}`).getByText('Navazující protokol po opravě').isVisible());

  const beforeExpired = await page.evaluate(() => {
    const expired = Object.assign({}, loadLocalData()[0], {
      id:'expired-repair-source', vc:'EXPIRED-001', datum:'2025-01-10', revizeDo:'2025-02',
      repairFollowUpOf:'', C2:'ANO', C2_p:'Závada s propadlou revizí', zaverOprava:'ANO', zaverBezpecny:'NE'
    });
    data = upsertLocalRow(loadLocalData, saveLocalData, expired);
    render();
    return loadLocalData().length;
  });
  await page.evaluate(() => createRepairedQuarterlyProtocol('expired-repair-source'));
  assert.equal(await page.evaluate(() => loadLocalData().length), beforeExpired, 'Expired revision must block creation of an issue-free follow-up');
  assert.equal(errors.length, 0, `Page errors: ${errors.join(' | ')}`);
  await context.close();
  await browser.close();
  console.log('quarterly-repaired-protocol-browser: original preserved, issue-free follow-up created and duplicates blocked');
})().catch(err => { console.error(err); process.exit(1); });
