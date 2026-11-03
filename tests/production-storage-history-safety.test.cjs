const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:4187';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LIFTCHECK_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  // All network access is intercepted, including startup, SDKs, Storage and popups.
  await context.route('**/*',route=>{
   const u=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(u.pathname));
   return u.origin===origin&&file.startsWith(root+path.sep)&&fs.existsSync(file)?route.fulfill({path:file}):route.abort();
  });
  const page=await context.newPage();await page.goto(origin+'/index.html');
  await page.evaluate(()=>{firebaseAvailable=false;window.alert=()=>{};window.confirm=()=>false;clearTimeout(pendingSyncTimer);schedulePendingSyncBatch=()=>{};});
  const history=await page.evaluate(()=>{
   localStorage.clear();data=[];revizeData=[];partsData=[];faultsData=[];auditData=[];photoFormCache.repair.clear();
   data=Array.from({length:135},(_,i)=>({id:'q-'+i,vc:'SN-TEST',datum:new Date(Date.UTC(2000,0,i+1)).toISOString().slice(0,10),enteredBy:'Original author',note:'record-'+i,typ:'Original machine'}));
   data.push({vc:'SN-TEST',datum:'1999-01-01',note:'legacy-A'},{vc:'SN-TEST',datum:'1999-01-01',note:'legacy-B'},{vc:'SN-TEST',datum:'1999-01-01',note:'identical'},{vc:'SN-TEST',datum:'1999-01-01',note:'identical'});
   revizeData=[{id:'rz',vyrobni_cislo:'SN-TEST',datum_kontroly:'2005-01-01',rt_jmeno:'Historical inspector',protokol:'ORIGINAL'}];
   faultsData=[{id:'fault',serial:'SN-TEST',description:'Original fault',createdAt:'2006-01-01'}];
   partsData=[{id:'part',serial:'SN-TEST',enteredBy:'Historical author',note:'Original part',createdAt:'2007-01-01',photos:[{url:'https://example.invalid/photo.jpg'}]}];
   saveLocalRepairs([{id:'repair',serial:'SN-TEST',tech:'Original technician',work:'Historical repair',savedAt:'2008-01-01'}]);
   auditData=Array.from({length:125},(_,i)=>({id:'a-'+i,serial:'SN-TEST',entity:'part',entityId:'part',createdAt:'2009-01-01',detail:'status-'+i,before:{note:'old-'+i},after:{note:'new-'+i}}));
   openHistoryModal('sn-test');
   const count=els.historyBody.querySelectorAll('[data-history-date]').length;
   const snapshots=[...els.historyBody.querySelectorAll('button')].filter(b=>b.textContent==='Původní údaje / tisk').length;
   window.actualBatchPrint=openBatchPrintWindow;window.capturedPrints=[];openBatchPrintWindow=options=>{capturedPrints.push(options);};
   for(const button of [...els.historyBody.querySelectorAll('button')].filter(b=>b.textContent==='Původní údaje / tisk'))button.click();
   const supported=capturedPrints.map(p=>p.title);
   const original=data.map(r=>JSON.stringify(r));
   printMachineHistory('SN-TEST');
   const print=capturedPrints.at(-1),body=print.bodyHtml;
   const legacy=data.filter(r=>!r.id);saveLocalData(data);getMachineRows('SN-TEST');getMachineRows('SN-TEST');
   return {count,snapshots,supported,total:print.count,body,unchanged:original.every((r,i)=>r===JSON.stringify(data.find(x=>JSON.stringify(x)===r))),legacy:getMachineRows('SN-TEST').protocols.filter(r=>!r.id).length,escape:storedHistoryValueHtml({note:'<script>alert(1)</script>',url:'javascript:alert(1)'})};
  });
  assert.equal(history.count,143);assert.equal(history.snapshots,143);assert.equal(history.total,268);assert.equal(history.legacy,4);assert.ok(history.unchanged);
  for(const title of ['Čtvrtletní kontrola','Revize ZZ','Hlášení poruchy','Náhradní díl','Zápis o opravě / pravidelném servisu'])assert.ok(history.supported.includes(title));
  for(const text of ['record-0','record-134','legacy-A','legacy-B','status-0','status-124','Historical author','Original machine','https://example.invalid/photo.jpg'])assert.ok(history.body.includes(text),text);
  assert.ok(!history.escape.includes('<script>'));assert.ok(!history.escape.includes('href="javascript:'));
  const pages=await page.evaluate(async()=>{
   let requested=[];usesRestCloudRefresh=()=>true;firebaseAvailable=true;db={};
   window.fetch=async url=>{const token=new URL(url).searchParams.get('pageToken');requested.push(token);return {ok:true,json:async()=>({documents:Array.from({length:token?37:100},(_,i)=>({name:'projects/test/databases/(default)/documents/test/id-'+(token?100+i:i),fields:{serial:{stringValue:'SN-TEST'}}})),...(token?{}:{nextPageToken:'page-2'})})};};
   const rows=await getCollectionRowsFromServer('test');return {count:rows.length,oldest:rows[0].id,newest:rows.at(-1).id,requested};
  });
  assert.deepEqual(pages,{count:137,oldest:'id-0',newest:'id-136',requested:[null,'page-2']});
  const load=await page.evaluate(async()=>{
   const calls=[];getCollectionRowsFromServer=async name=>{calls.push(name);if(name===AUDIT_COLLECTION_NAME)return [{id:'old-audit',serial:'SN-TEST',createdAt:'1998-01-01'}];return [];};
   await refreshCompleteMachineHistory('sn-test');const complete=machineHistoryLoads.get('sn-test')||[...machineHistoryLoads.values()].at(-1);
   getCollectionRowsFromServer=async()=>{throw new Error('offline');};await refreshCompleteMachineHistory('sn-test');
   return {calls: calls.length,audit:auditData.some(r=>r.id==='old-audit'),complete:complete.text,partial:[...machineHistoryLoads.values()].at(-1).text};
  });
  assert.equal(load.calls,6);assert.ok(load.audit);assert.match(load.complete,/Všechny stránky/);assert.match(load.partial,/není úplně ověřena/);
  // A shared conditional server models two clients, precondition races and lost acknowledgements.
  await page.evaluate(()=>{
   window.serverDocs=new Map();window.serverWrites=0;window.serverOffline=false;window.loseAck=false;
   window.fetch=async(url,options={})=>{
    if(serverOffline)throw new Error('offline');
    if(options.method==='POST'){
     const w=JSON.parse(options.body).writes[0],key=w.update.name.split('/documents/')[1],prev=serverDocs.get(key);
     if((prev&&prev.updateTime!==w.currentDocument.updateTime)||(!prev&&w.currentDocument.exists!==false))return {ok:false,status:409};
     const stamp=new Date(1700000000000+(++serverWrites)*1000).toISOString();
     serverDocs.set(key,{name:w.update.name,fields:{...w.update.fields,updatedAt:{timestampValue:stamp}},updateTime:stamp});
     if(loseAck){loseAck=false;throw new Error('ack lost');}return {ok:true,json:async()=>({})};
    }
    const key=decodeURIComponent(new URL(url).pathname.split('/documents/')[1]);
    return serverDocs.has(key)?{ok:true,json:async()=>structuredClone(serverDocs.get(key))}:{ok:false,status:404};
   };
   firebaseAvailable=true;db={collection:name=>({doc:id=>({path:name+'/'+id})})};usesRestCloudRefresh=()=>true;
   readFirestoreDocument=async ref=>{const doc=serverDocs.get(ref.path);return doc?{exists:true,data:()=>firestoreRestSnapshot(doc).data()}:{exists:false};};
   partsData=[];localStorage.clear();
   window.realSetItem=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){if(key==='liftcheck_parts_local')throw new DOMException('quota','QuotaExceededError');return realSetItem.call(this,key,value);};
  });
  const quota=await page.evaluate(async()=>{
   const row={id:'quota',serial:'SN-TEST',enteredBy:'Author',note:'Keep me',photos:[]};
   const saved=await savePartRecord(row);const memory=partsData.find(r=>r.id==='quota');
   const stale=structuredClone(row);row.note='Other device';await savePartRecord(row);stale.note='Stale device';
   const conflict=await savePartRecord(stale);
   serverOffline=true;const offline={id:'offline',serial:'SN-TEST',photos:[{dataUrl:'data:image/jpeg;base64,AA=='}]};
   const failed=await savePartRecord(offline);
   unsavedPartRecord=offline;const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);
   const guarded=event.defaultPrevented;const close=closePartForm();unsavedPartRecord=null;
   return {local:saved.local,cloud:saved.cloud,memory:memory.cloudSynced,conflict:conflict.cloud,failed:failed.local===false&&failed.cloud===false,photo:offline.photos[0].dataUrl,guarded,close,serverCount:serverDocs.size};
  });
  assert.equal(quota.local,false);assert.equal(quota.cloud,true);assert.equal(quota.memory,true);assert.equal(quota.conflict,false);assert.ok(quota.failed&&quota.photo&&quota.guarded);assert.equal(quota.close,false);assert.equal(quota.serverCount,1);
  const retry=await page.evaluate(async()=>{
   Storage.prototype.setItem=realSetItem;serverOffline=false;partsData=[];localStorage.clear();
   const row={id:'outbox',serial:'SN-TEST',note:'Offline',photos:[]};serverOffline=true;const saved=await savePartRecord(row);serverOffline=false;
   await retryPendingPartSync();const writes=serverWrites;await retryPendingPartSync();
   const noDuplicates=serverWrites===writes&&!loadLocalParts()[0].syncPending;
   const ambiguous={id:'ambiguous',serial:'SN-TEST',photos:[]};loseAck=true;const failed=await savePartRecord(ambiguous);const before=serverWrites;
   await retryPendingPartSync();return {local:saved.local,cloud:saved.cloud,noDuplicates,ambiguousLocal:failed.local,ambiguousCloud:failed.cloud,ackRetryNoWrite:serverWrites===before,confirmed:loadLocalParts().find(r=>r.id==='ambiguous').cloudSynced};
  });
  assert.deepEqual(retry,{local:true,cloud:false,noDuplicates:true,ambiguousLocal:true,ambiguousCloud:false,ackRetryNoWrite:true,confirmed:true});
  const photos=await page.evaluate(async()=>{
   const files=new Map(),paths=[];const originalUpload=uploadDataUrl;
   storageAvailable=true;storage={ref:path=>({getDownloadURL:async()=>{if(!files.has(path))throw {code:'storage/object-not-found'};return files.get(path);}})};
   uploadDataUrl=async(path,data)=>{paths.push(path);const url='https://example.invalid/'+paths.length;files.set(path,url);return url;};
   const original={id:'photo-safe',serial:'SN-TEST',photos:[{dataUrl:'data:image/jpeg;base64,AA=='}]};
   const first=await preparePartForSave(structuredClone(original)),again=await preparePartForSave(structuredClone(original));
   const other=await preparePartForSave({...original,photos:[{dataUrl:'data:image/jpeg;base64,AQ=='}]});
   uploadDataUrl=originalUpload;storageAvailable=false;storage=null;
   return {uploads:paths.length,same:first.photos[0].url===again.photos[0].url,separate:first.photos[0].path!==other.photos[0].path,sourceIntact:!!original.photos[0].dataUrl};
  });
  assert.deepEqual(photos,{uploads:2,same:true,separate:true,sourceIntact:true});
  const form=await page.evaluate(async()=>{
   firebaseAvailable=false;partsData=[];localStorage.clear();
   openPartForm();document.getElementById('partType').value='Type';document.getElementById('partSerial').value='SN-FORM';
   document.getElementById('partEnteredBy').innerHTML='<option>Explicit author</option>';
   Storage.prototype.setItem=function(key,value){if(key==='liftcheck_parts_local')throw new DOMException('quota','QuotaExceededError');return realSetItem.call(this,key,value);};
   await savePartFromForm();const first=editingPartId,created=unsavedPartRecord.createdAt;
   await savePartFromForm();const second=editingPartId;
   Storage.prototype.setItem=realSetItem;await savePartFromForm();
   return {same:first===second,count:loadLocalParts().length,id:loadLocalParts()[0].id===first,created:loadLocalParts()[0].createdAt===created,guardCleared:unsavedPartRecord===null,author:loadLocalParts()[0].enteredBy};
  });
  assert.deepEqual(form,{same:true,count:1,id:true,created:true,guardCleared:true,author:'Explicit author'});
  const draft=await page.evaluate(()=>{
   rec={id:'DRAFT-ONLY',vc:'SN-DRAFT',photos:{machine:{dataUrl:'data:image/jpeg;base64,AA=='}},issuePhotos:{}};quarterlyDraftEnabled=true;quarterlyDraftPhotoCacheDirty=true;
   Storage.prototype.setItem=function(key,value){if(key===QUARTERLY_DRAFT_PHOTOS_KEY)throw new DOMException('quota','QuotaExceededError');return realSetItem.call(this,key,value);};
   const failed=saveQuarterlyDraft('manual-button'),protectedDraft=quarterlyDraftStorageFailed;
   Storage.prototype.setItem=realSetItem;const recovered=saveQuarterlyDraft('manual-button');
   return {failed,protectedDraft,recovered,guardCleared:!quarterlyDraftStorageFailed};
  });
  assert.deepEqual(draft,{failed:false,protectedDraft:true,recovered:true,guardCleared:true});
  const audit=await page.evaluate(async()=>{
   firebaseAvailable=false;auditData=[];unsavedAuditEntries.clear();
   saveLocalAudit(Array.from({length:350},(_,i)=>({id:'retained-'+i,serial:'SN-AUDIT'})));
   await logAuditAction('status','part',{id:'part-audit',serial:'SN-AUDIT',note:'after'},'Explicit author','Status change',{id:'part-audit',note:'before'});
   const count=loadLocalAudit().length,pending=loadLocalAudit().find(row=>row.auditPending);
   let writes=0;const realSave=setAndVerifyFirestore;setAndVerifyFirestore=async(collection,id,record)=>{if(collection!==AUDIT_COLLECTION_NAME)throw new Error('Unexpected collection');writes++;};
   firebaseAvailable=true;await retryPendingAuditSync();await retryPendingAuditSync();
   const acknowledged=loadLocalAudit().find(row=>row.id===pending.id);
   firebaseAvailable=false;Storage.prototype.setItem=function(key,value){if(key==='liftcontrol_audit_local')throw new DOMException('quota','QuotaExceededError');return realSetItem.call(this,key,value);};
   await logAuditAction('status','part',{id:'failed-audit',serial:'SN-AUDIT'},'Explicit author');const protectedAudit=unsavedAuditEntries.size===1;
   Storage.prototype.setItem=realSetItem;firebaseAvailable=true;await retryPendingAuditSync();setAndVerifyFirestore=realSave;
   return {count,writes,acknowledged:!acknowledged.auditPending,before:acknowledged.before.note,after:acknowledged.after.note,protectedAudit,recovered:unsavedAuditEntries.size===0};
  });
  assert.deepEqual(audit,{count:351,writes:2,acknowledged:true,before:'before',after:'after',protectedAudit:true,recovered:true});
  const popupReady=page.waitForEvent('popup');
  await page.evaluate(()=>{openBatchPrintWindow=actualBatchPrint;openStoredHistoryRecord('Náhradní díl',{id:'PRINT-ONLY',serial:'SN-PRINT',enteredBy:'Original author',createdAt:'2001-01-01',note:'Original part <script>never execute</script>',photos:[{dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='}]});});
  const popup=await popupReady;await popup.waitForLoadState();await popup.emulateMedia({media:'print'});
  assert.match(await popup.locator('.paper').textContent(),/Original author/);assert.match(await popup.locator('.paper').textContent(),/2001-01-01/);
  assert.equal(await popup.locator('.paper img').count(),1);
  assert.ok(await popup.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const pdf=await popup.pdf({format:'A4',printBackground:true});assert.ok(pdf.length>1000);
  if(process.env.LIFTCHECK_HISTORY_SCREENSHOT)await popup.screenshot({path:process.env.LIFTCHECK_HISTORY_SCREENSHOT,fullPage:true});
  await popup.close();
  console.log('production-storage-history-safety: 143 documents, 125 audits, all detail/print types, REST pagination, incomplete/offline status, quota, cloud-only success, stale device, offline outbox, lost acknowledgement, duplicate-free retries and form guards passed');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
