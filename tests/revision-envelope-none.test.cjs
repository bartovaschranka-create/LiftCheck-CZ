const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>{const u=new URL(route.request().url()),p=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.abort();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:4179/index.html');
 const result=await page.evaluate(async()=>{
 firebaseAvailable=false;window.testAlerts=[];window.testSaved=[];alert=message=>testAlerts.push(message);
 saveRevizeRecord=async r=>{testSaved.push(JSON.parse(JSON.stringify(r)));return {local:true,cloud:true};};syncQuarterlyAfterRevize=async()=>{};logAuditAction=async()=>{};
 const base={...revizeDefaultRecord(),id:'none-test',protokol:'TEST/26',datum_kontroly:'2026-10-12',vyrobni_cislo:'NONE-TEST',vyska_podlahy:'8',pracovni_vyska:'10',bocni_dosah:'4',nosnost:'230',nosnost_osoby:'2',bocni_sila:'400'};
 for(const k of REVIZE_WORK_KEYS)base['venkovni_'+k]='';delete base.limitVariantKind;
 const open=extra=>{const r={...base,...extra};revizeData=[r];openRevizeForm(r.id);};
 open({});const initial=document.getElementById('rz_limitVariantKind').value;await saveRevizeFromForm();
 const same=Object.fromEntries(REVIZE_WORK_KEYS.map(k=>['venkovni_'+k,base[k]]));same.venkovni_vyska_podlahy='8,00 m';same.venkovni_nosnost='230 kg';
 open(same);await saveRevizeFromForm();
 open({venkovni_nosnost:'340',venkovni_bocni_dosah:'3',limitVariantKind:'none'});await saveRevizeFromForm();
 const retained=document.getElementById('rz_venkovni_nosnost').value;
 document.getElementById('rz_limitVariantKind').value='loadEnvelope';await saveRevizeFromForm();
 open({...same,venkovni_nosnost_osoby:'1',limitVariantKind:'indoorOutdoor'});await saveRevizeFromForm();
 const sideForce=revizeHasDifferentSecondaryParameters({...base,...same,venkovni_bocni_sila:'200'});
 open({...same,venkovni_bocni_sila:'200',limitVariantKind:'indoorOutdoor'});
 const select=document.getElementById('rz_limitVariantKind');select.value='none';select.dispatchEvent(new Event('change',{bubbles:true}));
 const warning=document.getElementById('rz_dataWarnings').textContent,forceRetained=document.getElementById('rz_venkovni_bocni_sila').value;
 const none={...base,venkovni_nosnost:'987',venkovni_bocni_dosah:'654',limitVariantKind:'none',venkovni_omezeni:'NE',workingEnvelopes:[{capacity:'230'},{capacity:'987'}]};
 return {initial,saved:testSaved,alerts:testAlerts,retained,sideForce,warning,forceRetained,pdf:revizePaperHtml(none),envelopes:revizeWorkingEnvelopesForRecord(none),old:revizeMapWorkingParameters({...base,...same}),outdoor:revizePaperHtml({...base,...same,venkovni_nosnost_osoby:'1',limitVariantKind:'indoorOutdoor'})};
 });
 assert.equal(result.initial,'none');assert.equal(result.saved.length,4);assert.equal(result.alerts.length,1);assert.match(result.alerts[0],/rozdílné sekundární/);
 for(const r of result.saved.slice(0,2)){assert.equal(r.limitVariantKind,'none');assert.equal(r.venkovni_omezeni,'NE');assert.ok(!('workingEnvelopes' in r));}
 assert.equal(result.saved[2].limitVariantKind,'loadEnvelope');assert.equal(result.saved[3].limitVariantKind,'indoorOutdoor');assert.equal(result.saved[3].venkovni_omezeni,'ANO');
 assert.equal(result.retained,'340');assert.equal(result.sideForce,true);assert.equal(result.forceRetained,'200');assert.match(result.warning,/rozdílné sekundární/);assert.equal(result.old.limitVariantKind,'none');assert.deepEqual(result.envelopes,[]);
 assert.doesNotMatch(result.pdf,/revize-variant-note|Při zvýšeném zatížení|Snížené hodnoty uvedené|987|654/);assert.match(result.outdoor,/maximální rychlosti větru 12,5 m\/s/);
 console.log('revision-envelope-none: basic/equal saves, actual load/persons/force differences, preserved manual values and none PDF passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
