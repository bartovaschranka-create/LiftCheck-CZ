/* Values and scope supplied by the technician from the cited manufacturer documents.
   These are suggestions/defaults, never a migration of saved inspections. */
window.REVIZE_VERIFIED_SPECS = [
 {model:'GS-2032',snPrefix:'GS32D-',snFrom:10101,snTo:25100,source:'Genie Operator’s Manual PN 1307633',fields:{pracovni_vyska:'8,13',vyska_podlahy:'6,13',nosnost:'363',nosnost_osoby:'2',bocni_sila:'400',venkovni_pracovni_vyska:'6,88',venkovni_vyska_podlahy:'4,88',venkovni_nosnost:'363',venkovni_nosnost_osoby:'1',venkovni_bocni_sila:'200',venkovni_vitr:'12,5'},mode:'indoorOutdoor'},
 {model:'GS-2032',snPrefix:'GS32P-',snFrom:150575,snTo:200100,source:'Genie PN 1278042',fields:{pracovni_vyska:'7,92',vyska_podlahy:'5,92',nosnost:'363',nosnost_osoby:'2',bocni_sila:'400',venkovni_nosnost_osoby:'1',venkovni_bocni_sila:'200',venkovni_vitr:'12,5'},mode:'indoorOutdoor',unknown:['venkovni_pracovni_vyska','venkovni_vyska_podlahy']},
 {model:'GS-2046',snPrefix:'GS46D-',snFrom:20101,snTo:40100,source:'Genie PN 1307633',fields:{pracovni_vyska:'8,13',vyska_podlahy:'6,13',nosnost:'544',nosnost_osoby:'2',bocni_sila:'400',venkovni_pracovni_vyska:'6,98',venkovni_vyska_podlahy:'4,98',venkovni_nosnost:'544',venkovni_nosnost_osoby:'1',venkovni_bocni_sila:'200',venkovni_vitr:'12,5'},mode:'indoorOutdoor'},
 {model:'GS-2046',serials:['GS46P-144068'],source:'Genie PN 1278042',fields:{pracovni_vyska:'8,10',vyska_podlahy:'6,10',nosnost:'544',nosnost_osoby:'2',bocni_sila:'400',venkovni_vitr:'12,5'}},
 {model:'Z-45/25J',serials:['Z4525M-8160'],source:'Genie PN 1258825',fields:{pracovni_vyska:'16,05',vyska_podlahy:'14,05',bocni_dosah:'7,52',nosnost:'227',venkovni_vitr:'12,5'}},
 {model:'Z-45/25 XC',aliases:['Z-45 XC'],snPrefix:'Z4525XCM-',snFrom:1501,snTo:2500,source:'Genie PN 1305353',fields:{pracovni_vyska:'15,86',vyska_podlahy:'13,86',bocni_dosah:'7,55',nosnost:'300',nosnost_osoby:'2',venkovni_nosnost:'454',venkovni_nosnost_osoby:'3',venkovni_vitr:'12,5'},mode:'loadEnvelope',unknown:['venkovni_bocni_dosah']},
 {model:'660SJ',source:'JLG Operation Manual 31215033',fields:{nosnost:'250',bocni_dosah:'17,40',venkovni_nosnost:'340',venkovni_bocni_dosah:'14,61',venkovni_vitr:'12,5'},mode:'loadEnvelope'},
 {model:'1250AJP',source:'JLG Operation Manual 31215057',fields:{vyska_podlahy:'38,1',nosnost:'230',bocni_dosah:'19,3',venkovni_nosnost:'450',venkovni_bocni_dosah:'16,2'},mode:'loadEnvelope'},
 {model:'1200SJP',source:'JLG Operation Manual 31215054',fields:{nosnost:'230',venkovni_nosnost:'450',venkovni_vyska_podlahy:'35,1',venkovni_bocni_dosah:'19,8'},mode:'loadEnvelope'},
 {model:'860SJ',source:'JLG Operation Manual 31215048',fields:{vyska_podlahy:'26,21',pracovni_vyska:'28,21',bocni_dosah:'22,86',venkovni_nosnost:'340'},approximate:['vyska_podlahy','pracovni_vyska'],mode:'loadEnvelope',unknown:['venkovni_bocni_dosah']},
 {model:'460SJ',source:'Oficiální dokumentace JLG (údaje dodané technikem)',fields:{nosnost:'270',bocni_dosah:'12,07',pracovni_vyska:'16,00',vyska_podlahy:'14,00'},approximate:['bocni_dosah']},
 {model:'800AJ',source:'Oficiální dokumentace JLG (údaje dodané technikem)',fields:{nosnost:'230',bocni_dosah:'15,8',pracovni_vyska:'26,38',vyska_podlahy:'24,38'}}
];
function revizeVerifiedModelKey(value){return String(value || '').toUpperCase().replace(/GENIE|JLG/g,'').replace(/[^A-Z0-9]/g,'');}
function revizeVerifiedSpecFor(record){
 const model=revizeVerifiedModelKey(record?.model || record?.type),serial=String(record?.vyrobni_cislo || record?.serial || '').trim().toUpperCase();
 return window.REVIZE_VERIFIED_SPECS.find(spec=>{
  if(![spec.model,...(spec.aliases || [])].some(m=>revizeVerifiedModelKey(m)===model))return false;
  if(spec.serials)return spec.serials.includes(serial);
  if(spec.snPrefix){if(!serial.startsWith(spec.snPrefix))return false;const suffix=serial.slice(spec.snPrefix.length);return /^\d+$/.test(suffix) && Number(suffix)>=spec.snFrom && Number(suffix)<=spec.snTo;}
  return true;
 });
}
// Structured import defaults are separate from saved revision records.
function revizeVerifiedImportedDefaults(row){
 const spec=revizeVerifiedSpecFor(row);if(!spec)return row;
 const result={...row};
 const aliases={nosnost:'unrestrictedCapacity',nosnost_osoby:'unrestrictedCapacityPersons',bocni_dosah:'unrestrictedReach',pracovni_vyska:'unrestrictedWorkHeight',vyska_podlahy:'unrestrictedFloorHeight',venkovni_nosnost:'restrictedCapacity',venkovni_nosnost_osoby:'restrictedCapacityPersons',venkovni_bocni_dosah:'restrictedReach',venkovni_pracovni_vyska:'restrictedWorkHeight',venkovni_vyska_podlahy:'restrictedFloorHeight'};
 if(spec.mode==='loadEnvelope')for(const [field,key] of Object.entries(aliases))if(spec.fields[field]!==undefined && !Object.prototype.hasOwnProperty.call(result,key))result[key]=spec.fields[field];
 return result;
}
