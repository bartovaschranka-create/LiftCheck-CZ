const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(path.join(process.env.CODEX_NODE_MODULES, 'playwright'));

const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:4189';
const photoUrl = 'http://127.0.0.1:4190/photo.png';

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.LIFTCHECK_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  });
  try {
    const context = await browser.newContext({serviceWorkers:'block'});
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if(url.href === photoUrl) return route.fulfill({path:path.join(root,'icon-192.png')});
      if(url.origin === origin && file.startsWith(root + path.sep) && fs.existsSync(file)){
        return route.fulfill({path:file});
      }
      return route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(origin + '/index.html');
    const saved = await page.evaluate(async photo => {
      firebaseAvailable = false;
      schedulePendingSyncBatch = () => {};
      syncProtocolToCloud = async record => cloudSaveResult(true, null, record);
      logAuditAction = async () => {};
      const name = 'Zkušební  Firma s.r.o.';
      openWizard();
      const id = rec.id;
      rec.vc = 'SYNTHETIC-ZOOM-01';
      rec.typ = 'gs-3246dc';
      rec.externalCustomer = true;
      rec.customerName = name;
      rec.B1 = 'NE';
      rec.B1_p = 'Viditelná zkušební závada';
      rec.poznamka = 'Zkušební komentář';
      rec.photos = {[PHOTO_STEPS[0].photoKey]:{url:photo}};
      const storagePath = STORAGE_PREFIX + '/' + id + '/issue_C1_1.jpg';
      rec.issuePhotos = {B1:Array.from({length:4},()=>({url:photo})), C1:[{path:storagePath}]};
      const photos = JSON.stringify([rec.photos, rec.issuePhotos]);
      stepIndex = getStepsForRecord(rec).length - 1;
      showStep();
      await nextStep();
      const index = getStepsForRecord(rec).findIndex(step => step.k === 'externalCustomer');
      openWizard();
      stepIndex = index;
      showStep();
      const quarterlyOptions = Array.from(document.querySelectorAll('#protocolCustomerNames option'), option => option.value);
      closeWizard();
      openWizard(id);
      const saveVisibleAtStart = !document.getElementById('editQuarterlySaveBtn').classList.contains('hidden');
      stepIndex = getStepsForRecord(rec).findIndex(step => step.k === 'typ');
      showStep();
      document.getElementById('mainInput').value = 'GS-3246DC';
      await nextStep();
      stepIndex = 0;
      showStep();
      await saveQuarterlyEditedProtocolFromWizard();
      const quarterly = loadLocalData().find(row => row.id === id);
      const history = findProtocolsByMachine(quarterly.vc);

      openRevizeForm();
      const revisionId = currentRevizeDraft.id;
      document.getElementById('rz_vyrobni_cislo').value = quarterly.vc;
      const lookup = revizeLatestMachine;
      revizeLatestMachine = serial => serial === quarterly.vc
        ? {serial, model:'gs-3246dc', deviceType:'scissor', maker:'Genie', year:'2022'}
        : lookup(serial);
      const findModelDefaults = revizeSameModelDefaults;
      revizeSameModelDefaults = () => ({});
      applyRevizeDefaultsFromSerial(quarterly.vc);
      const modelInput = document.getElementById('rz_model');
      const suggestedModel = modelInput.value;
      modelInput.value = 'GS-3246DC';
      modelInput.dispatchEvent(new Event('input', {bubbles:true}));
      window.lastRevizeSerialDefaultAt = 0;
      document.getElementById('nextRevizeStepBtn').click();
      revizeSameModelDefaults = findModelDefaults;
      const toggle = document.getElementById('rzExternalCustomer');
      toggle.click();
      const company = document.getElementById('rzCustomerName');
      const revisionOptions = Array.from(company.list.options, option => option.value);
      company.value = name.toUpperCase().replace(/ +/g, ' ');
      company.dispatchEvent(new Event('input', {bubbles:true}));
      const address = document.getElementById('rzCustomerAddress');
      address.value = 'Brno, Zkušební 42';
      address.dispatchEvent(new Event('input', {bubbles:true}));
      const norms = document.getElementById('rz_normy_revize');
      norms.dispatchEvent(new Event('input', {bubbles:true}));
      const savedRevisionAlerts = [];
      const alertBeforeSave = window.alert;
      window.alert = message => savedRevisionAlerts.push(message);
      await saveRevizeFromForm();
      window.alert = alertBeforeSave;
      if(!revizeData.some(row => row.id === revisionId)) throw new Error('Revision was not saved: ' + savedRevisionAlerts.join(' | '));
      closeRevizeForm();
      openRevizeForm(revisionId);
      const reopened = document.getElementById('rzExternalCustomer').checked;
      const reopenedName = document.getElementById('rzCustomerName').value;
      const reopenedModel = document.getElementById('rz_model').value;
      const reopenedAddress = document.getElementById('rzCustomerAddress').value;
      const revisionHtml = revizePaperHtml(window.currentRevizeDraft);
      const deduplicated = customerNameSuggestions().filter(value => value.toLowerCase().startsWith('zkušební'));
      closeRevizeForm();
      storageAvailable = true;
      storage = {ref: requestedPath => ({
        getDownloadURL: async () => {
          if(requestedPath !== storagePath) throw new Error('Unexpected photo path.');
          return photo;
        }
      })};
      openPreviewById(id);
      return {quarterly, photos, quarterlyOptions, revisionOptions, reopened, reopenedName,
        reopenedModel, reopenedAddress, revisionHtml, suggestedModel, deduplicated, saveVisibleAtStart, historyId:history[0]?.id};
    }, photoUrl);
    assert.ok(saved.saveVisibleAtStart);
    assert.equal(saved.quarterly.typ,'GS-3246DC');
    assert.equal(saved.historyId,saved.quarterly.id);
    assert.equal(JSON.stringify([saved.quarterly.photos,saved.quarterly.issuePhotos]),saved.photos);
    assert.equal(saved.quarterly.poznamka,'Zkušební komentář');
    assert.ok(saved.quarterlyOptions.includes('Zkušební  Firma s.r.o.'));
    assert.ok(saved.revisionOptions.includes('Zkušební  Firma s.r.o.'));
    assert.equal(saved.reopened,true);
    assert.equal(saved.reopenedName,'ZKUŠEBNÍ FIRMA S.R.O.');
    assert.equal(saved.reopenedAddress,'Brno, Zkušební 42');
    assert.ok(saved.revisionHtml.includes('ZKUŠEBNÍ FIRMA S.R.O., Brno, Zkušební 42'), 'The revision print must show the external company and address');
    assert.equal(saved.suggestedModel,'gs-3246dc');
    assert.equal(saved.reopenedModel,'GS-3246DC');
    assert.deepEqual(saved.deduplicated,['Zkušební  Firma s.r.o.']);

    const documents = [];
    for(const button of ['printPreviewBtn', 'savePreviewBtn']){
      const [output] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('#' + button).click()
      ]);
      await output.locator('.paper').waitFor();
      await output.waitForLoadState('load');
      await output.emulateMedia({media:'print'});
      const content = await output.evaluate(async () => {
        try {
          await waitPrintAssets();
        } catch(error) {
          const images = Array.from(document.images, image => [image.src,image.complete,image.naturalWidth]);
          throw new Error(error.message + ' ' + JSON.stringify(images));
        }
        const paper = document.querySelector('.paper');
        return {
          html: paper.outerHTML,
          images: Array.from(paper.querySelectorAll('img'), image => image.naturalWidth),
          marks: Array.from(paper.querySelectorAll('.mark-box.checked'), mark => getComputedStyle(mark,'::after').content)
        };
      });
      assert.equal(content.images.length,6);
      assert.ok(content.images.every(width => width > 0));
      assert.ok(content.marks.length > 0 && content.marks.every(mark => mark === '"X"'));
      assert.match(content.html,/Strana 3 z 3/);
      const pdf = await output.pdf({preferCSSPageSize:true,printBackground:true});
      assert.equal((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length,3);
      documents.push(content.html);
      await output.close();
    }
    assert.equal(documents[0],documents[1]);

    const [brokenPrint] = await Promise.all([
      page.waitForEvent('popup'),
      page.evaluate(() => {
        currentPreview.photos = {[PHOTO_STEPS[0].photoKey]:{url:'https://fixtures.invalid/missing.png'}};
        currentPreview.issuePhotos = {};
        printCurrent();
      })
    ]);
    await brokenPrint.locator('.paper').waitFor();
    await brokenPrint.evaluate(async () => {
      window.print = () => { window.printInvoked = true; };
      await prepareAndPrint();
    });
    assert.match(await brokenPrint.locator('.print-error').textContent(), /nepodařilo načíst/);
    assert.equal(await brokenPrint.evaluate(() => Boolean(window.printInvoked)),false);
    await brokenPrint.close();

    await page.reload();
    const persisted = await page.evaluate(async () => {
      closePreview();
      const names = customerNameSuggestions();
      openWizard();
      rec.poznamka = 'Rozepsaný koncept';
      saveQuarterlyDraft('manual-button');
      navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
      const updateDeferred = document.getElementById('appUpdateBanner').classList.contains('show');
      return {names, updateDeferred, draft:loadQuarterlyDraft()?.poznamka};
    });
    assert.ok(persisted.names.includes('Zkušební  Firma s.r.o.'));
    assert.equal(persisted.updateDeferred,true);
    assert.equal(persisted.draft,'Rozepsaný koncept');
    assert.equal(await page.locator('#wizard.show').count(),1);

    const cameraFallback = await page.evaluate(async () => {
      let stops = 0;
      const camera = navigator.mediaDevices;
      if(!camera) return null;
      const nativeGetUserMedia = camera.getUserMedia;
      const input = document.createElement('input');
      input.type = 'file';
      input.setAttribute('capture','environment');
      document.body.append(input);
      try{
        camera.getUserMedia = async () => ({
          getVideoTracks: () => [{getCapabilities: () => ({})}],
          getTracks: () => [{stop: () => { stops++; }}]
        });
        await openProtocolZoomCamera(input);
        const dialog = document.querySelector('dialog[open]');
        const message = dialog.querySelector('[role="status"]').textContent;
        dialog.close();
        await new Promise(resolve => dialog.addEventListener('close', resolve, {once:true}));
        return {message, stopped:stops>0, nativeCapture:input.getAttribute('capture')};
      }finally{
        camera.getUserMedia = nativeGetUserMedia;
        input.remove();
      }
    });
    assert.ok(cameraFallback);
    assert.match(cameraFallback.message,/systémový fotoaparát/);
    assert.ok(cameraFallback.stopped);
    assert.equal(cameraFallback.nativeCapture,'environment');

    assert.deepEqual(errors,[]);
    console.log('protocol workflows: saved customers, stable ID, history, preserved photo data and matching three-page print/PDF passed');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
