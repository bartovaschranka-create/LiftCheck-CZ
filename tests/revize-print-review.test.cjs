const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.CODEX_NODE_MODULES,'playwright'));
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.LIFTCHECK_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const context=await browser.newContext({serviceWorkers:'block'});
  await context.route('**/*',route=>{const u=new URL(route.request().url()),p=path.resolve(root,'.'+u.pathname);return u.origin==='http://127.0.0.1:4179'&&p.startsWith(root+path.sep)&&fs.existsSync(p)?route.fulfill({path:p}):route.abort();});
  const page=await context.newPage();await page.goto('http://127.0.0.1:4179/index.html');
  const result=await page.evaluate(()=>{
   firebaseAvailable=false;
   const base={...revizeDefaultRecord(),id:'PRINT-TEST',protokol:'PRINT-TEST',model:'GS-2032',typ_zarizeni:'scissor',nosnost:'363',venkovni_nosnost:'363',venkovni_omezeni:'ANO',venkovni_vitr:'12,5',pracovni_vyska:'8,13',vyska_podlahy:'6,13',venkovni_pracovni_vyska:'6,88',venkovni_vyska_podlahy:'4,88',nosnost_osoby:'2',venkovni_nosnost_osoby:'1'};
   Object.assign(base,{vyrobce:'Výrobce pracovních plošin, evropská výrobní pobočka',umisteni:'Testovací provozovna, Průmyslová ulice 1234/56, 100 00 Testovací město',vyrobni_cislo:'TEST-SERIAL-001',evidencni_cislo:'TEST-EVIDENCE-001',nabijec:'ANO',zasuvka_kos:'ANO',rcd:'ANO',deck:'ANO',stabilizatory:'ANO'});
   const z={...base,model:'GENIE Z-45/25 XC',typ_zarizeni:'articulated',nosnost:'454',venkovni_nosnost:'300',nosnost_osoby:'3',venkovni_nosnost_osoby:'2',bocni_dosah:'5,87',venkovni_bocni_dosah:'7,55',pracovni_vyska:'15,86',vyska_podlahy:'13,86',venkovni_pracovni_vyska:'15,86',venkovni_vyska_podlahy:'13,86'};
   // Use the canonical model spelling for the legacy geometry regression.
   const envelopes=revizeWorkingEnvelopesForRecord({...z,model:'Z-45/25 XC'});
   const jlg={...base,model:'JLG 660 SJ',typ_zarizeni:'telescopic',nosnost:'250',venkovni_nosnost:'340'};
   const unknown={...jlg,venkovni_nosnost:'250'};
   const original=JSON.stringify([base,z,jlg,unknown]);
   const texts=[base,z,jlg,unknown].map(r=>{const t=document.createElement('div');t.innerHTML=revizePaperHtml(r);return t.textContent;});
   if(JSON.stringify([base,z,jlg,unknown])!==original)throw Error('Print mutated records');
   revizeData=[base];openRevizeForm(base.id);
   const select=document.getElementById('rz_limitVariantKind');if(!select)throw Error('Variant selector missing');select.value='loadEnvelope';
   const collected=collectRevizeDraft();
   const output={texts,envelopes,kind:collected.limitVariantKind,explicit:revizeLimitVariantKind({...jlg,limitVariantKind:'outdoor'}),manufacturerCount:manufacturerDirectory().length,warnings:revisionWarnings({...base,pracovni_vyska:'20',vyska_podlahy:'6'}),styles:getRevizePrintStyles(),html:[{...base,protokol:'180RZ/26'},{...z,protokol:'169RZ/26'},jlg,unknown,{...base,protokol:'164RZ/26',model:'800AJ',typ_zarizeni:'articulated',pracovni_vyska:'26,38',vyska_podlahy:'24,38',venkovni_omezeni:'NE',venkovni_nosnost:''},{...base,protokol:'185RZ/26',model:'ES2632',pracovni_vyska:'9,77',vyska_podlahy:'7,77'},{...base,protokol:'154RZ/26',model:'Toucan 12E',typ_zarizeni:'mast',skupina:'B/3',venkovni_omezeni:'NE',venkovni_nosnost:'',druh_kontroly:'Ověřovací'}].map(revizePaperHtml).join('')};return output;
  });
  assert.ok(result.manufacturerCount>=11);assert.ok(result.warnings.some(w=>w.includes('2 m')));
  assert.match(result.texts[0],/dvojice: uvnitř \/ venku/);
  assert.match(result.texts[0],/12,5 m\/s/);
  assert.match(result.texts[1],/zatížení koše 454 kg \/ 300 kg/);
  assert.match(result.texts[2],/zatížení koše 250 kg \/ 340 kg/);
  assert.match(result.texts[3],/podmínky použití ověřit/);
  assert.equal(result.envelopes[0].reach,'7,55');assert.equal(result.envelopes[1].reach,'5,87');
  assert.equal(result.envelopes[0].persons,'2');assert.equal(result.kind,'loadEnvelope');assert.equal(result.explicit,'outdoor');
  await page.setContent('<style>'+result.styles+'</style>'+result.html);await page.emulateMedia({media:'print'});
  assert.match(await page.locator('.revize-kind-badge').last().textContent(),/OVĚŘOVACÍ/);
  const layout=await page.evaluate(()=>[...document.querySelectorAll('.revize-paper')].map(p=>{const b=p.getBoundingClientRect(),footer=p.querySelector('.revize-page-no').getBoundingClientRect();return {height:p.clientHeight,scroll:p.scrollHeight,overflow:p.scrollHeight>p.clientHeight+1,overlap:[...p.children].filter(e=>!e.classList.contains('revize-page-no')).some(e=>e.getBoundingClientRect().bottom>footer.top+1),badge:p.querySelector('.revize-kind-badge')?.getBoundingClientRect().top-b.top};}));
  assert.equal(layout.length,14);assert.ok(layout.every(p=>!p.overflow&&!p.overlap),JSON.stringify(layout));assert.ok(layout.filter(p=>Number.isFinite(p.badge)).every(p=>p.badge>=8*96/25.4-1));
  if(process.env.LIFTCHECK_PRINT_SCREENSHOT)await page.locator('.revize-paper').first().screenshot({path:process.env.LIFTCHECK_PRINT_SCREENSHOT});
  console.log('revize-print-review: variant labels, explicit selection, legacy geometry pairing, immutable records and fourteen A4 page layouts passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
