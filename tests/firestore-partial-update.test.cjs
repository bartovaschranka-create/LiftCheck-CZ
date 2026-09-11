const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const code=html.slice(html.indexOf('async function setAndVerifyFirestoreRest('),html.indexOf('function cloudSaveResult('));
let saved, requests=[];
const context=vm.createContext({URL,console,window:{fetch:true},firebaseAvailable:true,db:{},setTimeout:()=>{},
  firestoreRestDocUrl:()=> 'https://example.invalid/doc?key=test',
  firestoreRestFields:record=>Object.fromEntries(Object.entries(record).map(([k,v])=>[k,{stringValue:JSON.stringify(v)}])),
  withTimeout:p=>p,isIOSFirestoreTransportDevice:()=>true,
  fetch:async(url,options)=>{
    const parsed=new URL(url);requests.push({method:options.method,url:parsed});
    if(options.method==='PATCH'){
      const fields=JSON.parse(options.body).fields,mask=parsed.searchParams.getAll('updateMask.fieldPaths');
      if(mask.length){for(const key of mask){const name=key.slice(1,-1).replace(/\\(.)/g,'$1');saved[name]=fields[name];}}
      else saved=fields;
    }else assert.equal(parsed.searchParams.has('updateMask.fieldPaths'),false,'Read URL must not contain write-only mask');
    return {ok:true,json:async()=>({fields:saved})};
  }});
vm.runInContext(code,context);
(async()=>{
  const original={serial:'TEST SERIAL',photos:[{url:'TEST PHOTO'}],signature:'TEST SIGNATURE',nosnost:'old'};
  saved=context.firestoreRestFields(original);
  const retained=JSON.parse(JSON.stringify(saved));
  await context.patchAndVerifyFirestore('revize','test',{nosnost:'new',staticka_zatez:'new'},'test');
  for(const key of ['serial','photos','signature'])assert.deepEqual(saved[key],retained[key],key+' must survive partial update');
  assert.equal(saved.nosnost.stringValue,JSON.stringify('new'));
  await context.patchAndVerifyFirestore('revize','test',{'name.with.dot':'literal'},'test');
  assert.ok(saved['name.with.dot']);
  const count=requests.length;
  await assert.rejects(context.patchAndVerifyFirestore('revize','test',{},'test'));
  assert.equal(requests.length,count,'Empty patch must not replace a document');
  await context.setAndVerifyFirestoreRest('revize','test',{serial:'replacement'},'test');
  assert.deepEqual(Object.keys(saved),['serial'],'Full saves retain replacement semantics');
  console.log('firestore-partial-update: existing fields/photos/signatures preserved; masks, empty patch and full replacement passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
