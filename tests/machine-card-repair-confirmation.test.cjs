const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url()),file=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&file.startsWith(root+path.sep)&&fs.existsSync(file)?route.fulfill({path:file}):route.abort();});
  const page=await context.newPage();page.on('dialog',d=>d.accept());await page.goto('http://127.0.0.1:4179/index.html');
  const result=await page.evaluate(async()=>{
   firebaseAvailable=false;localStorage.clear();data=[];partsData=[];faultsData=[];revizeData=[];
   const source={id:'repair-source',vc:'REPAIR-HISTORY',typ:'JLG 450 AJ',datum:'2026-01-10',revizeDo:'2099-12',cLogic:'legacy',photos:{},issuePhotos:{}};
   for(const step of getStepsForRecord(source))if(['yn','yntext','yntextphoto'].includes(step.type))source[step.k]=isGeneralCheckKey(step.k)||isInvertedIssueKey(step.k)?'NE':'ANO';
   source.C2='ANO';source.C2_p='Poškozené kolo <test>';data=[source];saveLocalData(data);const before=JSON.stringify(source);
   const beforeState=getMachineState(source.vc).txt;openHistoryModal(source.vc);
   await createRepairedQuarterlyProtocol(source.id);
   const rows=loadLocalData(),repaired=rows.find(r=>r.repairFollowUpOf===source.id);
   return {id:repaired.id,beforeState,state:getMachineState(source.vc).txt,unchanged:JSON.stringify(rows.find(r=>r.id===source.id))===before,snapshot:repaired.repairSourceIssues,text:els.historyBody.textContent,count:els.historyBody.querySelectorAll('[data-history-date]').length};
  });
  assert.ok(result.unchanged);assert.match(result.beforeState,/Závada/);assert.doesNotMatch(result.state,/Závada v protokolu/);
  assert.match(result.snapshot,/Poškozené kolo <test>/);assert.match(result.text,/Odstranění závad potvrzeno/);assert.match(result.text,/Původní závady:/);assert.match(result.text,/Poškozené kolo <test>/);assert.equal(result.count,2);
  assert.equal(await page.locator('#historyBody test').count(),0);
  await page.evaluate(()=>{window.opened=[];openPreviewById=id=>opened.push(id);});
  for(const id of ['repair-source',result.id]){await page.evaluate(()=>openHistoryModal('REPAIR-HISTORY'));await page.locator(`#historyBody [data-open-id="${id}"]`).first().click();assert.equal(await page.evaluate(()=>opened.at(-1)),id);}
  await page.reload();
  const restored=await page.evaluate(()=>{firebaseAvailable=false;openHistoryModal('REPAIR-HISTORY');return {text:els.historyBody.textContent,count:els.historyBody.querySelectorAll('[data-history-date]').length};});
  assert.equal(restored.count,2);assert.match(restored.text,/Poškozené kolo <test>/);
  const cases=await page.evaluate(()=>{
   const rows=loadLocalData(),source=rows.find(r=>r.id==='repair-source'),follow=rows.find(r=>r.repairFollowUpOf===source.id);
   const extra={...source,id:'other-issue',C2_p:'Jiná dosud neopravená závada'};data=[...rows,extra];saveLocalData(data);const unresolved=getMachineState(source.vc).txt;
   // Existing follow-ups have label-only snapshots; enrich them from the preserved source notes.
   const legacy={...follow,repairSourceIssues:'Poškození kol'};const legacyText=quarterlyRepairHistoryHtml(legacy,[source,legacy]);
   const missingSource=quarterlyRepairHistoryHtml(follow,[follow]);
   const otherMachine=getMachineRows('OTHER').protocols.length;
   return {unresolved,legacyText,missingSource,otherMachine};
  });
  assert.match(cases.unresolved,/Závada/);assert.match(cases.legacyText,/Poškozené kolo &lt;test&gt;/);assert.match(cases.missingSource,/Poškozené kolo &lt;test&gt;/);assert.equal(cases.otherMachine,0);
  console.log('machine-card-repair-confirmation: real repair action, automatic card refresh, source details/snapshot, both links, reload, escaping and unresolved independent issue passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
