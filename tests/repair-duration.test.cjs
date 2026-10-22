const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url()),file=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&file.startsWith(root+path.sep)&&fs.existsSync(file)?route.fulfill({path:file}):route.abort();});
  const page=await context.newPage();await page.goto('http://127.0.0.1:4179/index.html');
  await page.evaluate(()=>{firebaseAvailable=false;openRepairModal({serial:'DURATION-TEST',startedAt:'2026-10-22T08:00',finishedAt:'2026-10-22T09:30'});});
  assert.equal(await page.locator('#repairWorkTime').inputValue(),'1 h 30 min');
  assert.match(await page.locator('#repairModal .preview-title').innerText(),/Zápis o opravě \/ pravidelném servisu/);
  await page.locator('#repairFinishedAt').fill('2026-10-22T10:15');
  assert.equal(await page.locator('#repairWorkTime').inputValue(),'2 h 15 min');
  const saved=await page.evaluate(async()=>{const r=collectRepairRecordFromForm();const result=await saveRepairRecord(r);return {ok:result.local,id:r.id,time:r.workTime,paper:repairProtocolHtml(r)};});
  assert.ok(saved.ok);assert.equal(saved.time,'2 h 15 min');assert.match(saved.paper,/2 h 15 min/);assert.match(saved.paper,/PRAVIDELN&Eacute;M SERVISU/);
  await page.reload();await page.evaluate(id=>{firebaseAvailable=false;openRepairModal(loadLocalRepairs().find(r=>r.id===id));},saved.id);
  assert.equal(await page.locator('#repairWorkTime').inputValue(),'2 h 15 min');
  await page.locator('#repairFinishedAt').fill('2026-10-22T07:00');assert.equal(await page.locator('#repairWorkTime').inputValue(),'2 h 15 min'); // Preserve saved/manual values until a valid interval is supplied.
  await page.locator('#repairStartedAt').fill('2026-10-22T23:30');await page.locator('#repairFinishedAt').fill('2026-10-23T01:00');assert.equal(await page.locator('#repairWorkTime').inputValue(),'1 h 30 min');
  await page.locator('#repairFinishedAt').fill('2026-10-22T23:00');assert.equal(await page.locator('#repairWorkTime').inputValue(),'');
  await page.locator('#repairFinishedAt').fill('2026-10-22T23:30');assert.equal(await page.locator('#repairWorkTime').inputValue(),'0 h');
  await page.locator('#repairFinishedAt').fill('');assert.equal(await page.locator('#repairWorkTime').inputValue(),'');
  const plans=await page.evaluate(()=>[1,3,5].map(count=>{scheduleData=TECHNICI.slice(0,count).map(technician=>({date:ymd(new Date()),technician}));renderHomeOverview();return document.getElementById('homeTodayPlanNote').textContent;}));
  assert.deepEqual(plans,['Dnes je v plánu 1 technik','Dnes jsou v plánu 3 technici','Dnes je v plánu 5 techniků']);
  console.log('repair-duration: live date changes, overnight/zero/invalid intervals, save/reload/print, historical duration and concise plan wording passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
