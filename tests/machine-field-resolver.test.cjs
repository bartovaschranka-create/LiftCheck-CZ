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

console.log('machine-field-resolver: all tests passed');
