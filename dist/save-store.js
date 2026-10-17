const LEGACY='last-harvest-colony-save-v1',PREFIX='last-harvest-save-';
export const SAVE_SLOTS=['manual-1','manual-2','manual-3','auto','previous'];
export class FarmSaveStore{
 constructor(storage){this.storage=storage;}
 read(slot){try{return this.storage.getItem(PREFIX+slot)||(slot==='auto'?this.storage.getItem(LEGACY):null);}catch{return null;}}
 latest(){return SAVE_SLOTS.map(slot=>this.read(slot)).filter(Boolean).sort((a,b)=>this.time(b)-this.time(a))[0]||null;}
 time(raw){try{return Date.parse(JSON.parse(raw).savedAt)||0;}catch{return 0;}}
 write(raw,slot='manual-1'){if(!SAVE_SLOTS.includes(slot)||slot==='previous')throw new Error('Choose a manual slot.');if(slot==='auto'){const old=this.read('auto');if(old)this.storage.setItem(PREFIX+'previous',old);}this.storage.setItem(PREFIX+slot,raw);try{this.storage.setItem(LEGACY,raw);}catch{}return true;}
 entries(){return SAVE_SLOTS.map(slot=>{const raw=this.read(slot);let data;try{data=JSON.parse(raw);}catch{}return {slot,raw,day:data?.s?.day,time:data?.savedAt,mode:data?.s?.campaign?'Campaign':data?.s?.endless?'Endless':'Classic'};});}
}
