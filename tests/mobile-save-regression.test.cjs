const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium, devices} = require(path.join(process.env.CODEX_NODE_MODULES, 'playwright'));
const root = path.resolve(__dirname, '..');
const row = {id:'mobile-test', vc:'TEST-001', typ:'JLG 450 AJ', datum:'2026-09-09', umisteni:'Zeppelin CZ s.r.o. – Znojemská 82, 586 01 Jihlava', rok:'2022'};
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try {
    for(const name of ['iPhone 13','iPad (gen 7)','Pixel 7','Desktop']){
      const context = await browser.newContext({...name==='Desktop'?{viewport:{width:1440,height:900}}:devices[name],serviceWorkers:'block'});
      try {
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if(url.origin !== 'http://127.0.0.1:4179') return route.abort();
          const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
          if(!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404,body:''});
          return route.fulfill({path:file});
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        page.on('dialog', d => d.accept());
        await page.goto('http://127.0.0.1:4179/index.html');
        await page.evaluate(r => {firebaseAvailable=false; localStorage.clear(); data=[r]; saveLocalData(data); showSection('archive'); render();}, row);
        for(const width of name==='iPhone 13'?[320,375,390,844]:[await page.evaluate(()=>innerWidth)]){
          await page.setViewportSize({width,height:900});
          const clipped = await page.evaluate(()=>Array.from(document.querySelectorAll('#section-archive *')).filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.height&&(b.right>innerWidth+1||b.left < -1);}).map(e=>e.className));
          assert.deepEqual(clipped,[],`${name} ${width}: clipped archive`);
        }
        await page.evaluate(()=>showSection('home'));
        await page.getByRole('button',{name:/Nový protokol čtvrtletní kontroly/}).click();
        await page.locator('#mainInput').fill(row.vc);
        for(let i=0;i<7;i++) await page.locator('#nextBtn').click();
        assert.match(await page.locator('#title').textContent(),/Umístění/);
        await page.locator('#mainInput').fill('TEST LOCATION');
        await page.waitForTimeout(400);
        await page.reload();
        await page.evaluate(()=>{firebaseAvailable=false;continueQuarterlyDraftFromArchive();});
        assert.match(await page.locator('#title').textContent(),/Umístění/);
        assert.equal(await page.locator('#mainInput').inputValue(),'TEST LOCATION');
        const quota = await page.evaluate(async()=>{
          stepIndex=getStepsForRecord(rec).length-1; showStep(); saveQuarterlyDraft('test');
          const id=rec.id, original=Storage.prototype.setItem;
          Storage.prototype.setItem=function(k,v){if(k==='ctvrtletni_protokoly_local')throw new DOMException('test quota','QuotaExceededError');return original.call(this,k,v);};
          try{await nextStep();return {open:els.wizard.classList.contains('show'),draft:loadQuarterlyDraft()?.id===id,stored:loadLocalData().some(r=>r.id===id)};}
          finally{Storage.prototype.setItem=original;}
        });
        assert.deepEqual(quota,{open:true,draft:true,stored:false});
        await page.evaluate(async()=>{await nextStep();});
        assert.equal(await page.locator('#wizard.show').count(),0,'Successful offline retry closes wizard');
        await page.reload();
        assert.equal(await page.evaluate(()=>loadLocalData().some(r=>r.umisteni==='TEST LOCATION')),true,'Offline protocol survives reload');
        await page.evaluate(()=>{firebaseAvailable=false;showSection('faults');});
        await page.getByRole('button',{name:'Přidat hlášení',exact:true}).click();
        await page.locator('#faultType').fill('TEST');
        await page.locator('#faultSerial').fill('MOBILE-PHOTO');
        await page.locator('#faultDesc').fill('Retain photograph on IDB error');
        await page.locator('#faultPhotoInput').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')});
        await page.getByText(/Připraveno 1\/4 fotek/).waitFor();
        const photoFailure=await page.evaluate(async()=>{
          const original=putFaultPhotoData;
          window.putFaultPhotoData=async()=>{throw new DOMException('test IDB quota','QuotaExceededError');};
          try{await saveFaultFromForm();return {open:!document.getElementById('faultFormWrap').classList.contains('hidden'),photos:currentFaultPhotos.length,hasData:!!currentFaultPhotos[0]?.dataUrl,stored:loadLocalFaults().some(r=>r.serial==='MOBILE-PHOTO')};}
          finally{window.putFaultPhotoData=original;}
        });
        assert.deepEqual(photoFailure,{open:true,photos:1,hasData:true,stored:false});
        await page.evaluate(()=>saveFaultFromForm());
        await page.reload();
        assert.equal(await page.evaluate(async()=>{const r=loadLocalFaults().find(r=>r.serial==='MOBILE-PHOTO');return !!(await hydrateFaultPhotos(r)).record.photos[0]?.dataUrl;}),true,'Retry persists actual photograph across reload');
        assert.deepEqual(errors,[],`${name} page errors`);
        console.log(`mobile-save-regression: ${name} passed`);
      } finally {await context.close();}
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
