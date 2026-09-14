const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit,devices}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const wk=process.env.LIFTCHECK_TEST_ENGINE==='webkit';const browser=wk?null:await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const profile of wk?['iPhone 13']:['Pixel 7']){
  const options={...devices[profile],serviceWorkers:'block'};
  const context=wk?await webkit.launchPersistentContext(fs.mkdtempSync(path.join(require('node:os').tmpdir(),'liftcheck-forms-')),options):await browser.newContext(options);
  try{
   await context.route('**/*',route=>{const u=new URL(route.request().url());const p=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.abort();});
   const page=await context.newPage();page.on('dialog',d=>d.accept());await page.goto('http://127.0.0.1:4179/index.html');
   const result=await page.evaluate(async()=>{
    firebaseAvailable=false;await restorePhotoForms();
    const c=document.createElement('canvas');c.width=1600;c.height=1200;const x=c.getContext('2d');const gradient=x.createLinearGradient(0,0,1600,1200);gradient.addColorStop(0,'red');gradient.addColorStop(1,'blue');x.fillStyle=gradient;x.fillRect(0,0,1600,1200);x.font='80px sans-serif';x.fillStyle='white';x.fillText('TEST PHOTO',100,500);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.95)),compressed=await compressPhoto(new File([blob],'photo.jpg',{type:blob.type}));
    window.testCompressed=compressed;
    const originalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(['liftcheck_faults_local','liftcheck_repairs_local'].includes(k))throw new DOMException('quota','QuotaExceededError');return originalSet.call(this,k,v);};
    const saved=[];
    for(const kind of ['fault','repair'])for(const count of [0,2,4]){
     const record={id:kind+'-'+count,type:'TEST',serial:'TEST-'+count,date:'2026-09-14',description:'TEST',work:'TEST',photos:Array.from({length:count},(_,i)=>({...compressed,id:'p'+i}))};
     const one=await(kind==='fault'?saveFaultRecord(record):saveRepairRecord(record));if(!one.local||one.cloud)throw Error('Offline must persist in IDB: '+kind+' '+count+' '+one.error);
     const two=await(kind==='fault'?saveFaultRecord(record):saveRepairRecord(record));if(!two.local)throw Error('Repeated save failed');saved.push(record.id);
    }
    await photoFormWrites;
    const dbInstance=await openFaultPhotoDb();const rows=await new Promise(r=>{const req=dbInstance.transaction(FAULT_PHOTO_STORE_NAME).objectStore(FAULT_PHOTO_STORE_NAME).getAll();req.onsuccess=()=>r(req.result);});
    const photos=rows.filter(r=>r.blob);if(photos.some(r=>r.dataUrl||!(r.blob instanceof Blob)))throw Error('Store must contain only Blob image payloads');
    const forms=rows.filter(r=>r.record);if(forms.some(r=>JSON.stringify(r.record).includes('data:image')))throw Error('Record duplicated image bytes');
    Storage.prototype.setItem=originalSet;
    return {before:blob.size,after:compressed.bytes,photos:photos.length,forms:forms.length,saved};
   });
   assert.equal(result.photos,12);assert.equal(result.forms,6);assert.ok(result.after<result.before);console.log(profile+' compression bytes '+result.before+' -> '+result.after);
   await page.reload();await page.evaluate(async()=>{firebaseAvailable=false;await restorePhotoForms();});
   const restored=await page.evaluate(async()=>{
    const fault=loadLocalFaults().find(r=>r.id==='fault-2'),repair=loadLocalRepairs().find(r=>r.id==='repair-2');
    if((await hydrateFaultPhotos(fault)).record.photos.some(p=>!p.dataUrl))throw Error('Offline photo missing');
    openRepairModal(repair);if(!currentRepairPhotos.every(p=>p.dataUrl))throw Error('Repair photos not displayed after reload');
    firebaseAvailable=true;db={};storageAvailable=true;uploadDataUrl=async p=>'https://test.invalid/'+p;setAndVerifyFirestore=async(c,id,record)=>{if(record.photos.some(p=>!p.url))throw Error('Cloud photos missing');};
    const a=await saveFaultRecord(fault),b=await saveRepairRecord(repair);await photoFormWrites;
    return {fault:a.cloud,repair:b.cloud,localBytes:JSON.stringify([localStorage.getItem('liftcheck_faults_local'),localStorage.getItem('liftcheck_repairs_local')]).includes('data:image')};
   });
   assert.deepEqual(restored,{fault:true,repair:true,localBytes:false});
   const fallback=await page.evaluate(async()=>{
    const originalPersist=persistPhotoForm,originalWrite=setAndVerifyFirestore;
    const photos=(await hydrateFaultPhotos(loadLocalFaults().find(r=>r.id==='fault-4'))).record.photos.slice(0,2);
    persistPhotoForm=async()=>{throw new DOMException('IDB quota','QuotaExceededError');};
    try{
     const saved=await saveFaultRecord({id:'cloud-without-local',type:'TEST',serial:'TEST',description:'TEST',photos});
     setAndVerifyFirestore=async()=>{throw Error('server unavailable');};
     const failed=await saveFaultRecord({id:'neither-store',type:'TEST',serial:'TEST',description:'TEST',photos});
     return {cloud:saved.cloud,local:saved.local,failedLocal:failed.local,failedCloud:failed.cloud,retained:failed.record.photos.every(p=>p.dataUrl)};
    }finally{persistPhotoForm=originalPersist;setAndVerifyFirestore=originalWrite;}
   });
   assert.deepEqual(fallback,{cloud:true,local:false,failedLocal:false,failedCloud:false,retained:true});
   await page.evaluate(async()=>{
    firebaseAvailable=false;closeModal(document.getElementById('repairModal'));
    const r={...revizeDefaultRecord(),id:'capacity-test',model:'GS-1932',vyrobni_cislo:'TEST-CAP',nosnost:'230 kg'};
    await saveLocalRevize([r]);revizeData=loadLocalRevize();openRevizeForm(r.id);if(window.currentRevizeDraft.id!==r.id)throw Error('Must edit saved revision');
   });
   for(let i=0;i<35&&!await page.locator('#rz_nosnost').isVisible();i++)await page.locator('#nextRevizeStepBtn').click();
   await page.locator('#rz_nosnost').fill('');assert.equal(await page.locator('#rz_nosnost').inputValue(),'');
   await page.locator('#rz_nosnost').fill('175');
   const capacity=await page.evaluate(async()=>{const r=collectRevizeDraft();await saveLocalRevize([r]);return loadLocalRevize().find(x=>x.id===r.id).nosnost;});assert.match(capacity,/175/);
   await page.evaluate(()=>{for(const m of document.querySelectorAll('.modal.show'))closeModal(m);const input=document.createElement('input');input.id='test-history';document.body.append(input);attachSmartSuggest(input,()=>['c','mistake',MODELS[0]]);});
   const input=page.locator('#test-history');await input.fill('c');await page.waitForTimeout(250);await input.press('ArrowDown');await input.press('Delete');
   assert.ok((await page.evaluate(()=>localStorage.getItem('liftcheck_suggest_hidden:test-history'))).includes('c'));
   await input.fill('mistake');await page.waitForTimeout(250);await page.locator('#test-history + .smart-suggest-box button').click();assert.equal(await input.inputValue(),'mistake');
   await input.fill(await page.evaluate(()=>MODELS[0]));await page.waitForTimeout(250);assert.equal(await page.locator('#test-history + .smart-suggest-box button').count(),0);
   await input.press('ArrowDown');await input.press('Enter');assert.equal(await page.locator('#test-history + .smart-suggest-box.show').count(),0);
   await page.reload();await page.evaluate(()=>{const input=document.createElement('input');input.id='test-history';document.body.append(input);attachSmartSuggest(input,()=>['c','mistake']);});await page.locator('#test-history').fill('mistake');await page.waitForTimeout(250);assert.equal(await page.locator('#test-history + .smart-suggest-box.show').count(),0);
   console.log(profile+' forms: offline quota, 0/2/4 photos, repeated save, reload/display/sync, capacity edit, Delete/mobile delete/catalogue protection passed');
  }finally{await context.close();}
 }}finally{await browser?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
