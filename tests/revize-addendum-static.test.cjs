const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

for(const text of [
  'Pracovní obálka podle zatížení koše',
  'Snížená výška podlahy koše (m)',
  'Ověřovací zkouška',
  'Pravidelná zkouška',
  'Zahájení / ukončení revize',
  'Zahájení / ukončení kontroly',
  'Zeppelin CZ s.r.o. - Zeppelin CZ s.r.o. Lipová 72, 251 01 Modletice'
]) assert.ok(html.includes(text),`Missing required output text: ${text}`);

for(const key of ['workingEnvelopes','revizeStartDate','revizeEndDate','kontrolaStartDate','kontrolaEndDate']){
  assert.ok(html.includes(key),`Missing backward-compatible data key: ${key}`);
}

assert.ok(html.includes('padding:12mm 9mm 6mm!important'),'print content is shifted down without changing total vertical padding');
assert.ok(html.includes("result==='VYHOVUJE'?'je':'není'"),'binary final evaluation remains unchanged');
console.log('revize-addendum-static: all tests passed');
