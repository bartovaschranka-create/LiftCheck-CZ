const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(path.join(process.env.CODEX_NODE_MODULES, 'playwright'));

const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:4189';

(async () => {
  const browser = await chromium.launch({
    executablePath:process.env.LIFTCHECK_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  });
  try {
    const context = await browser.newContext({
      serviceWorkers:'block', hasTouch:true, isMobile:true, viewport:{width:820,height:1180}
    });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      return url.origin === origin && file.startsWith(root + path.sep) && fs.existsSync(file)
        ? route.fulfill({path:file}) : route.abort();
    });
    const page = await context.newPage();
    await page.goto(origin + '/index.html');
    await page.evaluate(() => {
      firebaseAvailable = false;
      window.alerts = [];
      window.alert = message => alerts.push(message);
      clearTimeout(pendingSyncTimer);
      schedulePendingSyncBatch = () => {};
      openRevizeForm();
    });
    const next = page.locator('#nextRevizeStepBtn');
    const initialProgress = await page.locator('#revizeStepProgress').textContent();
    assert.match(initialProgress,/^1\/11$/);
    assert.equal(await page.locator('#saveRevizeBtn').isVisible(),false);
    await next.dispatchEvent('pointerup',{pointerType:'touch'});
    assert.equal(await page.locator('#revizeStepProgress').textContent(), initialProgress);
    for(let step=0; step<4; step++){
      const before = await page.locator('#revizeStepProgress').textContent();
      await next.tap();
      assert.notEqual(await page.locator('#revizeStepProgress').textContent(),before);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'revizeStepbar');
    }

    await page.evaluate(() => {
      closeRevizeForm();
      const norm = normaPodleRokuVyroby('2019');
      window.revisionBefore = {
        ...revizeDefaultRecord(), id:'zz-edit', protokol:'ZZ-123',
        vyrobni_cislo:'SYNTHETIC-ZZ', rok_vyroby:'2019', norma:norm,
        normy_revize:norm+'; Nezávislá norma; NV č. 193/2022 Sb.',
        photos:[{url:'https://example.invalid/unchanged.jpg'}],
        attachment:{name:'synthetic.pdf'}, signature:'stored-signature',
        electro:{legacy:{value:'retain me',note:'old note'}}
      };
      revizeData = [cloneForCloudSync(revisionBefore)];
      openRevizeForm('zz-edit');
    });
    assert.equal(await page.locator('#saveRevizeBtn').textContent(),'Uložit změny');
    for(let step=0; step<5 && !(await page.locator('#rz_norma').isVisible()); step++) await next.tap();
    assert.ok(await page.locator('#rz_norma').isVisible(),JSON.stringify(await page.evaluate(()=>({step:revizeStepIndex, progress:document.getElementById('revizeStepProgress').textContent, field:document.getElementById('rz_norma').parentElement.outerHTML.slice(0,250), focus:document.activeElement.id, alerts:window.alerts}))));
    await page.locator('#rz_norma').fill('ČSN EN 280 – doložená norma');
    const displayed = await page.locator('#rz_normy_revize').inputValue();
    assert.equal(displayed,'ČSN EN 280 – doložená norma; Nezávislá norma; NV č. 193/2022 Sb.');
    await page.locator('#saveRevizeBtn').tap();
    await page.waitForFunction(()=>!revizeSaveInProgress);
    const saved = await page.evaluate(() => {
      const row = loadLocalRevize().find(value=>value.id==='zz-edit');
      return {row, before:revisionBefore, printed:row && revizePaperHtml(row)};
    });
    assert.ok(saved.row, 'Existing revision must be persisted under its original ID');
    for(const field of ['attachment','signature','photos','electro','protokol','vyrobni_cislo'])
      assert.deepEqual(saved.row[field],saved.before[field]);
    assert.equal(saved.row.normy_revize,displayed);
    assert.ok(saved.printed.includes(displayed));

    await page.evaluate(() => {
      closeRevizeForm();
      revizeData=loadLocalRevize();
      openRevizeForm('zz-edit');
    });
    assert.equal(await page.locator('#rz_normy_revize').inputValue(),displayed);
    await page.evaluate(() => {
      closeRevizeForm();
      openRevizeForm();
      const norm = document.getElementById('rz_norma');
      norm.value='Norma konceptu';
      norm.dispatchEvent(new Event('input',{bubbles:true}));
      document.getElementById('rz_vyrobni_cislo').value='SYNTHETIC-DRAFT';
    });
    await page.evaluate(()=>saveRevizeDraftFromForm());
    const draft = await page.evaluate(()=>loadLocalRevize().find(row=>row.vyrobni_cislo==='SYNTHETIC-DRAFT'));
    assert.ok(draft?.draft);
    assert.match(draft.normy_revize,/Norma konceptu/);
    await page.evaluate(id => {
      closeRevizeForm();
      revizeData=loadLocalRevize();
      openRevizeForm(id);
    },draft.id);
    assert.match(await page.locator('#rz_normy_revize').inputValue(),/Norma konceptu/);

    const orders = await page.evaluate(async () => {
      closeRevizeForm();
      partsData=[];
      saveLocalParts([]);
      const ids=[];
      for(const count of [1,3,5]){
        openPartsModal();
        openPartForm();
        document.getElementById('partType').value='Zkušební plošina';
        document.getElementById('partSerial').value='SYNTHETIC-PARTS';
        document.getElementById('partEnteredBy').selectedIndex=1;
        document.getElementById('partName').value='Díl 1';
        for(let index=1; index<count; index++){
          const row=appendPartItem();
          row.querySelector('[data-item-name]').value='Díl '+(index+1);
        }
        if(count===5) currentPartPhotos=[{dataUrl:'data:image/png;base64,AA=='}];
        await savePartFromForm();
        const record=loadLocalParts().find(row=>row.items?.length===count);
        if(!record) throw new Error('Požadavek nebyl uložen: '+alerts.at(-1));
        ids.push(record.id);
      }
      return ids;
    });
    assert.equal(new Set(orders).size,3);
    const orderId = orders[2];
    const editOrder = async (state, quantity) => page.evaluate(async ({id,state,quantity}) => {
      partsData=loadLocalParts();
      openPartForm(id);
      const first=document.querySelector('#partItems [data-part-item-id]');
      first.querySelector('[data-item-quantity]').value=4;
      const status=first.querySelector('[data-item-status]');
      status.value=state;
      status.dispatchEvent(new Event('change',{bubbles:true}));
      first.querySelector('[data-item-delivered]').value=quantity;
      await savePartFromForm();
      return loadLocalParts().find(row=>row.id===id);
    },{id:orderId,state,quantity});
    let order = await editOrder('ordered',2);
    assert.equal(order.items[0].status,'ordered');
    assert.equal(order.items[0].deliveredQuantity,2);
    order = await editOrder('ordered',5);
    assert.equal(order.items[0].deliveredQuantity,2);
    order = await editOrder('unavailable',2);
    assert.equal(order.items[0].status,'unavailable');
    order = await editOrder('ordered',2);
    assert.equal(order.items[0].status,'ordered');
    order = await editOrder('ordered',4);
    assert.equal(order.items[0].status,'delivered');
    assert.equal(order.photos[0].dataUrl,'data:image/png;base64,AA==');
    const output = await page.evaluate(id => {
      const record=loadLocalParts().find(row=>row.id===id);
      let print;
      openBatchPrintWindow = options => {print=options.bodyHtml;};
      printPartRequest(record);
      openHistoryModal('SYNTHETIC-PARTS');
      const history=els.historyBody.textContent;
      const legacy={id:'old-part',partName:'Původní díl',partNumber:'PN-OLD',ordered:true};
      printPartRequest(legacy);
      const legacyPrint=print;
      printPartRequest(record);
      return {print,history,legacyPrint,legacyItems:getPartItems(legacy),count:loadLocalParts().length};
    },orderId);
    assert.equal(output.count,3);
    assert.equal(output.legacyItems.length,1);
    assert.match(output.legacyPrint,/PN-OLD.*Původní díl/);
    assert.match(output.print,/Díl 5/);
    assert.match(output.print,/4\/4 ks/);
    assert.match(output.history,/Díl 5/);

    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(()=>exportBackup());
    const download = await downloadPromise;
    const backup = JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    const exported = backup.collections.nahradniDily.find(row=>row.id===orderId);
    assert.deepEqual(exported.items,order.items);
    assert.deepEqual(exported.photos,order.photos);

    const cloud = await page.evaluate(async id => {
      firebaseAvailable=true;
      storageAvailable=true;
      db={collection:()=>({doc:id=>({id})})};
      storage={};
      readFirestoreDocument=async()=>({exists:false});
      uploadDataUrl=async()=> 'https://example.invalid/photo.png';
      const writes=[];
      setAndVerifyFirestore=async(collection,recordId,row)=>writes.push({collection,recordId,row});
      await retryPendingPartSync();
      await retryPendingPartSync();
      return writes.filter(write=>write.recordId===id);
    },orderId);
    assert.equal(cloud.length,1);
    assert.equal(cloud[0].row.items.length,5);
    assert.equal(cloud[0].row.items[0].deliveredQuantity,4);
    assert.equal(cloud[0].row.photos[0].url,'https://example.invalid/photo.png');
    console.log('production-revision-parts: tablet navigation, norm draft/save/print, stable revision ID and attachments, multi-item local/print/history and mocked retry passed');
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
