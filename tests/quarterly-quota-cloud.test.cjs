const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium, webkit, devices} = require(path.join(process.env.CODEX_NODE_MODULES, 'playwright'));
const root = path.resolve(__dirname, '..');
// Every HTTP request is fulfilled locally or aborted, including Firebase requests.
// No fixture request can reach a production database or photo bucket.
function normalizedFirestore(value){
  if(!value || typeof value !== 'object') return value;
  if(Array.isArray(value)) return value.map(normalizedFirestore);
  const out=Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,normalizedFirestore(v)]));
  if(out.nullValue === null) out.nullValue='NULL_VALUE';
  if(out.arrayValue?.values?.length === 0) out.arrayValue={};
  if(out.mapValue?.fields && Object.keys(out.mapValue.fields).length === 0) out.mapValue={};
  return out;
}
(async()=>{
  const useWebKit=process.env.LIFTCHECK_TEST_ENGINE==='webkit';
  const browser=await (useWebKit ? webkit.launch({headless:true}) : chromium.launch({headless:true,executablePath:process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
  try{
    for(const device of useWebKit ? ['iPhone 13','iPad (gen 7)'] : ['iPhone 13','iPad (gen 7)','Pixel 7']){
      let cases=['success','photo-success','photo-failure','patch-failure','read-failure','content-mismatch','missing-photo-failure','compact-local','real-quota'];
      if(device==='iPhone 13') cases.push('delayed-confirmation');
      if(process.env.LIFTCHECK_TEST_CASE) cases=cases.filter(s=>s===process.env.LIFTCHECK_TEST_CASE);
      for(const scenario of cases){
        const context=await browser.newContext({...devices[device],serviceWorkers:'block'});
        try{
          let mode=scenario, document=null, writes=0, reads=0, releaseRead;
          const readGate=new Promise(resolve=>{releaseRead=resolve;});
          await context.route('**/*',async route=>{
            const url=new URL(route.request().url());
            if(url.origin==='http://127.0.0.1:4179'){
              const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
              if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
              return route.fulfill({path:file});
            }
            if(url.hostname==='firestore.googleapis.com' && url.pathname.endsWith('/documents/protokoly_test/quota-regression')){
              if(route.request().method()==='PATCH'){
                writes++;
                if(mode==='patch-failure')return route.fulfill({status:503,body:'simulated offline server'});
                document=route.request().postDataJSON();
                return route.fulfill({json:document});
              }
              if(route.request().method()==='GET'){
                reads++;
                if(mode==='delayed-confirmation')await readGate;
                if(mode==='read-failure')return route.fulfill({status:503,body:'lost acknowledgement'});
                const response=normalizedFirestore(document);
                if(mode==='content-mismatch')response.fields.techSignature={stringValue:'different signature'};
                return route.fulfill({json:response});
              }
            }
            return route.abort('internetdisconnected');
          });
          const page=await context.newPage(), errors=[], dialogs=[];
          page.on('pageerror',e=>errors.push(String(e)));
          page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
          await page.goto('http://127.0.0.1:4179/index.html');
          await page.evaluate(s=>{
            firebaseAvailable=false;localStorage.clear();data=[];
            window.logAuditAction=async()=>{};
            showSection('home');
            const photo=s.includes('photo') || s==='compact-local' || s==='real-quota';
            const record={id:'quota-regression',vc:'QUOTA-TEST',typ:'JLG 450 AJ',datum:'2026-09-10',rok:'2022',technik:'Test',techSignature:'data:image/png;base64,dGVzdA==',customerSignature:'data:image/png;base64,Y3VzdG9tZXI=',photos:{},issuePhotos:{},extraEmpty:[],extraNull:null};
            if(photo){record.photos[PHOTO_STEPS[0].photoKey]={dataUrl:'data:image/jpeg;base64,dGVzdA==',label:'test'};record.issuePhotos.test=[{dataUrl:'data:image/jpeg;base64,dGVzdDI=',label:'issue test'}];}
            if(s==='missing-photo-failure')record.photos[PHOTO_STEPS[0].photoKey]={path:'missing-photo.jpg',pendingUpload:true};
            openWizard(null,record);stepIndex=getStepsForRecord(rec).length-1;showStep();saveQuarterlyDraft('test');
            window.quotaBefore=JSON.stringify({photos:rec.photos,issuePhotos:rec.issuePhotos,signature:rec.techSignature});
            if(s==='real-quota'){
              let low=0,high=12*1024*1024;
              while(high-low>1){
                const size=Math.floor((low+high)/2);
                try{localStorage.setItem('quota-fill','x'.repeat(size));low=size;}
                catch(e){if(e.name!=='QuotaExceededError')throw e;high=size;window.realQuotaHit=true;}
              }
              localStorage.setItem('quota-fill','x'.repeat(low));
            }
            window.quotaOriginalSetItem=Storage.prototype.setItem;
            Storage.prototype.setItem=function(k,v){
              if(s!=='real-quota' && k==='ctvrtletni_protokoly_local' && (s!=='compact-local' || v.includes('data:image/jpeg')))throw new DOMException('The quota has been exceeded.','QuotaExceededError');
              return window.quotaOriginalSetItem.call(this,k,v);
            };
            window.failPhoto=s==='photo-failure';window.uploadedPhotoCount=0;
            storageAvailable=true;storage={ref:()=>({child:p=>({put:async()=>{if(window.failPhoto)throw new Error('storage/retry-limit-exceeded');window.uploadedPhotoCount++;},getDownloadURL:async()=> 'https://photos.invalid/'+encodeURIComponent(p)})})};
            firebaseAvailable=true;
          },scenario);
          if(scenario==='delayed-confirmation'){
            await page.evaluate(()=>{window.quotaSave=nextStep();});
            await page.waitForTimeout(16000);
            assert.equal(await page.locator('#wizard.show').count(),1,'Without local durability, 15s must not close the wizard');
            assert.equal(await page.locator('#nextBtn').isDisabled(),true);
            await page.evaluate(()=>closeWizardWithPrompt());
            assert.equal(await page.locator('#wizard.show').count(),1,'Escape/close cannot discard an in-flight cloud-only save');
            releaseRead();
            await page.evaluate(()=>window.quotaSave);
          }else await page.evaluate(()=>nextStep());
          if(scenario.endsWith('failure')||scenario==='content-mismatch'){
            assert.equal(await page.locator('#wizard.show').count(),1,`${scenario}: keep wizard`);
            assert.equal(await page.evaluate(()=>loadQuarterlyDraft()?.id),'quota-regression');
            assert.equal(await page.evaluate(()=>JSON.stringify({photos:rec.photos,issuePhotos:rec.issuePhotos,signature:rec.techSignature})===window.quotaBefore),true,'Retain original photo bytes and signatures on failure');
            assert.equal(await page.locator('#nextBtn').isDisabled(),false,'Retry remains available');
            if(scenario==='photo-failure'||scenario==='missing-photo-failure')assert.equal(writes,0,'Never commit a document with missing photos without a durable local copy');
            assert.ok(dialogs.some(t=>t.includes('nepodarilo potvrdit')));
            mode='success';await page.evaluate(s=>{window.failPhoto=false;if(s==='missing-photo-failure')rec.photos[PHOTO_STEPS[0].photoKey]={dataUrl:'data:image/jpeg;base64,dGVzdA=='};},scenario);
            await page.evaluate(()=>nextStep());
          }
          assert.equal(await page.locator('#wizard.show').count(),0,`${scenario}: verified retry/success closes wizard`);
          assert.equal(await page.evaluate(()=>loadQuarterlyDraft()),null);
          assert.ok(writes>=1 && reads>=1);
          assert.equal(document.fields.id.stringValue,'quota-regression');
          assert.equal(document.fields.techSignature.stringValue,'data:image/png;base64,dGVzdA==');
          assert.equal(document.fields.customerSignature.stringValue,'data:image/png;base64,Y3VzdG9tZXI=');
          assert.equal(document.fields.cloudSynced.booleanValue,true);
          assert.equal(await page.evaluate(()=>data.filter(r=>r.id==='quota-regression').length),1,'No duplicate after retry');
          if(scenario.includes('photo')||scenario==='compact-local'||scenario==='real-quota'){
            assert.equal(JSON.stringify(document).includes('data:image/jpeg'),false);
            assert.equal(document.fields.photoSyncPending.booleanValue,false);
            assert.ok(await page.evaluate(()=>uploadedPhotoCount)>=2,'Normal and issue photo uploaded');
          }
          if(scenario==='compact-local')assert.equal(await page.evaluate(()=>loadLocalData().some(r=>r.id==='quota-regression')),true,'Compact confirmed URLs fit in the local cache');
          if(scenario==='real-quota'){
            assert.equal(await page.evaluate(()=>window.realQuotaHit),true,'Browser itself reached its real storage limit');
            assert.equal(writes,1,'Use cloud-only upload-first path after actual browser quota failure');
          }
          assert.deepEqual(errors,[]);
          console.log(`quarterly-quota-cloud: ${device} ${scenario} passed`);
        }finally{await context.close();}
      }
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
