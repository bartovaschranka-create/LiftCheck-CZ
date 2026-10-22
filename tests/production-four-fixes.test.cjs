const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,devices}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:4179';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LIFTCHECK_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const profile of [{viewport:{width:1280,height:900}},devices['iPhone 13'],devices['Pixel 7']]){
   const context=await browser.newContext({...profile,serviceWorkers:'block'});
   // No production request can leave this context. Two sessions share only this fake server.
   const server=new Map();let fail=false,writes=0;
   const route=async route=>{
    const req=route.request(),url=new URL(req.url()),local=path.resolve(root,'.'+url.pathname);
    if(url.origin===origin && local.startsWith(root+path.sep) && fs.existsSync(local))return route.fulfill({path:local});
    if(url.hostname==='firestore.googleapis.com'){
     const suffix=decodeURIComponent(url.pathname.split('/documents/')[1]||'');
     if(!suffix.startsWith('nahradni_dily'))return route.abort();
     if(fail)return route.fulfill({status:503,json:{error:'simulated outage'}});
     const name=url.pathname.replace('/v1/','');
     if(req.method()==='PATCH'){writes++;const doc={name,...req.postDataJSON()};server.set(suffix,doc);return route.fulfill({json:doc});}
     if(req.method()==='GET')return route.fulfill(server.has(suffix)?{json:server.get(suffix)}:suffix==='nahradni_dily'?{json:{documents:[...server.values()]}}:{status:404,json:{}});
    }
    return route.abort();
   };
   await context.route('**/*',route);const page=await context.newPage();await page.goto(origin+'/index.html');
   await page.evaluate(()=>{firebaseAvailable=false;usesRestCloudRefresh=()=>true;});
   const evaluation=await page.evaluate(()=>{
    const r={id:'quarterly',typ:'JLG 450 AJ',vc:'TEST-001',datum:'2026-10-01',cLogic:'legacy',quarterlyEvaluationVersion:2,photos:{},issuePhotos:{}};
    for(const step of getStepsForRecord(r))if(['yn','yntext','yntextphoto'].includes(step.type))r[step.k]=isGeneralCheckKey(step.k)||isInvertedIssueKey(step.k)?'NE':'ANO';
    r.C1='ANO';const before=JSON.stringify(r),passed=!hasIssue(r),paper=renderPaper(r);
    const historical={...r};delete historical.quarterlyEvaluationVersion;
    const preserved=hasIssue(historical),unchanged=before===JSON.stringify(r);
    r.C2='ANO';const faultFails=hasIssue(r);
    const positive={...r,cLogic:'positive',C2:'NE'};const otherLogicFails=hasIssue(positive);
    localStorage.setItem('ctvrtletni_protokoly_local',JSON.stringify([{...r,C2:'NE'}]));
    return {passed,preserved,unchanged,faultFails,otherLogicFails,paper};
   });
   assert.ok(evaluation.passed&&evaluation.preserved&&evaluation.unchanged&&evaluation.faultFails&&evaluation.otherLogicFails);
   assert.match(evaluation.paper,/Celkové znečištění/);assert.match(evaluation.paper,/Vyhov|VYHOV|vyhov/);
   const history=await page.evaluate(()=>{
    localStorage.clear();data=[{id:'quarterly',vc:'TEST-001',datum:'2026-10-01'}];faultsData=[];partsData=[];
    revizeData=[{id:'revision',vyrobni_cislo:'TEST-001',datum_kontroly:'2026-10-02',rt_jmeno:'Test'}];
    saveLocalRepairs([{id:'service-1',vc:'TEST-001',date:'2026-10-03',work:'Servis 1'}, {id:'service-2',serial:' TEST-001 ',date:'2026-10-04',work:'Servis 2'}, {id:'repair',serial:'TEST-001',finishedAt:'2026-10-05',oprava:'Výměna spínače <test>'}, {id:'unrelated',serial:'OTHER',work:'Nesmí být vidět'}]);
    const before=JSON.stringify(loadLocalRepairs());openHistoryModal('test-001');
    const five=els.historyBody.querySelectorAll('[data-history-date]').length;
    const order=[...els.historyBody.querySelectorAll('[data-history-date]')].map(el=>el.dataset.historyDate);
    const summary=els.historyBody.textContent;
    for(let i=0;i<12;i++)data.push({id:'extra-'+i,vc:'TEST-001',datum:'2026-09-01'});
    updateMainOverview();const all=els.historyBody.querySelectorAll('[data-history-date]').length;
    const empty=getMachineRows('').protocols.length;
    window.historyCalls=[];openPreviewById=id=>historyCalls.push(id);printRevizeById=id=>historyCalls.push(id);printRepairRecord=r=>historyCalls.push(r.id);
    return {five,all,order,summary,empty,unchanged:before===JSON.stringify(loadLocalRepairs())};
   });
   assert.equal(history.five,5);assert.equal(history.all,17);assert.equal(history.empty,0);assert.ok(history.unchanged);
   assert.deepEqual(history.order,['2026-10-05','2026-10-04','2026-10-03','2026-10-02','2026-10-01']);assert.match(history.summary,/Výměna spínače <test>/);assert.doesNotMatch(history.summary,/Nesmí být vidět/);
   for(const [attr,id] of [['repair-print','service-1'],['repair-print','service-2'],['repair-print','repair'],['revize-print','revision'],['open-id','quarterly']]){
    await page.evaluate(()=>openHistoryModal('TEST-001'));await page.locator(`#historyBody [data-${attr}="${id}"]`).click();assert.equal(await page.evaluate(()=>historyCalls.at(-1)),id);
   }
   const text=await page.evaluate(()=>{const date=ymd(new Date());scheduleData=TECHNICI.slice(0,2).map((technician,i)=>({id:'plan-'+i,date,technician,place:'Brno'}));renderHomeOverview();return document.getElementById('homeTodayPlanNote').textContent;});
   assert.match(text,/2 technici/);assert.doesNotMatch(text,/technikové/);
   await page.evaluate(()=>{localStorage.clear();data=[];revizeData=[];partsData=[];faultsData=[];firebaseAvailable=true;db={collection:()=>({doc:id=>({path:PARTS_COLLECTION_NAME+'/'+id})})};window.order={id:'order',serial:'TEST-001',type:'TEST',createdAt:'2026-10-01',note:'Original',photos:[{url:'https://test.invalid/photo.jpg',path:'nahradni_dily/order/existing.jpg'}]};});
   const saved=await page.evaluate(async()=>{const result=await savePartRecord(order);return {cloud:result.cloud,record:loadLocalParts()[0]};});
   assert.ok(saved.cloud);assert.equal(saved.record.syncPending,false);assert.equal(server.get('nahradni_dily/order').fields.cloudPending.booleanValue,false);
   const second=await browser.newContext({...profile,serviceWorkers:'block'});await second.route('**/*',route);const other=await second.newPage();await other.goto(origin+'/index.html');
   const read=()=>other.evaluate(async()=>{firebaseAvailable=true;db={};usesRestCloudRefresh=()=>true;const rows=await getCollectionRowsFromServer(PARTS_COLLECTION_NAME);partsData=mergeCloudWithLocal(rows,loadLocalParts(),saveLocalParts);return partsData;});
   assert.equal((await read())[0].note,'Original');
   fail=true;
   const offline=await page.evaluate(async()=>{order.note='Offline edit';const result=await savePartRecord(order);return {cloud:result.cloud,pending:loadLocalParts()[0].syncPending,photos:loadLocalParts()[0].photos};});
   assert.equal(offline.cloud,false);assert.equal(offline.pending,true);assert.equal(offline.photos[0].url,'https://test.invalid/photo.jpg');
   await page.reload();await page.evaluate(()=>{usesRestCloudRefresh=()=>true;firebaseAvailable=true;db={collection:()=>({doc:id=>({path:PARTS_COLLECTION_NAME+'/'+id})})};});
   fail=false;await page.evaluate(()=>retryPendingPartSync());const count=writes;await page.evaluate(()=>retryPendingPartSync());assert.equal(writes,count);assert.equal(server.size,1);
   await other.reload();assert.equal((await read())[0].note,'Offline edit');
   // Old local-only orders are checked even after 14 days; an existing remote order is never overwritten.
   await page.evaluate(()=>{partsData=[];saveLocalParts([{id:'order',serial:'TEST-001',createdAt:'2020-01-01',note:'Stale legacy copy'}, {id:'legacy-missing',serial:'TEST-001',createdAt:'2020-01-01',note:'Old local only'}]);});
   await page.evaluate(()=>retryPendingPartSync());assert.equal(server.get('nahradni_dily/order').fields.note.stringValue,'Offline edit');assert.ok(server.has('nahradni_dily/legacy-missing'));
   const conflict=await page.evaluate(async()=>{partsData=[];saveLocalParts([{id:'order',serial:'TEST-001',updatedAt:'2000-01-01',note:'Stale pending edit',syncPending:true}]);await retryPendingPartSync();return loadLocalParts()[0];});
   assert.equal(server.get('nahradni_dily/order').fields.note.stringValue,'Offline edit');assert.ok(conflict.syncPending);assert.match(conflict.syncError,/novější objednávka/);
   // Persist the outbox before an upload is allowed to complete; serialize retries.
   const outbox=await page.evaluate(async()=>{
    storageAvailable=true;storage={};let release;uploadDataUrl=()=>new Promise(r=>{release=r;});
    const row={id:'pending-photo',serial:'TEST-001',photos:[{dataUrl:'data:image/jpeg;base64,AA=='}]};
    const promise=savePartRecord(row);const before=loadLocalParts().find(r=>r.id===row.id);await retryPendingPartSync();release('https://test.invalid/new.jpg');await promise;
    return {durable:before?.photos[0].dataUrl,pending:before?.syncPending};
   });assert.ok(outbox.durable&&outbox.pending);
   const quota=await page.evaluate(async()=>{
    firebaseAvailable=false;partsData=[];
    saveLocalParts(Array.from({length:305},(_,i)=>({id:'old-'+i,serial:'OTHER'})));
    await savePartRecord({id:'keep-all',serial:'TEST-001',photos:[]});const count=loadLocalParts().length;
    const original=saveLocalParts;saveLocalParts=()=>({ok:false,error:new Error('quota')});
    const row={id:'quota-photo',serial:'TEST-001',photos:[{dataUrl:'data:image/jpeg;base64,AA=='}]};
    const result=await savePartRecord(row);saveLocalParts=original;
    return {count,local:result.local,cloud:result.cloud,photo:row.photos[0].dataUrl};
   });assert.equal(quota.count,306);assert.equal(quota.local,false);assert.equal(quota.cloud,false);assert.ok(quota.photo);
   await second.close();await context.close();console.log((profile.userAgent?.includes('iPhone')?'iPhone profile':profile.userAgent?.includes('Android')?'Android profile':'desktop')+' (Chromium): four fixes, second-session REST read, offline/retry/legacy/photos/quota passed');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
