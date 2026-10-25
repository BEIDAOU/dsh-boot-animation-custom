import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
export const boot=fs.readFileSync(new URL('../src/boot-screen.js',import.meta.url),'utf8');
export function fn(source,name){const m=source.match(new RegExp('^( +)function '+name+'\\([^\\n]*\\) \\{[\\s\\S]*?^\\1\\}','m'));assert.ok(m,'Missing '+name);return m[0];}
export const ownNames=Object.keys(vm.runInNewContext('('+boot.match(/var CLIPS_WITH_OWN_SOUND = (\{[^\r\n]+\})/)[1]+')'));
class Element {
  constructor(tag){this.tagName=tag;this.style={};this.attrs={};this.children=[];this.events=new Map();this.pauses=0;}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  addEventListener(k,f){if(!this.events.has(k))this.events.set(k,new Set());this.events.get(k).add(f);}
  removeEventListener(k,f){this.events.get(k)?.delete(f);}
  appendChild(child){this.children.push(child);child.parentNode=this;return child;}
  pause(){this.pauses++;}
  emit(k){for(const f of this.events.get(k)||[])f({type:k,target:this});}
}
export function create({enabled=true,sound=true}={}){
  const bus=new Element('window'),audios=[];
  function Audio(){this.plays=0;this.pauses=0;this.currentTime=0;this.pending=[];audios.push(this);this.load=()=>{};this.pause=()=>this.pauses++;this.play=()=>{this.plays++;return new Promise((resolve,reject)=>this.pending.push({resolve,reject}));};}
  const c={document:{createElement:t=>new Element(t)},window:bus,Audio,style:()=>'',SHOW_HINT:true,SOUND_ON:sound,WELCOME_ENABLED:enabled,WELCOME_SRC:'data:audio/mpeg;base64,fixture',WELCOME_VOLUME:.45,WELCOME_LEAD_S:3,welcomeHook:null,welcomeCleanup:null,ENTER_MODE:'tail',BRAND_TITLE:'fixture',SOUND_TEXT_OFF:'off',SOUND_HINT_OFF:'off',SOUND_NAME:'sound'};
  vm.createContext(c);vm.runInContext(fn(boot,'build'),c);
  const build=()=>vm.runInContext('build()',c);
  const select=(p,name)=>{const v=new Element('video');v.currentSrc='http://fixture.invalid/clip/'+encodeURIComponent(name)+'?v=1';v.src=v.currentSrc;v.muted=false;v.paused=false;p.replaceVideo(v);return v;};
  return {c,bus,audios,build,select};
}
export const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
