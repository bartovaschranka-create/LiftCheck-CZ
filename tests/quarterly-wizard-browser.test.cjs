const assert = require('node:assert/strict');
const path = require('node:path');

const moduleRoot = process.env.CODEX_NODE_MODULES;
if(!moduleRoot) throw new Error('Set CODEX_NODE_MODULES to the bundled node_modules directory.');
const {chromium} = require(path.join(moduleRoot, 'playwright'));
const edge = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseUrl = process.env.LIFTCHECK_TEST_URL || 'http://127.0.0.1:4173/index.html?v=5.383';
const branch = 'Zeppelin CZ s.r.o. – Znojemská 82, 586 01 Jihlava';
const known = {id:'known-quarterly', vc:'KNOWN-001', typ:'JLG 450 AJ', rok:'2022', umisteni:branch, mh:'1234', chargerPresent:'ANO', socket230Present:'ANO', datum:'2026-08-01', savedAt:'2026-08-01T10:00:00.000Z'};

async function createPage(browser, viewport, userAgent){
  const context = await browser.newContext({viewport, userAgent, serviceWorkers:'block'});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort('internetdisconnected');
  });
  await context.addInitScript(row => {
    localStorage.setItem('ctvrtletni_protokoly_local', JSON.stringify([row]));
    localStorage.removeItem('liftcontrol_quarterly_protocol_draft_v2');
  }, known);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(baseUrl, {waitUntil:'domcontentloaded'});
  return {context,page,errors};
}

async function openWizard(page){
  await page.getByRole('button', {name:/Nový protokol čtvrtletní kontroly/}).click();
  await page.locator('#wizard.show').waitFor();
}

async function boxesDoNotOverlap(page, selectors){
  const boxes = [];
  for(const selector of selectors){
    const box = await page.locator(selector).boundingBox();
    assert.ok(box, `${selector} is not visible`);
    boxes.push({selector,...box});
  }
  for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i], b=boxes[j];
    const overlap = a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y;
    assert.equal(overlap,false,`${a.selector} overlaps ${b.selector}`);
  }
}

(async () => {
  const browser = await chromium.launch({headless:true, executablePath:edge});
  const iphoneUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 Version/16.0 Mobile/15E148 Safari/604.1';
  const small = await createPage(browser, {width:375,height:667}, iphoneUa);
  const {page} = small;
  await openWizard(page);
  assert.equal(await page.locator('#title').textContent(), 'Výrobní číslo');
  assert.equal(await page.locator('#suggestHost .suggest-item').count(), 0, 'Suggestions must stay closed when the step appears');

  await page.locator('#mainInput').click();
  assert.equal(await page.locator('#suggestHost .suggest-item').count(), 0, 'Empty focused field must not show unrelated suggestions');
  await page.locator('#mainInput').fill('KNOWN');
  await page.locator('#suggestHost .suggest-item').waitFor();
  assert.equal(await page.locator('#suggestHost .suggest-item').count(), 1, 'Known serial must be offered once');
  await page.locator('#suggestHost .suggest-item').click();
  assert.equal(await page.locator('#suggestHost .suggest-item').count(), 0, 'Suggestion list must close immediately after selection');
  const filled = await page.evaluate(() => ({typ:rec.typ,rok:rec.rok,umisteni:rec.umisteni,mh:rec.mh,charger:rec.chargerPresent,socket:rec.socket230Present}));
  assert.deepEqual(filled, {typ:'JLG 450 AJ',rok:'2022',umisteni:branch,mh:'1234',charger:'ANO',socket:'ANO'});

  await page.waitForTimeout(180);
  await page.locator('#nextBtn').click();
  assert.equal(await page.locator('#title').textContent(), 'Typ zařízení');
  assert.equal(await page.locator('#mainInput').inputValue(), 'JLG 450 AJ');
  assert.equal(await page.locator('#suggestHost .suggest-item').count(), 0, 'Autofill must not open model suggestions');
  await page.locator('#mainInput').click();
  await page.locator('#suggestHost .suggest-item').first().waitFor();
  const modelSuggestions = await page.locator('#suggestHost .suggest-item').allTextContents();
  assert.ok(modelSuggestions.every(text => /jlg|450/i.test(text)), 'Model suggestions must match the current text');
  await page.locator('#prevStepBtn').click();
  assert.equal(await page.locator('#title').textContent(), 'Výrobní číslo');
  assert.equal(await page.locator('#suggestHost .suggest-item').count(), 0, 'Back navigation must keep suggestions closed');

  await page.locator('#mainInput').focus();
  await page.setViewportSize({width:375,height:320});
  await page.waitForTimeout(350);
  const modalBox = await page.locator('#wizard .modal-content').boundingBox();
  assert.ok(modalBox && modalBox.y >= 0 && modalBox.y + modalBox.height <= 321, 'Small iPhone modal must fit the visual viewport');
  const inputBox = await page.locator('#mainInput').boundingBox();
  assert.ok(inputBox && inputBox.y >= 0 && inputBox.y + inputBox.height <= 320, 'Focused input must remain visible above the keyboard viewport');
  await page.locator('#wizard .wizard-shell').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await boxesDoNotOverlap(page, ['#closeWizardBtn','#prevStepBtn','#draftQuarterlyBtn','#previewQuarterlyBtn','#nextBtn']);

  await page.setViewportSize({width:430,height:932});
  await page.waitForTimeout(150);
  let box = await page.locator('#wizard .modal-content').boundingBox();
  assert.ok(box && box.y >= 0 && box.y + box.height <= 933, 'Large iPhone modal must fit');
  await small.context.close();

  const unknown = await createPage(browser, {width:768,height:1024}, iphoneUa.replace('iPhone','iPad'));
  await openWizard(unknown.page);
  await unknown.page.locator('#mainInput').fill('UNKNOWN-999');
  await unknown.page.locator('#nextBtn').click();
  assert.equal(await unknown.page.locator('#title').textContent(), 'Typ zařízení');
  assert.equal(await unknown.page.locator('#mainInput').inputValue(), '', 'Unknown serial must allow manual model entry');
  box = await unknown.page.locator('#wizard .modal-content').boundingBox();
  assert.ok(box && box.y >= 0 && box.y + box.height <= 1025, 'iPad modal must fit');
  await unknown.context.close();

  const desktop = await createPage(browser, {width:1440,height:900});
  await openWizard(desktop.page);
  await desktop.page.evaluate(() => {
    window.saveProtocol = async record => ({local:true,cloud:true,record});
    applyProtocolDefaultsFromSerial('KNOWN-001');
    rec.vc='KNOWN-001'; rec.typ=rec.typ||'JLG 450 AJ'; rec.chargerPresent='ANO'; rec.socket230Present='ANO';
  });
  for(let guard=0; guard<120 && await desktop.page.locator('#wizard.show').count(); guard++){
    await desktop.page.locator('#nextBtn').click();
    await desktop.page.waitForTimeout(5);
  }
  assert.equal(await desktop.page.locator('#wizard.show').count(), 0, 'Desktop wizard must complete and save from start to finish');
  assert.equal(desktop.errors.length, 0, `Desktop page errors: ${desktop.errors.join(' | ')}`);
  assert.equal(small.errors.length, 0, `Small iPhone page errors: ${small.errors.join(' | ')}`);
  assert.equal(unknown.errors.length, 0, `iPad page errors: ${unknown.errors.join(' | ')}`);
  await desktop.context.close();
  await browser.close();
  console.log('quarterly-wizard-browser: serial-first, autofill, suggestions, responsive viewports and full save flow passed');
})().catch(err => { console.error(err); process.exit(1); });
