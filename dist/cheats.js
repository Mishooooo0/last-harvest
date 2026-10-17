// Cheats (Update 34), switched on in Settings. They wrap the game's rules instead of changing them, so with
// cheats off nothing plays differently. A farm that uses one is marked (s.cheated) and does not set an
// endless record. Every cheat also has a code that can be typed into the cheat menu.
import {MAX_PEOPLE,HOUSE_DOOR} from './engine.js';

// Always-on cheats, switched with a checkbox or their code.
export const CHEAT_TOGGLES=Object.freeze({
 unhurt:{code:'IRONSKIN',label:'Nobody gets hurt',about:'Your people take no damage, on the farm and on expeditions.'},
 house:{code:'FORTRESS',label:'Unbreakable farmhouse',about:'The dead cannot damage the farmhouse.'},
 ammo:{code:'BOTTOMLESS',label:'Endless shells',about:'Shotguns fire without using up shells.'},
 build:{code:'QUICKHANDS',label:'Instant building',about:'Buildings and defenses are finished the moment they are ordered.'},
});
const NAMES=['Rosa','Ike','Abe','Nell','Otis','Wren','Cal','Hazel','Gus','Lou','Pip','Dot','Esme','Bo','Ruth','Silas'];
let places={};
// One-off cheats: each does its thing once, now.
export const CHEAT_ACTIONS=Object.freeze({
 scrap:{code:'MOTHERLODE',label:'+500 scrap',run:g=>{g.s.scrap+=500;}},
 shells:{code:'LOCKNLOAD',label:'+100 shells',run:g=>{g.s.ammo+=100;if(g.run)g.run.ammo+=100;}},
 seeds:{code:'GREENTHUMB',label:'+30 seeds',run:g=>{g.s.seeds+=30;}},
 pantry:{code:'FULLBELLY',label:'Fill food and water',run:g=>{g.s.food=Math.max(g.s.food,g.s.foodCap);g.s.water=Math.max(g.s.water,g.s.waterCap);}},
 meds:{code:'FIRSTAID',label:'+10 meds',run:g=>{g.s.meds+=10;if(g.run)g.run.meds+=10;}},
 gas:{code:'GASUP',label:'+10 gasoline',run:g=>{g.s.gas+=10;}},
 heal:{code:'HEALALL',label:'Heal everyone',run:g=>{for(const p of g.s.people)p.hp=p.maxHp;for(const u of g.run?.units||[])if(u.p.hp>0)u.p.hp=u.p.maxHp;}},
 repair:{code:'FIXHOUSE',label:'Repair the farmhouse',run:g=>{g.s.farmHp=g.maxFarmHealth?.()??100;g.farmWarning=false;}},
 clear:{code:'CLEARDEAD',label:'Clear the dead',run:g=>{g.s.zombies=[];if(g.s.wave)g.s.wave.spawned=g.s.wave.total;if(g.run){g.run.zombies=[];g.run.spawnTimer=20;}}},
 finish:{code:'FINISHIT',label:'Finish all construction',run:g=>{for(const site of [...g.s.sites])g.finishSite(site);}},
 survivor:{code:'NEWFACE',label:'A survivor joins',run:g=>{
  const s=g.s;if(s.people.length>=MAX_PEOPLE)return 'The farmhouse is full: 8 people already live here.';
  const taken=new Set(s.people.map(p=>p.name)),name=NAMES.find(n=>!taken.has(n))||`Stranger ${s.day}`,p=g.makePerson(name,HOUSE_DOOR.x,HOUSE_DOOR.y+40);
  if(s.mode==='house')Object.assign(p,{inside:true,y:HOUSE_DOOR.y+4});
  s.people.push(p);s.today.arrivals.push(name);g.observeHouse?.();return `${name} joins the farm.`;}},
 places:{code:'ROADMAP',label:'Reveal every expedition place',run:g=>{for(const id of Object.keys(places))g.s.discoveries[id]=true;}},
});

const playing=s=>['playing','paused','house','journal','wheel','prompt'].includes(s.mode);
export const cheatMethods={
 cheatsOn(){return Object.values(this.cheats||{}).some(Boolean);},
 setCheat(id,on){if(!CHEAT_TOGGLES[id])return false;this.cheats={...this.cheats,[id]:!!on};if(on&&playing(this.s))this.s.cheated=true;return true;},
 clearCheats(){this.cheats={};},
 useCheat(id){
  const cheat=CHEAT_ACTIONS[id];if(!cheat)return {ok:false,text:'No such cheat.'};
  if(!playing(this.s))return {ok:false,text:'Start or continue a farm to use cheats.'};
  const said=cheat.run(this);this.s.cheated=true;this.emit('sound',{name:'jackpot',site:true});
  return {ok:true,text:typeof said==='string'?said:`Cheat: ${cheat.label.toLowerCase()}.`};
 },
 // A typed code: a one-off cheat happens now; an always-on cheat is switched on or off.
 cheatCode(text){
  const code=String(text||'').toUpperCase().replace(/[^A-Z]/g,'');
  for(const [id,c] of Object.entries(CHEAT_ACTIONS))if(c.code===code)return {...this.useCheat(id),id};
  for(const [id,c] of Object.entries(CHEAT_TOGGLES))if(c.code===code){const on=!this.cheats?.[id];this.setCheat(id,on);return {ok:true,id,toggle:true,on,text:`${c.label}: ${on?'on':'off'}.`};}
  return {ok:false,text:code?'That code does nothing.':'Type a cheat code first.'};
 },
};

// Wraps the rules the always-on cheats bend. Called once, after every other system has been added.
export function installCheats(Engine,{places:known={}}={}){
 places=known;
 const p=Engine.prototype,{hurtPerson,houseDamage,personFight,orderBuild,placeGadget,update}=p;
 Object.assign(p,cheatMethods);
 p.hurtPerson=function(person,damage,angle){if(this.cheats?.unhurt)return;return hurtPerson.call(this,person,damage,angle);};
 p.houseDamage=function(amount){return this.cheats?.house?0:houseDamage?houseDamage.call(this,amount):amount;};
 // Endless shells: a shotgun fires as if there were shells, and the count is put back afterwards.
 p.personFight=function(person){if(!this.cheats?.ammo)return personFight.call(this,person);const before=this.s.ammo;if(before<=0)this.s.ammo=1;try{return personFight.call(this,person);}finally{this.s.ammo=before;}};
 p.orderBuild=function(id){const site=orderBuild.call(this,id);if(site&&this.cheats?.build)this.finishSite(site);return site;};
 p.placeGadget=function(...args){const site=placeGadget.apply(this,args);if(site&&typeof site==='object'&&this.cheats?.build)this.finishSite(site);return site;};
 p.update=function(dt){if(this.cheatsOn()&&this.s.mode==='playing')this.s.cheated=true;return update.call(this,dt);};
}
