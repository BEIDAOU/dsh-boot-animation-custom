import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {apply,Config} from '../entry.js';
function inject(config){
  const handlers=new Map();
  const ctx={webServer:{register(){return ()=>{};}},effect:f=>f(),on(n,f){handlers.set(n,f);return ()=>{};},logger:{warn(){},error(){}}};
  apply(ctx,config);
  return ()=>{const rows=[];handlers.get('webserver/index-inject')(rows);if(!rows.length)return null;const c={};vm.createContext(c);vm.runInContext(rows[0].text,c);return c.__DSH_BOOT_ANIM_CFG__;};
}
test('welcome has a volatile, default-on Host setting',()=>{
  const s=Config.toJSON(),field=s.refs[s.refs[s.uid].dict.welcomeEnabled];assert.equal(field.meta.default,true);assert.equal(field.meta.volatile,true);
});
test('Host handles missing, enabled and disabled welcome values',()=>{
  assert.equal(inject({})().welcomeEnabled,true);assert.equal(inject({welcomeEnabled:true})().welcomeEnabled,true);assert.equal(inject({welcomeEnabled:false})().welcomeEnabled,false);
});
test('Host reads live values without restarting the plugin fiber',()=>{
  let value=false;const ref={get:()=>value,[Symbol.for('cosmokit.volatile.write')]:()=>{}};const render=inject({welcomeEnabled:ref});assert.equal(render().welcomeEnabled,false);value=true;assert.equal(render().welcomeEnabled,true);
});
test('disabled animation injects nothing',()=>assert.equal(inject({enabled:false})(),null));
