/* Explicit, idempotent corrections. No cloud writes occur when this file loads. */
(function(root){
 const specifications=[
 ['180RZ/26','GS32D-12909',{vyska_podlahy:'6,13'}],
 ['164RZ/26','0300292720',{pracovni_vyska:'26,38',vyska_podlahy:'24,38'}],
 ['142RZ/26','GS32D-12498',{pohon:'Bateriový',napajeni:'24 V DC'}],
 ['197RZ/26','GS90D-3666',{napajeni:'12 V DC'}],
 ['154RZ/26','A300065695',{skupina:'B/3'}],
 ['151RZ/26','0300330777',{stoupavost_stupne:'',stoupavost_procento:'45'}],
 ['141RZ/26','0300326094',{stoupavost_stupne:'',stoupavost_procento:'45'}],
 ['140RZ/26','C300001355',{stoupavost_stupne:'',stoupavost_procento:'45'}],
 ['185RZ/26','1200050265',{stoupavost_stupne:'',stoupavost_procento:'25'}],
 ['184RZ/26','1200050264',{stoupavost_stupne:'',stoupavost_procento:'25'}]
 ];
 function preview(rows){
  const result=[];
  for(const [protocol,serial,changes] of specifications){
   const matches=rows.filter(r=>r.protokol===protocol && r.vyrobni_cislo===serial && !r.deleted);
   if(matches.length!==1){result.push({protocol,serial,status:matches.length?'ambiguous':'not-found'});continue;}
   const row=matches[0],patch={};
   for(const [key,value] of Object.entries(changes))if(String(row[key]??'')!==value)patch[key]=value;
   result.push({id:row.id,protocol,serial,status:Object.keys(patch).length?'change':'unchanged',patch,before:Object.fromEntries(Object.keys(patch).map(k=>[k,row[k]??null])),syncRevision:row.syncRevision || 0});
  }
  // Capacity order and associated person counts are retained; only reach is corrected.
  const z45=rows.filter(r=>r.protokol==='169RZ/26' && r.vyrobni_cislo==='Z4525XCM-1846' && !r.deleted);
  if(z45.length!==1)result.push({protocol:'169RZ/26',serial:'Z4525XCM-1846',status:z45.length?'ambiguous':'not-found'});
  for(const row of z45.length===1 ? z45 : []){
   const number=v=>Number(String(v||'').replace(',','.').match(/[0-9.]+/)?.[0]);
   const patch={limitVariantKind:'loadEnvelope'};
   if(number(row.nosnost)===300)patch.bocni_dosah='7,55';
   if(number(row.nosnost)===454)patch.bocni_dosah='5,87';
   if(number(row.venkovni_nosnost)===300)patch.venkovni_bocni_dosah='7,55';
   if(number(row.venkovni_nosnost)===454)patch.venkovni_bocni_dosah='5,87';
   if(Array.isArray(row.workingEnvelopes)){const envelopes=row.workingEnvelopes.map(e=>({...e,...(number(e.capacity)===300 ? {reach:'7,55'} : number(e.capacity)===454 ? {reach:'5,87'} : {})}));if(JSON.stringify(envelopes)!==JSON.stringify(row.workingEnvelopes))patch.workingEnvelopes=envelopes;}
   for(const k of Object.keys(patch))if(row[k]===patch[k])delete patch[k];
   result.push({id:row.id,protocol:row.protokol,serial:row.vyrobni_cislo,status:Object.keys(patch).length?'change':'unchanged',patch,before:Object.fromEntries(Object.keys(patch).map(k=>[k,row[k]??null])),syncRevision:row.syncRevision || 0});
  }
  return result;
 }
 root.LiftCheckRevisionCorrections={preview};
 if(typeof module!=='undefined')module.exports={preview};
})(typeof window!=='undefined'?window:globalThis);
