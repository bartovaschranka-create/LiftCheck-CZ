const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LIFTCHECK_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>{const u=new URL(route.request().url()),p=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.abort();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:4179/index.html');
 const result=await page.evaluate(async()=>{
 firebaseAvailable=false;let document=null,clock=0,writes=0;
 const copy=v=>JSON.parse(JSON.stringify(v));
 window.fetch=async(url,options={})=>{
   if(options.method==='POST'){
     const write=JSON.parse(options.body).writes[0];
     if((document && write.currentDocument.updateTime!==document.updateTime)||(!document && write.currentDocument.exists!==false))return {ok:false,status:409};
     document={name:write.update.name,fields:{...write.update.fields,updatedAt:{timestampValue:new Date(1700000000000+(++clock)*1000).toISOString()}},updateTime:String(clock)};writes++;
     return {ok:true,json:async()=>({writeResults:[{updateTime:String(clock)}]})};
   }
   return document ? {ok:true,json:async()=>copy(document)} : {ok:false,status:404};
 };
 const first={id:'two-client-test',protokol:'1',syncPending:false};
 await saveVersionedRecord('test',first.id,first,'create',1000,1000);
 const stale=copy(first),newer={...first,protokol:'2'};
 await saveVersionedRecord('test',newer.id,newer,'edit',1000,1000);
 let staleRejected=false;try{await saveVersionedRecord('test',stale.id,{...stale,protokol:'3'},'stale',1000,1000);}catch(e){staleRejected=true;}
 const beforeRetry=writes;
 await saveVersionedRecord('test',stale.id,{...stale,protokol:'2'},'retry confirmed write',1000,1000);
 const idempotent=writes===beforeRetry;
 const tombstone={id:newer.id,deleted:true,syncRevision:newer.syncRevision};
 await saveVersionedRecord('test',tombstone.id,tombstone,'delete',1000,1000);
 let resurrectionRejected=false;try{await saveVersionedRecord('test',stale.id,stale,'resurrect',1000,1000);}catch(e){resurrectionRejected=true;}
 const hidden=mergeAndNormalizeRevizeRows([tombstone]).rows.every(r=>r.id!==tombstone.id);
 const quarterly = {id:'quarterly-concurrent', vc:'SYNTHETIC', savedAt:'2026-06-01T00:00:00.000Z', poznamka:'Původní', photos:{front:{url:'https://fixtures.invalid/retained.jpg'}}};
 document={name:'projects/test/databases/(default)/documents/'+COLLECTION_NAME+'/'+quarterly.id,fields:firestoreRestFields(quarterly),updateTime:String(++clock)};
 firebaseAvailable=true;
 db={};
 const edit = {...quarterly, baseServerUpdatedAt:quarterly.savedAt, poznamka:'První klient'};
 const savedEdit=await syncProtocolToCloud(edit);
 const staleEdit=await syncProtocolToCloud({...edit,poznamka:'Druhý klient'});
 const retryCount=writes;
 const retriedEdit=await syncProtocolToCloud(edit);
 const storedQuarterly=firestoreRestSnapshot(document).data();
 return {staleRejected,idempotent,resurrectionRejected,hidden,version:newer.syncRevision,time:newer.updatedAt,
   quarterly:{saved:savedEdit.cloud,version:savedEdit.record?.syncRevision,stale:staleEdit.cloud,retried:retriedEdit.cloud,
     retryWrites:writes-retryCount,notes:storedQuarterly.poznamka,photo:storedQuarterly.photos.front.url}};
 });
 assert.equal(result.staleRejected,true);assert.equal(result.idempotent,true);assert.equal(result.resurrectionRejected,true);assert.equal(result.hidden,true);assert.equal(result.version,2);assert.equal(result.time,'2023-11-14T22:13:22.000Z');
 assert.deepEqual(result.quarterly,{saved:true,version:1,stale:false,retried:true,retryWrites:0,notes:'První klient',photo:'https://fixtures.invalid/retained.jpg'});
 console.log('versioned-sync: server timestamp, create/edit, stale client conflict, idempotent retry, tombstone and resurrection rejection passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
