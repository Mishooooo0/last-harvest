import {HOUSE_DOOR} from './engine.js';
// Indoor rules use existing food, water, scrap, medicine and survivor skills.
const equipment=(name,room,about,costs,effects)=>({name,room,about,starts:1,levels:[{cost:0,text:effects[0]},...costs.map((cost,i)=>({cost,text:effects[i+1]}))]});
export const HOUSE_UPGRADES={
 stove:equipment('Stove','Kitchen','Make the same meals with less food.',[25,45],['4 food for 4 meals','3 food for 4 meals','2 food for 4 meals']),
 sink:equipment('Kitchen sink','Kitchen','Use less water when cooking batches.',[20,35],['1 water per 2 meals','1 water per 3 meals','1 water per 4 meals']),
 pantry:equipment('Pantry','Kitchen','More prepared meals and emergency rations.',[20,35],['16 meals · 24 rations','24 meals · 36 rations','32 meals · 48 rations']),
 beds:equipment('Bedrooms','Upstairs','Fed survivors recover better in their own beds.',[25,45],['Basic beds','+3 health each morning','+6 health each morning']),
 common:equipment('Common room','Living room','Comfort helps people recover their spirits.',[20,40],['A place to gather','+2 morning morale','+4 morning morale · closer bonds']),
 medicine:equipment('Medical cabinet','Upstairs','Use one medicine to treat a survivor at home.',[25,45],['50 health per medicine','65 health per medicine','80 health per medicine']),
 doors:equipment('Front door','Entrance','Stronger bracing protects the whole farmhouse.',[30,50],['100 base house health','+25 max health · 6% protection','+50 max health · 12% protection']),
 shutters:equipment('Window shutters','Windows','Reinforced fittings absorb attacks on the house.',[25,45],['Basic shutters','+15 max health · 4% protection','+30 max health · 8% protection']),
 library:equipment('Bookshelf','Living room','Study recovered manuals once per survivor each morning.',[20,40],['2 XP per study','4 XP per study','6 XP per study']),
 battery:{name:'Emergency battery',room:'Living room',about:'Charges from the running generator. Powers indoor shelter lights during an outage; outdoor lamps still need the generator.',starts:0,levels:[{cost:30,text:'45 seconds of indoor light'},{cost:50,text:'90 seconds of indoor light'},{cost:75,text:'135 seconds of indoor light'}]},
};
export const HOUSE_SKILLS={farming:'Farming',building:'Building',scouting:'Scouting',combat:'Combat',medicine:'Medicine'};
export const HOUSE_REQUESTS={meal:{name:'A warm meal',text:'A prepared portion would make this morning feel like home.',cost:{meals:1},possession:'A favorite mug'},blanket:{name:'A warmer bed',text:'Could we make a blanket for my room?',cost:{scrap:4},possession:'A handmade blanket'},keepsake:{name:'Something to remember',text:'Bring back a keepsake from an expedition for my bedside table.',cost:{keepsakes:1},possession:'An expedition keepsake'}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const integer=(n,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const houseLevel=(s,key)=>s.house?.levels?.[key]??HOUSE_UPGRADES[key]?.starts??0;
export const houseMealCap=s=>16+(houseLevel(s,'pantry')-1)*8;
export const housePantryCap=s=>24+(houseLevel(s,'pantry')-1)*12;
export const houseMaxHealth=s=>100+(houseLevel(s,'doors')-1)*25+(houseLevel(s,'shutters')-1)*15;
export const houseProtection=s=>(houseLevel(s,'doors')-1)*.06+(houseLevel(s,'shutters')-1)*.04;
export const batteryCapacity=s=>houseLevel(s,'battery')*45;
export const cookingCost=(s,portions)=>({food:Math.ceil(portions*[1,.75,.5][houseLevel(s,'stove')-1]),water:Math.ceil(portions/(houseLevel(s,'sink')+1))});
const atHome=p=>!p.expeditionId&&!(p.away>0);
const available=s=>s.mode==='house';
const fail=message=>({ok:false,message});

export function ensureHouse(s){
 const created=!s.house;
 if(!s.house)s.house={version:1,levels:Object.fromEntries(Object.entries(HOUSE_UPGRADES).map(([k,v])=>[k,v.starts])),beds:Array(8).fill(null),project:null,charge:0,lastMorning:-1,studied:{},manuals:['farming'],request:null,requestsDone:0,keepsakes:0,possessions:[],memories:[],known:[]};
 const h=s.house;
 // Bed assignments follow identities, including travelers, rather than their array order.
 h.beds=h.beds.map(id=>s.people.some(p=>p.id===id)?id:null);
 for(const p of s.people)if(!h.beds.includes(p.id)){const empty=h.beds.indexOf(null);if(empty>=0)h.beds[empty]=p.id;}
 if(created){
  const remember=(key,text,kind='home',day=s.day)=>{if(!h.memories.some(m=>m.key===key)&&h.memories.length<10000)h.memories.push({key,text,kind,day});};
  remember('home','The farmhouse became our home.');
  for(const p of s.people){h.known.push({id:p.id,name:p.name});remember('arrival-'+p.id,p.name+' has a place at our table.','arrival');}
  if(s.harvested>0)remember('first-harvest','Our harvests kept hope alive.','harvest');
  for(const entry of s.journal||[]){if(!entry||!integer(entry.day,0,s.day))continue;if(entry.horde&&!entry.fell)remember('horde-'+entry.day,'We held the farm through the horde on night '+entry.day+'.','horde',entry.day);for(const [i,name] of (Array.isArray(entry.deaths)?entry.deaths:[]).entries())if(typeof name==='string'&&name.length<=100)remember(`past-loss-${entry.day}-${i}`,name+' was lost to the dead.','loss',entry.day);}
  for(const m of s.missionHistory||[]){if(!m||!['farm','gas','medical','town'].includes(m.place)||!integer(m.day,0,s.day))continue;const skill={farm:'farming',gas:'building',medical:'medicine',town:'combat'}[m.place];for(const manual of [skill,'scouting'])if(manual&&!h.manuals.includes(manual))h.manuals.push(manual);remember('expedition-'+m.place,'We remember an expedition to '+{farm:'the abandoned farm',gas:'the gas station',medical:'the roadside clinic',town:'town'}[m.place]+'.','expedition',m.day);}
  // An existing breakfast has already paid its rewards; migration must not pay it again.
  if(s.mode==='house'){h.lastMorning=s.day;const home=s.people.filter(atHome),p=home[s.day%Math.max(1,home.length)];if(p)h.request={personId:p.id,type:['meal','blanket','keepsake'][(s.day-1)%3],day:s.day};}
 }
}

export function validHouse(s){
 if(s.house===undefined)return Number.isFinite(s.farmHp)&&s.farmHp>=0&&s.farmHp<=100;
 const h=s.house;if(!object(h)||h.version!==1||!object(h.levels)||Object.keys(h.levels).length!==Object.keys(HOUSE_UPGRADES).length)return false;
 if(Object.entries(HOUSE_UPGRADES).some(([key,spec])=>!integer(h.levels[key],spec.starts,spec.levels.length)))return false;
 if(!Array.isArray(h.beds)||h.beds.length!==8||h.beds.some(id=>id!==null&&(!integer(id,1)||!s.people.some(p=>p.id===id)))||new Set(h.beds.filter(id=>id!==null)).size!==h.beds.filter(id=>id!==null).length)return false;
 if(!Number.isFinite(h.charge)||h.charge<0||h.charge>batteryCapacity(s)||!integer(h.lastMorning,-1,s.day)||!object(h.studied)||Object.values(h.studied).some(day=>!integer(day,0,s.day)))return false;
 if(!Array.isArray(h.manuals)||new Set(h.manuals).size!==h.manuals.length||h.manuals.some(k=>!Object.hasOwn(HOUSE_SKILLS,k))||!integer(h.requestsDone)||!integer(h.keepsakes))return false;
 if(h.activity!==undefined&&(!object(h.activity)||!integer(h.activity.serial)||!['cooking','study'].includes(h.activity.kind)||!integer(h.activity.personId,1)))return false;
 if(!Array.isArray(h.known)||new Set(h.known.map(p=>p.id)).size!==h.known.length||h.known.some(p=>!object(p)||!integer(p.id,1)||typeof p.name!=='string'||p.name.length>100))return false;
 if(!Array.isArray(h.possessions)||h.possessions.some(p=>!object(p)||!integer(p.personId,1)||!Object.hasOwn(HOUSE_REQUESTS,p.type)||!integer(p.day,0,s.day)))return false;
 if(!Array.isArray(h.memories)||h.memories.length>10000||new Set(h.memories.map(m=>m.key)).size!==h.memories.length||h.memories.some(m=>!object(m)||typeof m.key!=='string'||m.key.length>100||typeof m.text!=='string'||m.text.length>240||!integer(m.day,0,s.day)||!['home','harvest','horde','arrival','loss','expedition','request','upgrade'].includes(m.kind)))return false;
 const q=h.project;if(q!==null&&(!object(q)||!Object.hasOwn(HOUSE_UPGRADES,q.key)||!integer(q.level,1,HOUSE_UPGRADES[q.key].levels.length)||q.level!==h.levels[q.key]+1||!Number.isFinite(q.progress)||q.progress<0||q.progress>=1||!integer(q.paid,0,100000)||!Number.isFinite(q.work)||q.work<=0||q.work>120))return false;
 const r=h.request;if(r!==null&&(!object(r)||!Object.hasOwn(HOUSE_REQUESTS,r.type)||!integer(r.personId,1)||!s.people.some(p=>p.id===r.personId)||!integer(r.day,0,s.day)))return false;
 return Number.isFinite(s.farmHp)&&s.farmHp>=0&&s.farmHp<=houseMaxHealth(s);
}

export const houseMethods={
 maxFarmHealth(){return houseMaxHealth(this.s);},
 houseDamage(amount){return amount*(1-houseProtection(this.s));},
 houseLit(){return this.powered()||(this.s.house?.charge||0)>0;},
 rememberHouse(key,text,kind='home'){
  const h=this.s.house;if(!h||h.memories.some(m=>m.key===key)||h.memories.length>=10000)return;
  h.memories.push({key,text,kind,day:this.s.day});
 },
 observeHouse(){
  const s=this.s,h=s.house;ensureHouse(s);
  this.rememberHouse('home','The farmhouse became our home.');
  for(const old of h.known)if(!s.people.some(p=>p.id===old.id))this.rememberHouse('loss-'+old.id,old.name+(s.today?.deaths?.includes(old.name)?' was lost to the dead.':' left the farm.'),'loss');
  for(const p of s.people)if(!h.known.some(k=>k.id===p.id)){this.rememberHouse('arrival-'+p.id,p.name+' found a place at our table.','arrival');h.known.push({id:p.id,name:p.name});}
  if(s.harvested>0)this.rememberHouse('first-harvest','Our first harvest kept hope alive.','harvest');
  for(const entry of s.journal||[])if(entry.horde&&!entry.fell)this.rememberHouse('horde-'+entry.day,'We held the farm through the horde on night '+entry.day+'.','horde');
  if(h.request&&!s.people.some(p=>p.id===h.request.personId))h.request=null;
 },
 houseUpgradeQuote(key){
  const s=this.s,spec=HOUSE_UPGRADES[key],level=houseLevel(s,key),next=spec?.levels[level];
  const reason=!spec?'Unknown house upgrade.':!available(s)?'House upgrades are planned at breakfast.':s.house.project?'Finish or cancel the current house project first.':!next?'Fully upgraded.':s.scrap<next.cost?`Needs ${next.cost} scrap.`:'Ready';
  return {key,level,next,cost:next?.cost||0,available:reason==='Ready',reason};
 },
 orderHouseUpgrade(key){
  const q=this.houseUpgradeQuote(key);if(!q.available)return fail(q.reason);
  this.s.scrap-=q.cost;this.s.house.project={key,level:q.level+1,progress:0,paid:q.cost,work:12+(q.level+1)*4};
  this.emit('autosave');return {ok:true,message:`${HOUSE_UPGRADES[key].name} queued. A builder will install it during the day.`};
 },
 cancelHouseUpgrade(){
  if(!['house','playing','paused'].includes(this.s.mode)||!this.s.house.project)return fail('No house project to cancel.');
  const q=this.s.house.project,refund=Math.floor(q.paid*(1-q.progress));this.s.scrap+=refund;this.s.house.project=null;this.emit('autosave');return {ok:true,message:`House project cancelled. ${refund} scrap returned.`};
 },
 workHouseProject(p,dt){
  const s=this.s,q=s.house.project;if(!q||s.phase!=='day'||s.sites.some(site=>site.priority))return false;
  if(!this.walkTo(p,{x:HOUSE_DOOR.x,y:HOUSE_DOOR.y+4},80,dt)){p.status='Taking supplies to the farmhouse';return true;}
  p.inside=true;p.panic=false;p.hammering=true;p.status='Installing '+HOUSE_UPGRADES[q.key].name.toLowerCase();
  q.progress=Math.min(1,q.progress+dt*this.bonus(p,'building')/q.work);this.xp(p,'building',dt*.6);
  if(q.progress>=1){const before=houseMaxHealth(s);s.house.levels[q.key]=q.level;s.farmHp=Math.min(houseMaxHealth(s),s.farmHp+houseMaxHealth(s)-before);s.house.project=null;this.rememberHouse(`upgrade-${q.key}-${q.level}`,HOUSE_UPGRADES[q.key].name+' improved.','upgrade');this.notice(HOUSE_UPGRADES[q.key].name+' installed.',true);this.emit('sound',{name:'build'});this.emit('autosave');}
  return true;
 },
 householdQuote(){
  const s=this.s,portions=Math.max(0,s.people.filter(atHome).length-s.homestead.meals),cost=cookingCost(s,portions);
  const reason=!available(s)?'Prepare breakfast while inside the house.':!portions?'Enough meals are already prepared.':s.homestead.meals+portions>houseMealCap(s)?'The meal shelf needs more space.':s.food<cost.food||s.water<cost.water?`Needs ${cost.food} food and ${cost.water} water.`:'Ready';
  return {portions,cost,available:reason==='Ready',reason};
 },
 prepareHousehold(){
  const q=this.householdQuote();if(!q.available)return fail(q.reason);
  this.s.food-=q.cost.food;this.s.water-=q.cost.water;this.s.homestead.meals+=q.portions;this.noteHouseActivity('cooking');this.emit('autosave');return {ok:true,message:`${q.portions} portions prepared for the next breakfast.`};
 },
 cookHouseBatch(portions=4){
  const s=this.s;if(!available(s)||!integer(portions,1,8))return fail('Prepare meals at breakfast.');
  const cost=cookingCost(s,portions);if(s.food<cost.food||s.water<cost.water||s.homestead.meals+portions>houseMealCap(s))return fail('Check supplies and meal shelf space.');
  s.food-=cost.food;s.water-=cost.water;s.homestead.meals+=portions;this.noteHouseActivity('cooking');this.emit('autosave');return {ok:true,message:`${portions} meals prepared for tomorrow.`};
 },
 noteHouseActivity(kind,personId){
  const h=this.s.house,p=this.s.people.find(p=>p.id===personId&&atHome(p))||this.s.people.find(p=>atHome(p)&&p.hp>=p.maxHp*.6);
  if(p)h.activity={kind,personId:p.id,serial:(h.activity?.serial||0)+1};
 },
 assignHouseBed(personId,index){
  if(!available(this.s)||!integer(index,0,7)||!this.s.people.some(p=>p.id===personId))return fail('Choose a survivor and a bed.');
  const beds=this.s.house.beds,old=beds.indexOf(personId),other=beds[index];if(old>=0)beds[old]=other;beds[index]=personId;this.emit('autosave');return {ok:true,message:'Bed assignments saved.'};
 },
 treatAtHome(personId){
  const s=this.s,p=s.people.find(p=>p.id===personId&&atHome(p));if(!available(s)||!p)return fail('The patient must be at home.');
  if(p.hp>=p.maxHp)return fail('This survivor is healthy.');if(s.meds<1)return fail('Needs 1 medicine.');
  const amount=50+(houseLevel(s,'medicine')-1)*15,before=p.hp;s.meds--;this.heal(p,amount);if(s.breakfast)s.breakfast.wounded=s.people.filter(p=>atHome(p)&&p.hp<p.maxHp*.6).map(p=>p.name);this.emit('autosave');return {ok:true,message:`${p.name} recovered ${Math.round(p.hp-before)} health using 1 medicine.`};
 },
 studyAtHome(personId,skill){
  const s=this.s,p=s.people.find(p=>p.id===personId&&atHome(p)),h=s.house;
  if(!available(s)||!p||!h.manuals.includes(skill))return fail('Choose someone at home and an available manual.');
  if(!s.breakfast?.fed.includes(p.name))return fail('Have breakfast before studying.');
  if(h.studied[p.id]===s.day)return fail('Already studied this morning.');if(this.skill(p,skill)>=5)return fail('This skill is already mastered.');
  const amount=houseLevel(s,'library')*2;h.studied[p.id]=s.day;this.xp(p,skill,amount);this.noteHouseActivity('study',p.id);this.logWork(p,'Studied '+HOUSE_SKILLS[skill].toLowerCase());this.emit('autosave');return {ok:true,message:`${p.name} gained ${amount} ${skill} XP.`};
 },
 houseMorning(){
  const s=this.s,h=s.house;this.observeHouse();if(h.lastMorning===s.day)return;h.lastMorning=s.day;
  const fed=s.people.filter(p=>atHome(p)&&s.breakfast?.fed.includes(p.name));
  for(const p of fed){if(h.beds.includes(p.id))p.hp=Math.min(p.maxHp,p.hp+(houseLevel(s,'beds')-1)*3);p.morale=Math.min(100,p.morale+(houseLevel(s,'common')-1)*2);}
  if(houseLevel(s,'common')===3)this.growHomesteadBonds(fed.map(p=>p.id),1);
  if(s.breakfast)s.breakfast.wounded=s.people.filter(p=>atHome(p)&&p.hp<p.maxHp*.6).map(p=>p.name);
  if(!h.request){const home=s.people.filter(atHome),p=home[s.day%Math.max(1,home.length)];if(p)h.request={personId:p.id,type:['meal','blanket','keepsake'][(s.day-1)%3],day:s.day};}
 },
 fulfillHouseRequest(){
  const s=this.s,h=s.house,r=h.request,p=s.people.find(p=>p.id===r?.personId&&atHome(p)),spec=HOUSE_REQUESTS[r?.type];
  if(!available(s)||!p||!spec)return fail('The survivor must be at home to receive this.');
  if(Object.entries(spec.cost).some(([k,n])=>(k==='meals'?s.homestead.meals:k==='keepsakes'?h.keepsakes:s[k])<n))return fail('Gather the requested supplies first.');
  for(const [k,n] of Object.entries(spec.cost)){if(k==='meals')s.homestead.meals-=n;else if(k==='keepsakes')h.keepsakes-=n;else s[k]-=n;}
  p.morale=Math.min(100,p.morale+6);h.possessions.push({personId:p.id,type:r.type,day:s.day});h.requestsDone++;h.request=null;this.rememberHouse(`request-${h.requestsDone}`,p.name+' received '+spec.possession.toLowerCase()+'.','request');this.emit('autosave');return {ok:true,message:p.name+' feels more at home. +6 morale.'};
 },
 houseExpedition(m){
  const h=this.s.house;if(!this.s.people.some(p=>m.members.includes(p.id)))return;
  const key={farm:'farming',gas:'building',medical:'medicine',town:'combat'}[m.place];for(const manual of [key,'scouting'])if(manual&&!h.manuals.includes(manual))h.manuals.push(manual);
  h.keepsakes++;this.rememberHouse('expedition-'+m.place,'The team brought home stories and a keepsake from '+{farm:'the abandoned farm',gas:'the gas station',medical:'the roadside clinic',town:'town'}[m.place]+'.','expedition');
 },
 stepHouse(dt){
  const s=this.s,h=s.house;if(!h)return;
  if(this.powered())h.charge=Math.min(batteryCapacity(s),h.charge+dt*.5);
  else if(s.phase==='night')h.charge=Math.max(0,h.charge-dt);
  this.observeHouse();
 },
};
