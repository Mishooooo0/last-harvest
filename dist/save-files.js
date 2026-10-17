// Farm saves live as files in the game folder's saves/ subfolder (Update 33), written through the game server
// (serve.mjs). The save store keeps working as before: this is a storage it reads and writes like the browser's.
// If the page is not served by serve.mjs (an old server still running, or a test page), saves stay in the browser.
const PREFIX='last-harvest-save-',LEGACY='last-harvest-colony-save-v1';

export async function openSaveStorage({base='',onError=null,local}={}){
 if(local===undefined){try{local=globalThis.localStorage??null;}catch{local=null;}}
 let slots;
 try{const res=await fetch(base+'/api/saves',{cache:'no-store'});if(!res.ok)throw Error(res.status);slots=(await res.json()).slots;if(!slots||typeof slots!=='object')throw Error('no slots');}
 catch{return {where:'browser',storage:local,moved:0,flush:async()=>{}};}
 const files=new Map(Object.entries(slots).filter(([,raw])=>typeof raw==='string'));
 const pending=new Set();
 // Writes to one slot go one after another, so a quick second save can never be overtaken by the first.
 const lanes=new Map();
 const write=(slot,raw)=>{const job=(lanes.get(slot)||Promise.resolve()).then(()=>fetch(base+'/api/saves/'+slot,{method:'PUT',headers:{'Content-Type':'application/json'},body:raw})).then(r=>{if(!r.ok)throw Error(r.status);}).catch(()=>onError?.(slot)).finally(()=>{pending.delete(job);if(lanes.get(slot)===job)lanes.delete(slot);});lanes.set(slot,job);pending.add(job);return job;};
 // The first time, farms saved in this browser move into the folder, so nothing is left behind.
 let moved=0;
 if(!files.size&&local)for(const slot of Object.keys(slots)){let raw=null;try{raw=local.getItem(PREFIX+slot)||(slot==='auto'?local.getItem(LEGACY):null);}catch{}if(raw){files.set(slot,raw);write(slot,raw);moved++;}}
 const storage={
  getItem(key){return key.startsWith(PREFIX)?files.get(key.slice(PREFIX.length))??null:null;},
  setItem(key,value){if(!key.startsWith(PREFIX))return;const slot=key.slice(PREFIX.length);if(!Object.hasOwn(slots,slot))throw Error('Unknown save slot.');files.set(slot,value);write(slot,value);},
 };
 return {where:'folder',storage,moved,flush:()=>Promise.all([...pending])};
}
