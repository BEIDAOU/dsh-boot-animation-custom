import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('client bundle matches the published source',()=>{
  const id=JSON.parse(read('package.json')).name;
  const expected='window.__ModuleLoader__.load({ id: '+JSON.stringify(id)+', factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;\n'+read('src/client.js')+'\nreturn module.exports; } });\n';
  assert.equal(read('lib/client.js'),expected);
});
test('browser scripts parse, package JSON has no BOM',()=>{
  new vm.Script(read('src/boot-screen.js'));new vm.Script(read('lib/client.js'));const text=read('package.json');assert.notEqual(text.charCodeAt(0),0xfeff);assert.ok(JSON.parse(text).dsh.bundle.patch);
});
