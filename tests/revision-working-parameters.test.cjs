const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const context=await browser.newContext({viewport:process.env.LIFTCHECK_MOBILE ? {width:393,height:852} : {width:1280,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>{const u=new URL(route.request().url()),p=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.abort();});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4179/index.html');
 const initial=await page.evaluate(()=>{
 firebaseAvailable=false;
 const row={...revizeDefaultRecord(),id:'parameters',vyrobni_cislo:'GS32D-12909',rok_vyroby:'2020',model:'GS-2032',vyrobce:'Original maker',provozovatel:'Operator unchanged',nosnost:'230',nosnost_osoby:'2',vyska_podlahy:'8',pracovni_vyska:'10',bocni_dosah:'4',venkovni_nosnost:'340',venkovni_nosnost_osoby:'1',venkovni_vyska_podlahy:'6',venkovni_pracovni_vyska:'8',venkovni_bocni_dosah:'3',limitVariantKind:'loadEnvelope'};
 revizeData=[row];openRevizeForm(row.id);
 const block=label=>[...document.querySelectorAll('.revize-section-title')].find(el=>el.textContent===label)?.nextElementSibling;
 const ids=label=>[...block(label).querySelectorAll('input,select')].map(el=>el.id);
 const out={base:ids('ZÁKLADNÍ HODNOTY'),reduced:ids('SNÍŽENÉ / OMEZENÉ HODNOTY'),additional:ids('Další technické údaje'),facility:!!document.getElementById('rz_manufacturerFacility'),duplicate:!!document.getElementById('rz_working_envelopes'),norms:revizeSuggestValues('norma'),makers:revizeSuggestValues('vyrobce')};
 revizeStepIndex=1;setupRevizeWizard();return out;
 });
 assert.deepEqual(initial.base,['rz_vyska_podlahy','rz_pracovni_vyska','rz_bocni_dosah','rz_nosnost','rz_nosnost_osoby','rz_bocni_sila']);
 assert.deepEqual(initial.reduced.slice(0,6),initial.base.map(k=>k.replace('rz_','rz_venkovni_')));
 assert.ok(initial.additional.includes('rz_hmotnost')&&initial.additional.includes('rz_motohodiny'));assert.equal(initial.facility,false);assert.equal(initial.duplicate,false);assert.ok(initial.norms.length>1&&initial.makers.some(x=>x.includes('OMME')));
 const norma=page.locator('#rz_norma');await norma.fill('ČSN');await norma.locator('..').locator('.smart-suggest-item').first().waitFor();
 await norma.locator('..').locator('.smart-suggest-item').first().click();await norma.fill('MANUAL STANDARD');
 await page.locator('#rz_vyrobce').fill('OMME');await page.locator('#rz_vyrobce').locator('..').locator('.smart-suggest-item').first().waitFor();await page.locator('#rz_vyrobce').locator('..').locator('.smart-suggest-item').first().click();await page.locator('#rz_vyrobce').fill('Custom editable maker');
 const result=await page.evaluate(async()=>{
 document.getElementById('rz_rok_vyroby').value='2024';syncNormaFromRokVyroby(true);
 const collected=collectRevizeDraft();const load=revizePaperHtml(collected);
 const outdoor=revizePaperHtml({...collected,limitVariantKind:'indoorOutdoor'});
 const one={...collected};for(const k of REVIZE_WORK_KEYS)one['venkovni_'+k]='';const single=revizePaperHtml(one);
 const legacy={workingEnvelopes:[{mode:'unrestricted',capacity:'230',persons:'2',floorHeight:'8',workHeight:'10',reach:'4'},{mode:'restricted',capacity:'340',persons:'1',floorHeight:'6',workHeight:'8',reach:'3'}],manufacturerFacility:{displayLabel:'Legacy manufacturer'},makerPlateAuthoritative:false};
 const before=JSON.stringify(legacy),mapped=revizeMapWorkingParameters(legacy);
 const saved=await saveRevizeRecord({...collected,id:'reopen'});if(!saved.local)throw Error('Local save failed');revizeData=await readRevizeDurableBackup();openRevizeForm('reopen');const reopened=collectRevizeDraft();
 return {collected,reopened,load,outdoor,single,mapped,immutable:JSON.stringify(legacy)===before,loads:revizeCalculatedLoads('230',collected)};
 });
 assert.equal(result.collected.norma,'MANUAL STANDARD');assert.equal(result.reopened.norma,'MANUAL STANDARD');assert.ok(!('workingEnvelopes' in result.reopened));assert.equal(result.collected.vyrobce,'Custom editable maker');assert.equal(result.collected.provozovatel,'Operator unchanged');assert.ok(!('workingEnvelopes'in result.collected));
 assert.match(result.load,/Při zvýšeném zatížení pracovního koše/);assert.doesNotMatch(result.load,/revize-working-envelope-row|Neomezená pracovní obálka:/);assert.match(result.load,/při 230 kg/);assert.match(result.load,/při 340 kg/);assert.match(result.load,/MANUAL STANDARD/);
 assert.match(result.outdoor,/maximální rychlosti větru 12,5 m\/s/);assert.match(result.outdoor,/8 m \(6 m\)/);assert.doesNotMatch(result.outdoor,/Při zvýšeném zatížení/);assert.doesNotMatch(result.single,/revize-variant-note/);
 assert.equal(result.mapped.nosnost_osoby,'2');assert.equal(result.mapped.venkovni_nosnost_osoby,'1');assert.equal(result.mapped.vyrobce,'Legacy manufacturer');assert.equal(result.immutable,true);assert.equal(errors.length,0,errors.join('\n'));
 console.log('revision-working-parameters: field order, editable suggestions, manual standard, legacy mapping, canonical save/reopen and distinct PDF modes passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
