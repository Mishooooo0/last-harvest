import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createGameServer,SAVE_SLOTS} from './serve.mjs';
import {openSaveStorage} from './dist/save-files.js';
import {FarmSaveStore} from './dist/save-store.js';
let passed=0;
const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
// A real game server on a free port, with a throwaway saves folder.
const start=async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'lh-saves-')),server=createGameServer({savesDir:dir});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {dir,server,base:`http://127.0.0.1:${server.address().port}`};};
const stop=async({dir,server})=>{server.closeAllConnections();await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});};
const game=await start(),{dir,base}=game;
const put=(slot,body,headers={})=>fetch(base+'/api/saves/'+slot,{method:'PUT',headers:{'Content-Type':'application/json',...headers},body});
try{
 await test('the game server serves the game and starts with empty save slots',async()=>{
  assert.equal((await fetch(base+'/')).status,200);
  const {slots}=await (await fetch(base+'/api/saves')).json();
  assert.deepEqual(Object.keys(slots),SAVE_SLOTS);assert.ok(Object.values(slots).every(v=>v===null));
 });
 await test('a save is written as a file in the saves folder and read back',async()=>{
  const raw=JSON.stringify({format:'last-harvest-colony',s:{day:4}});
  assert.equal((await put('manual-1',raw)).status,204);
  assert.equal(await readFile(path.join(dir,'manual-1.json'),'utf8'),raw);
  assert.equal((await (await fetch(base+'/api/saves')).json()).slots['manual-1'],raw);
  assert.ok(!(await readdir(dir)).some(f=>f.endsWith('.writing')),'No half-written files are left');
 });
 await test('only real slots, JSON saves and the game page itself are accepted',async()=>{
  assert.equal((await put('..%2Fevil','{}')).status,404);assert.equal((await put('manual-9','{}')).status,404);
  assert.equal((await put('auto','not json')).status,400);
  assert.equal((await put('auto','{}',{Origin:'https://example.com'})).status,403,'Another website cannot write saves');
  assert.equal((await fetch(base+'/api/saves',{headers:{Origin:'https://example.com'}})).status,403,'or read them');
  assert.equal((await put('auto','{}',{Origin:base})).status,204,'The game page can');
  assert.equal((await fetch(base+'/api/saves/auto')).status,405);
  assert.ok(!(await readdir(dir)).some(f=>!/^(manual-[123]|auto|previous)\.json$/.test(f)),'Nothing else lands in the folder');
 });
 await test('the game store saves through the folder and keeps the previous autosave',async()=>{
  const opened=await openSaveStorage({base,local:null});assert.equal(opened.where,'folder');
  const store=new FarmSaveStore(opened.storage),a=JSON.stringify({savedAt:'2026-10-17T10:00:00Z',s:{day:5}}),b=JSON.stringify({savedAt:'2026-10-17T11:00:00Z',s:{day:6}});
  store.write(a,'auto');store.write(b,'auto');await opened.flush();
  for(let i=0;i<8;i++)opened.storage.setItem('last-harvest-save-manual-3',JSON.stringify({n:i}));await opened.flush();
  assert.equal(await readFile(path.join(dir,'manual-3.json'),'utf8'),'{"n":7}','Quick saves to one slot land in order');
  assert.equal(await readFile(path.join(dir,'auto.json'),'utf8'),b);assert.equal(await readFile(path.join(dir,'previous.json'),'utf8'),a);
  const again=await openSaveStorage({base,local:null});assert.equal(new FarmSaveStore(again.storage).latest(),b,'The latest farm loads after a restart');
 });
}finally{await stop(game);}
await test('farms saved in the browser move into an empty saves folder, once',async()=>{
 const other=await start(),local=new Map([['last-harvest-save-manual-2','{"s":{"day":3}}'],['last-harvest-colony-save-v1','{"s":{"day":2}}']]),browser={getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)};
 try{
  const opened=await openSaveStorage({base:other.base,local:browser});assert.equal(opened.moved,2);await opened.flush();
  assert.equal(await readFile(path.join(other.dir,'manual-2.json'),'utf8'),'{"s":{"day":3}}');assert.equal(await readFile(path.join(other.dir,'auto.json'),'utf8'),'{"s":{"day":2}}');
  assert.equal((await openSaveStorage({base:other.base,local:browser})).moved,0,'Only the first time');
 }finally{await stop(other);}
});
await test('without the game server, saves stay in the browser',async()=>{
 const browser={getItem:()=>null,setItem(){}},opened=await openSaveStorage({base:'http://127.0.0.1:9',local:browser});
 assert.equal(opened.where,'browser');assert.equal(opened.storage,browser);
});
console.log(`${passed} save-file test groups passed.`);
