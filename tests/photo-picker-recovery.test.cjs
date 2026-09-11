const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,webkit,devices}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
(async()=>{
 const useWebkit=process.env.LIFTCHECK_TEST_ENGINE==='webkit';
 const browser=await(useWebkit?webkit.launch({headless:true}):chromium.launch({headless:true,executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}));
 try{for(const name of useWebkit?['iPhone 13','iPad (gen 7)']:['Pixel 7','Desktop']){
   const context=await browser.newContext({...name==='Desktop'?{viewport:{width:1440,height:900}}:devices[name],serviceWorkers:'block'});
   try{
     await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!=='http://127.0.0.1:4179')return route.abort();const f=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f))return route.fulfill({status:404,body:''});return route.fulfill({path:f});});
     const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());await page.goto('http://127.0.0.1:4179/index.html');
     await page.evaluate(()=>{firebaseAvailable=false;});
     for(const kind of ['part','repair']){
       await page.evaluate(kind=>{if(kind==='part'){showSection('parts');openPartForm();}else openRepairModal();},kind);
       const input=page.locator('#'+kind+'PhotoInput');
       for(let i=1;i<=2;i++){
         assert.equal(await input.isEnabled(),true,'User can select the next photo');
         await input.setInputFiles({name:'test'+i+'.png',mimeType:'image/png',buffer:png});
         await page.waitForFunction(({kind,i})=>(kind==='part'?currentPartPhotos:currentRepairPhotos).length===i&&!document.getElementById(kind+'PhotoInput').disabled,{kind,i});
       }
       await page.evaluate(()=>{window.originalCompressPhoto=compressPhoto;compressPhoto=async()=>{throw Error('Injected decode error');};});
       await input.setInputFiles({name:'bad.png',mimeType:'image/png',buffer:png});
       await page.waitForFunction(kind=>!document.getElementById(kind+'PhotoInput').disabled,kind);
       await page.evaluate(()=>{compressPhoto=window.originalCompressPhoto;});
       await input.setInputFiles({name:'retry.png',mimeType:'image/png',buffer:png});
       await page.waitForFunction(kind=>(kind==='part'?currentPartPhotos:currentRepairPhotos).length===3&&!document.getElementById(kind+'PhotoInput').disabled,kind);
       assert.deepEqual(errors,[]);
       console.log('photo-picker-recovery: '+name+' '+kind+' sequential selection and failed-decode retry passed');
     }
   }finally{await context.close();}
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
