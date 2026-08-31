const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const SAFETY_CRITICAL_MACHINE_FIELDS');
const end = html.indexOf('function revizeSuggestValues', start);
assert.ok(start >= 0 && end > start, 'Resolver block was not found in index.html');

const preamble = String.raw`
var revizeMachineSourceRank, revizeMachineRows, revizeLatestMachine, revizeSameModelDefaults;
var revizeMachineRowsCache = null, revizeMachineRowsCacheAt = 0;
var revizeData = [], data = [];
var window = { REVIZE_MACHINE_DB: [] };
function loadLocalRevize(){ return []; }
function loadLocalData(){ return []; }
function normalizeSearchText(v){ return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'').trim(); }
function normalizeSerial(v){ return String(v||'').replace(/\s+/g,'').trim().toLowerCase(); }
function serialMatchesCandidate(serial,candidate){ const s=normalizeSerial(serial), c=normalizeSerial(candidate); return !!s&&!!c&&(s===c||(s.length>=3&&c.includes(s))||(c.length>=3&&s.includes(c))); }
function inferRevizeDeviceType(v){ const s=normalizeSearchText(v); return s.includes('1200sjp') ? 'telescopic' : ''; }
function revizeKgValuesFromText(v){ return [...String(v||'').matchAll(/([0-9]+(?:[,.][0-9]+)?)\s*kg/gi)].map(m=>Number(m[1].replace(',','.'))); }
function revizeCapacityComposition(v){ const m=String(v||'').match(/([0-9]+)\s*os/i); return { persons:m?m[1]:'' }; }
function revizeCombinedGroup(){ return ''; }
function revizeDefaultNormy(){ return ''; }
function revizeInputValue(field,v){ return String(v??'').trim().replace('.',','); }
function normalizeBranchAddress(v){ return v; }
`;

const context = { console };
vm.createContext(context);
vm.runInContext(`${preamble}\n${html.slice(start, end)}`, context);
const resolve = context.resolveMachineField;
const plain = value => JSON.parse(JSON.stringify(value));

function result(field, options, rows){
  return resolve({ field, rows, ...options });
}

{
  const rows = [
    { source:'excel-2025-corrected-v2', protocol:'12RZ/25', serial:'ABC', model:'M1', year:'2022', capacity:'100', workHeight:'8' },
    { source:'excel-old-but-protocol-new', protocol:'12RZ/26', serial:'ABC', model:'M1', year:'2022', capacity:'200', workHeight:'' },
    { source:'app-quarterly', created:'2026-03-01', serial:'ABC', model:'M1', year:'2022', capacity:'250', workHeight:'9' },
    { source:'app-revize', created:'2026-04-01', serial:'ABC', model:'M1', year:'2022', capacity:'', workHeight:'10' }
  ];
  assert.equal(result('capacity',{serial:'ABC'},rows).value,'250','quarterly fills a field missing in the app revision');
  assert.equal(result('workHeight',{serial:'ABC'},rows).value,'10','finished app revision has first priority per field');
  assert.ok(context.revizeMachineSourceRank(rows[1]) > context.revizeMachineSourceRank(rows[0]),'protocol year overrides a misleading source label');
}

{
  const rows = [{source:'app-revize',serial:'SERIAL-100',model:'M2',year:'2024',weight:'1900'}];
  const weight = result('weight',{serial:'SERIAL-10',model:'M2',year:'2024'},rows);
  assert.equal(weight.value,'','weight must not use a partial or another serial number');
}

{
  const rows = [
    {source:'app-revize',created:'2026-05-01',serial:'A',maker:'JLG',model:'ES1932',year:'2024',capacity:'230'},
    {source:'excel',protocol:'2RZ/26',serial:'B',maker:'JLG',model:'ES1932',year:'2024',capacity:'230'},
    {source:'excel',protocol:'3RZ/26',serial:'C',maker:'JLG',model:'ES1932',year:'2024',capacity:'250'},
    {source:'app-revize',created:'2026-08-01',serial:'D',maker:'JLG',model:'ES1932',year:'2023',capacity:'320'}
  ];
  const consensus = result('capacity',{serial:'NEW',maker:'JLG',model:'ES1932',year:'2024'},rows);
  assert.equal(consensus.value,'230','same-model same-year majority wins');
  assert.equal(consensus.exactYear,true,'same manufacturing year is preferred over a newer record from another year');
}

{
  const rows = [
    {source:'excel',protocol:'1RZ/26',serial:'A',maker:'Genie',model:'GS-2646',year:'2022',capacity:'454'},
    {source:'excel',protocol:'2RZ/26',serial:'B',maker:'Genie',model:'GS-2646',year:'2022',capacity:'363'}
  ];
  const conflict = result('capacity',{serial:'NEW',maker:'Genie',model:'GS-2646',year:'2022'},rows);
  assert.equal(conflict.value,'','a tied safety-critical conflict stays blank');
  assert.equal(conflict.needsVerification,true);
}

{
  const rows = [{source:'excel',protocol:'1RZ/26',serial:'A',maker:'JLG',model:'M600JP',year:'2018',reach:'13'}];
  const oldGeneration = result('reach',{serial:'NEW',maker:'JLG',model:'M600JP',year:'2024'},rows);
  assert.equal(oldGeneration.value,'','a distant generation is not silently copied');
  assert.equal(oldGeneration.needsVerification,true);
}

assert.equal(context.revizeCorrectDeviceType('scissor','1200 SJP','JLG'),'telescopic','JLG 1200 SJP is corrected to telescopic');
assert.equal(context.revizeMachineModelMatches({model:'Z-45 XC',maker:'Genie'},{model:'Z-45/25',maker:'Genie'}),false,'model variants are not merged aggressively');

{
  const z45 = {model:'Z-45/25 XC',capacity:'12,5 m/s 454 kg (3 os. + 214 kg) 400N (neomezený dosah 300 kg)',workHeight:'16,05 m',floorHeight:'14,05 m',reach:'7,52 m'};
  const legacyCapacity = context.revizeImportedCapacityDetails(z45);
  const envelopes = context.revizeWorkingEnvelopesFromImportedRow(z45);
  assert.equal(legacyCapacity.outdoorLimited,undefined,'a load envelope is not converted to indoor/outdoor mode');
  assert.deepEqual(plain(envelopes.map(row=>[row.mode,row.capacity,row.persons])),[['unrestricted','300','2'],['restricted','454','3']]);
}

{
  const rows = [
    {source:'excel',protocol:'1RZ/26',serial:'A',maker:'JLG',model:'860 SJ',year:'2022',workingEnvelopes:[{mode:'unrestricted',capacity:'230',persons:'2'},{mode:'restricted',capacity:'340',persons:'3'}]}
  ];
  const wrongYear = result('workingEnvelopes',{serial:'NEW',maker:'JLG',model:'860 SJ',year:'2023'},rows);
  assert.equal(wrongYear.value,'','working envelopes require the same manufacturing year for model fallback');
  assert.equal(wrongYear.needsVerification,true);
}

{
  const jlg1250 = context.revizeWorkingEnvelopesFromImportedRow({model:'1250 AJP',capacity:'230 kg (2 os.), snížený dosah: 450 kg (3 os.)',workHeight:'40,1 m',floorHeight:'38,1 m',reach:'19,3 m'});
  assert.equal(jlg1250[0].floorHeight,'38,1 m');
  assert.equal(jlg1250[1].floorHeight,'38,1 m');
  assert.equal(jlg1250[1].reach,'16,2 m','1250 AJP changes reach without changing height');

  const jlg1200 = context.revizeWorkingEnvelopesFromImportedRow({model:'1200 SJP',capacity:'230 kg (2 os.)',workHeight:'38,73 m',floorHeight:'36,73 m',reach:'23,51 m'});
  assert.equal(jlg1200[0].reach,'23,51 m','the concrete Zeppelin reach is preserved');
  assert.equal(jlg1200[1].reach,'19,8 m');
  assert.equal(jlg1200[1].persons,'','persons are never calculated from capacity');

  const jlg860 = context.revizeWorkingEnvelopesFromImportedRow({model:'860 SJ',capacity:'230 kg (2 os.), 340 kg (3 os.) snížená pracovní schránka',workHeight:'28,21 m',floorHeight:'26,21 m',reach:'22,86 m'});
  assert.deepEqual(plain(jlg860.map(row=>[row.capacity,row.persons])),[['230','2'],['340','3']]);
  assert.equal(context.revizeWorkingEnvelopesFromImportedRow({model:'860 SJ HC3',capacity:'230 kg (2 os.), 340 kg (3 os.)'}).length,0,'860SJ HC3 stays a separate variant');

  const jlg660 = context.revizeWorkingEnvelopesFromImportedRow({model:'660 SJ',capacity:'250 kg (2 os.), 340 kg (3 os.)'});
  assert.deepEqual(plain(jlg660.map(row=>[row.capacity,row.persons])),[['250','2'],['340','3']]);
  assert.equal(context.revizeWorkingEnvelopesFromImportedRow({model:'660 SJ',capacity:'250 kg (2 os.)'}).length,0,'a single-value 660 SJ is not given a blind second envelope');
  assert.equal(context.revizeWorkingEnvelopesFromImportedRow({model:'ES1932',capacity:'230 kg (2 os.)'}).length,0,'ordinary scissor lift keeps the simple form');
}

console.log('machine-field-resolver: all tests passed');
