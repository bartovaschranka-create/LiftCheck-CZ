const assert=require('node:assert/strict');
const {preview}=require('../revision-data-corrections.js');
const rows=[
{id:'a',protokol:'180RZ/26',vyrobni_cislo:'GS32D-12909',vyska_podlahy:'8,10',nosnost_osoby:'2'},
{id:'b',protokol:'164RZ/26',vyrobni_cislo:'0300292720',pracovni_vyska:'25',vyska_podlahy:'24,38'},
{id:'c',protokol:'169RZ/26',vyrobni_cislo:'Z4525XCM-1846',nosnost:'454',venkovni_nosnost:'300',nosnost_osoby:'3',venkovni_nosnost_osoby:'2',workingEnvelopes:[{capacity:'454',persons:'3',reach:'7,55'},{capacity:'300',persons:'2',reach:'5,87'}]},
{id:'d',protokol:'185RZ/26',vyrobni_cislo:'1200050265',nosnost:'230',venkovni_nosnost:'',stoupavost_stupne:'5',stoupavost_procento:'25'}
];
const original=JSON.stringify(rows),plans=preview(rows).filter(r=>r.status==='change');assert.equal(JSON.stringify(rows),original);
assert.equal(plans.find(r=>r.id==='a').patch.vyska_podlahy,'6,13');
const corrected=rows.map(r=>({...r,...plans.find(p=>p.id===r.id)?.patch}));
assert.ok(preview(corrected).every(p=>p.status!=='change'),'Migration must be idempotent');
assert.equal(corrected[2].nosnost_osoby,'3');assert.equal(corrected[2].workingEnvelopes[0].persons,'3');assert.equal(corrected[2].workingEnvelopes[0].reach,'5,87');
assert.equal(corrected[3].venkovni_nosnost,'','Unverified ES2632 outdoor capacity must stay unchanged');
assert.equal(preview([...rows,{...rows[0],id:'duplicate'}]).find(p=>p.protocol==='180RZ/26').status,'ambiguous');
assert.equal(preview([{...rows[0],vyrobni_cislo:'wrong'}]).find(p=>p.protocol==='180RZ/26').status,'not-found');
console.log('revision-data-corrections: exact pair, duplicates, immutable dry run, idempotency, person preservation and unverified capacity protection passed');
