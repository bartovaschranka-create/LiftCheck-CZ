const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit,devices}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const wk=process.env.LIFTCHECK_TEST_ENGINE==='webkit';
 const browser=await(wk?webkit.launch():chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 try{for(const device of wk?['iPhone 13','iPad (gen 7)']:['Pixel 7']){
  const context=await browser.newContext({...devices[device],serviceWorkers:'block'});
  let mode='ok',pages=0;
  try{
   await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin==='http://127.0.0.1:4179'){
     const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));
     return p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.fulfill({status:404});
    }
    if(u.hostname==='firestore.googleapis.com'&&u.pathname.endsWith('/documents/test-pagination')&&route.request().method()==='GET'){
     pages++;const next=u.searchParams.has('pageToken');
     if(mode==='failure'&&next)return route.fulfill({status:503,body:'unavailable'});
     return route.fulfill({json:{documents:[{name:'projects/test/databases/(default)/documents/test-pagination/'+(next?'b':'a'),fields:{text:{stringValue:'test'},count:{integerValue:'4'},flag:{booleanValue:false},empty:{arrayValue:{}},object:{mapValue:{fields:{value:{nullValue:null}}}}}}],...(!next||mode==='repeated'?{nextPageToken:'next'}:{})}});
    }
    return route.abort();
   });
   const page=await context.newPage();await page.goto('http://127.0.0.1:4179/index.html');
   await page.waitForTimeout(500);
   await page.evaluate(async()=>{firebaseAvailable=false;if(cloudRefreshPromise)await cloudRefreshPromise.catch(()=>{});db={collection:()=>{throw Error('SDK must not be used by mobile reads');}};});
   const rows=await page.evaluate(async()=>{const snap=await readFirestoreCollection('test-pagination');return snap.docs.map(d=>({id:d.id,...d.data()}));});
   assert.equal(pages,2);assert.deepEqual(rows.map(x=>x.id),['a','b']);assert.deepEqual(rows[0].object,{value:null});assert.equal(rows[0].flag,false);assert.deepEqual(rows[0].empty,[]);
   mode='failure';await assert.rejects(page.evaluate(()=>readFirestoreCollection('test-pagination')),/503/);
   mode='repeated';await assert.rejects(page.evaluate(()=>readFirestoreCollection('test-pagination')),/opakuje/);
   // Use real refresh/merge logic with controlled collection boundaries, not live data.
   const result=await page.evaluate(async()=>{
    firebaseAvailable=true;cloudRefreshLastAt=0;
    localStorage.clear();
    syncRevizeLoadFixesToCloud=async()=>{};schedulePendingSyncBatch=()=>{};
    data=[{id:'offline-only',syncPending:true,vc:'pending'}];
    saveLocalData=()=>({ok:false,error:new Error('quota')});
    let release;const gate=new Promise(r=>release=r);window.releaseRefresh=release;
    getCollectionRowsFromServer=async collection=>{
     if(collection===COLLECTION_NAME)return Array.from({length:140},(_,i)=>({id:'cloud-'+i,vc:'TEST-'+i}));
     if(collection===REVIZE_ZZ_COLLECTION_NAME)await gate;
     return [];
    };
    const first=refreshAllCloudDataFromServer('test',true),second=refreshAllCloudDataFromServer('join',true);
    await new Promise(r=>setTimeout(r,90));
    const early=data.length,joined=first===second;
    window.LIFTCONTROL_EMBEDDED_BACKUP={collections:{protokoly:[{id:'stale-backup'}]}};
    restoreEmbeddedBackupIfEmpty();
    const afterBackup=data.length;
    release();await first;
    getCollectionRowsFromServer=async()=>{throw Error('offline');};
    await refreshAllCloudDataFromServer('failed',true).catch(()=>{});
    return {early,afterBackup,joined,after:data.length,pending:data.some(r=>r.id==='offline-only'),busy:cloudRefreshInProgress};
   });
   assert.deepEqual(result,{early:141,afterBackup:141,joined:true,after:141,pending:true,busy:false});
   console.log('mobile-rest-refresh: '+device+' pagination, failed/repeated page, early counts, joined refresh, quota and offline preservation passed');
  }finally{await context.close();}
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
