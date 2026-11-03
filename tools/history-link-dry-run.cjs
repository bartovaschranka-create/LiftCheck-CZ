// Read-only proposal generator. No Firebase, network, writes or migration code.
const {createHash}=require('node:crypto');
const normalize=value=>String(value||'').normalize('NFKC').toUpperCase().replace(/[\s\-–—]+/g,'');
function previewHistoryLinks(collections){
 if(!collections||Array.isArray(collections)||typeof collections!=='object')throw new Error('Expected an object of collection arrays.');
 const groups=new Map(),review=[];
 for(const [collection,rows] of Object.entries(collections)){
  if(!Array.isArray(rows))throw new Error('Collection must be an array: '+collection);
  rows.forEach((record,index)=>{
   const document={collection,index,id:record.id??null};
   const serial=normalize(record.serial||record.vc||record.vyrobni_cislo||record.vyrobniCislo||record.sn);
   if(!serial){review.push({reason:'missing_serial',document});return;}
   if(record.id==null||record.id==='')review.push({reason:'missing_document_id',document,serial});
   if(!groups.has(serial))groups.set(serial,[]);
   groups.get(serial).push({document,originalSerial:record.serial||record.vc||record.vyrobni_cislo||record.vyrobniCislo||record.sn,maker:normalize(record.maker||record.vyrobce),model:normalize(record.model||record.typ||record.type)});
  });
 }
 const proposals=[];
 for(const [serial,records] of groups){
  const makers=[...new Set(records.map(r=>r.maker).filter(Boolean))].sort(),models=[...new Set(records.map(r=>r.model).filter(Boolean))].sort();
  const documents=records.map(r=>({...r.document,originalSerial:r.originalSerial}));
  const ids=documents.filter(d=>d.id!=null).map(d=>d.collection+':'+d.id);
  if(makers.length>1||models.length>1||new Set(ids).size!==ids.length){review.push({reason:'conflicting_machine_identity',serial,makers,models,documents});continue;}
  proposals.push({proposedMachineId:'machine_'+createHash('sha256').update(serial).digest('hex').slice(0,20),serial,documents,requiresApproval:true,identityNotVerified:true});
 }
 return {readOnly:true,proposals,review};
}
module.exports={previewHistoryLinks};
if(require.main===module){
 const file=process.argv[2];
 if(!file){console.error('Usage: node tools/history-link-dry-run.cjs <explicitly-approved-local-export.json>');process.exitCode=1;}
 else{try{const data=JSON.parse(require('node:fs').readFileSync(file,'utf8'));process.stdout.write(JSON.stringify(previewHistoryLinks(data),null,2)+'\n');}catch(error){console.error(error.message);process.exitCode=1;}}
}
