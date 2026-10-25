import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {create,flush,ownNames,boot,fn} from './helpers.mjs';

test('pending play requests start one welcome track',async()=>{
  const t=create(),p=t.build();t.select(p,'fixture.mp4');
  t.c.welcomeHook();t.c.welcomeHook();t.c.welcomeHook();assert.equal(t.audios[0].plays,1);
  t.audios[0].pending[0].resolve();await flush();t.c.welcomeHook();assert.equal(t.audios[0].plays,1);
});
test('policy rejection can retry without competing entry starts',async()=>{
  const t=create(),p=t.build();t.select(p,'fixture.mp4');t.c.welcomeHook();t.audios[0].pending[0].reject(new Error('policy'));await flush();
  t.bus.emit('pointerdown');t.c.welcomeHook();t.c.welcomeHook();assert.equal(t.audios[0].plays,2);
});
test('own-voice clips do not receive an extra welcome near their end',()=>{
  assert.ok(ownNames.length);
  for(const name of ownNames){const t=create(),p=t.build(),v=t.select(p,name);for(const remaining of [3,.6,.01,0]){v.duration=8;v.currentTime=8-remaining;t.bus.emit('pointerdown');t.c.welcomeHook();t.c.welcomeHook();}assert.equal(t.audios[0].plays,0);assert.equal(v.pauses,0);assert.equal(v.muted,false);}
});
test('old previews cannot restart their voice',async()=>{
  const t=create(),p=t.build();t.select(p,'fixture.mp4');const old=t.c.welcomeHook;old();t.audios[0].pending[0].reject(new Error('policy'));await flush();
  const p2=t.build();t.select(p2,ownNames[0]);t.bus.emit('pointerdown');t.bus.emit('keydown');old();p.video().emit('ended');t.c.welcomeHook();
  assert.equal(t.audios[0].plays,1);assert.equal(t.audios[1].plays,0);assert.equal(t.audios[0].pauses,1);
  for(let i=0;i<5;i++)t.build();assert.equal(t.bus.events.get('pointerdown').size,1);assert.equal(t.bus.events.get('keydown').size,1);
});
test('welcome-off blocks autoplay, keys, clicks and fallback calls',()=>{
  const t=create({enabled:false}),p=t.build();t.select(p,'fixture.mp4');t.c.welcomeHook();t.bus.emit('pointerdown');t.bus.emit('keydown');assert.equal(t.audios.length,0);
});
test('existing sound-off behavior remains silent',()=>{
  const t=create({sound:false}),p=t.build();t.select(p,'fixture.mp4');t.c.welcomeHook();assert.equal(t.audios[0].plays,0);
});
test('preview welcome setting and removed legacy setting are respected',()=>{
  const c={options:{welcomeEnabled:false,clickToEnter:true,sound:true,showHint:true},FADE_MS:2000,ENTER_MODE:'tail',SOUND_ON:true,WELCOME_ENABLED:true,CLICK_TO_ENTER:false,SHOW_HINT:true,computeHints(){}};
  vm.createContext(c);vm.runInContext(fn(boot,'applyPreviewSettings')+'\napplyPreviewSettings(options)',c);assert.equal(c.WELCOME_ENABLED,false);assert.equal(c.CLICK_TO_ENTER,false);
  c.options.welcomeEnabled=true;vm.runInContext('applyPreviewSettings(options)',c);assert.equal(c.WELCOME_ENABLED,true);
});
test('both settings views show welcome and omit the retired checkbox',()=>{
  const s=fs.readFileSync(new URL('../src/client.js',import.meta.url),'utf8');
  assert.ok(s.includes("['welcomeEnabled', '播放欢迎语'"));assert.ok(s.includes("toggle('welcomeEnabled', '播放欢迎语'"));assert.ok(!s.includes('点鼠标直接进入'));
});
