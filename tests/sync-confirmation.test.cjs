const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LIFTCHECK_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const context=await browser.newContext({serviceWorkers:'block',viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 await context.route('**/*',route=>{const u=new URL(route.request().url()),p=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.abort();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:4179/index.html');
 const result=await page.evaluate(async()=>{
 firebaseAvailable=false;
 const old={id:'test-repair',description:'old',updatedAt:'2026-09-20T12:00:00Z'};
 const pending={...old,description:'offline edit',updatedAt:'2026-09-21T12:00:00Z'};
 markRepairSyncState(pending,false,new Error('offline'));
 const merged=mergeRepairCloudWithLocal([old],[pending]);
 revizeData=[{id:'memory-only',protokol:'MEMORY'}];
 const rows=upsertLocalRow(loadLocalRevize,saveLocalRevize,{id:'edited',protokol:'NEW'});
 // Execute the recovery timer with a visible wizard and an otherwise empty app.
 const nativeTimer=window.setTimeout;let callback,refreshes=0;
 window.setTimeout=(fn,ms)=>{if(ms===14000){callback=fn;return 0;}return nativeTimer(fn,ms);};
 firebaseAvailable=true;db={};hasAnySyncedAppData=()=>false;
 refreshAllCloudDataFromServer=async()=>{refreshes++;};
 const wizard=document.getElementById('wizard');wizard.classList.add('show');
 scheduleEmptyAppRecovery('test');await callback();window.setTimeout=nativeTimer;
 // A successful HTTP write followed by a different stored payload is not synchronized.
 window.fetch=async(url,options)=>({ok:true,json:async()=>({fields:firestoreRestFields({id:'verify',value:'older'})})});
 let mismatchRejected=false;
 try{await setAndVerifyFirestoreRest('test','verify',{id:'verify',value:'new'},'test');}catch(e){mismatchRejected=true;}
 return {pending:repairSyncPending(merged[0]),description:merged[0].description,ids:rows.map(r=>r.id),refreshes,mismatchRejected};
 });
 assert.equal(result.pending,true);assert.equal(result.description,'offline edit');
 assert.ok(result.ids.includes('memory-only'));assert.ok(result.ids.includes('edited'));
 assert.equal(result.refreshes,0);assert.equal(result.mismatchRejected,true);
 console.log('sync-confirmation: pending repair preserved, in-memory revision retained, active mobile wizard protected and server content mismatch rejected');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
