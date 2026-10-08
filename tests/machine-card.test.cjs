const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.route('**/*',route=>{const u=new URL(route.request().url()),p=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.abort();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:4179/index.html');
 await page.evaluate(()=>{
 firebaseAvailable=false;window.cardCalls=[];
 const repair={id:'repair-test',finishedAt:'2026-10-08',tech:'Technik',place:'Brno',work:'Výměna spínače <test> '+ 'Kontrola funkce. '.repeat(40)};
 window.cardFixture={protocols:[{id:'protocol-test',datum:'2026-10-08',umisteni:'Brno'}],revize:[{id:'revision-test',datum_kontroly:'2026-10-08',protokol:'139RZ/26'}],faults:[{id:'fault-test',date:'2026-10-08',description:'Popis závady '+ 'Text '.repeat(100)}],parts:[{id:'part-test',partNumber:'PN-1',partName:'Spínač',note:'Poznámka '+ 'ND '.repeat(100)}],repairs:[repair,{id:'empty',tech:'Technik'}]};
 window.cardBefore=JSON.stringify(cardFixture);
 getMachineRows=()=>cardFixture;getMachineState=()=>({cls:'',txt:'Test'});loadLocalRepairs=()=>cardFixture.repairs;
 openPreviewById=id=>cardCalls.push(['protocol',id]);printRevizeById=id=>cardCalls.push(['revision',id]);openFaultReportPreview=id=>cardCalls.push(['fault-preview',id]);openFaultForm=id=>cardCalls.push(['fault-edit',id]);openFaultsModal=()=>{};printRepairRecord=rec=>cardCalls.push(['repair',rec.id]);openPartsModal=()=>{};closePartForm=()=>{};scrollToPartCard=id=>cardCalls.push(['part',id]);
 openHistoryModal('TEST');
 });
 assert.match(await page.locator('#historyBody').innerText(),/Provedená oprava: Výměna spínače <test>/);
 assert.equal(await page.locator('#historyBody .machine-card-summary').count(),3);
 const geometry=await page.evaluate(()=>[...els.historyBody.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}));
 assert.ok(geometry.every(r=>r.left>=0&&r.right<=390&&r.width>0),JSON.stringify(geometry));
 for(const [selector,kind,id] of [['[data-repair-print="repair-test"]','repair','repair-test'],['[data-open-id]','protocol','protocol-test'],['[data-revize-print]','revision','revision-test'],['[data-fault-preview]','fault-preview','fault-test'],['[data-fault-open]','fault-edit','fault-test'],['[data-part-open]','part','part-test']]){
 await page.evaluate(()=>openHistoryModal('TEST'));await page.locator('#historyBody '+selector).click();
 assert.deepEqual(await page.evaluate(()=>cardCalls.at(-1)),[kind,id]);
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(cardFixture)===cardBefore),true);
 console.log('machine-card: summaries, existing preview/edit routing, unchanged records and all actions within 390px passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
