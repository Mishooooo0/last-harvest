import {BUILDINGS,JOBS,TOOLS,STARTING_PACK} from './engine.js';
import {PLACES} from './colony.js';
import {LOOKS} from './renderer.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=id=>`<svg class="icon"><use href="#${id}"/></svg>`;
const avatar=p=>`<span class="pc-avatar" style="--shirt:${LOOKS[p.look%LOOKS.length].shirt}">${esc(p.name[0])}</span>`;
const JOB_ZONES=[
 {job:'farmer',name:'Fields',icon:'i-wheat'},
 {job:'builder',name:'Construction',icon:'i-hammer'},
 {job:'defender',name:'Defense',icon:'i-shotgun'},
 {job:'scout',name:'Scouting',icon:'i-flag'},
 {job:'medic',name:'Clinic',icon:'i-cross'},
 {job:'rest',name:'Resting',icon:'i-house'},
];
const LOOT={food:'food',seeds:'seeds',scrap:'scrap',gas:'gasoline',meds:'meds',water:'water',component:'radio part'};

// The starting pack (shown once per new farm) and the Operations board, where the leader decides
// who works which job and who goes on an expedition. The board opens every morning after breakfast,
// on the first day after the pack, and any time by daylight with O.
export function installOperations({game,notice,sync,focusGame,beep}){
 const $=id=>document.getElementById(id);
 const board=$('ops-dialog'),pack=$('pack-dialog');
 let plan=new Map(),context='midday',picked=null,drag=null,packDone=null,resumeAfter=false;

 // ===== The starting pack =====
 function openPack(onDone){
  const s=game.s,b=s.buildings,field=BUILDINGS.field.levels[b.field-1],gen=BUILDINGS.generator.levels[(b.generator||1)-1];
  const item=(ic,label,value,note='')=>`<div class="pack-item">${ic.startsWith('<')?ic:icon(ic)}<div>${label}${note?`<small>${note}</small>`:''}</div><strong>${value}</strong></div>`;
  const card=(title,items)=>`<section class="pack-card"><h3>${title}</h3>${items.join('')}</section>`;
  $('pack-grid').innerHTML=[
   card('YOUR PEOPLE',s.people.map(p=>item(avatar(p),esc(p.name),`${p.maxHp} hp`,`${p.traits?`${p.traits.good} · ${p.traits.weak}`:'Ready to work'}`))),
   card('TOOLS · IN THE WAREHOUSE',[item('i-shotgun','Shotguns',`× ${game.toolTotal('gun')}`,'For defenders'),item('i-scythe','Scythes',`× ${game.toolTotal('scythe')}`,'Farmers work faster')]),
   card('SUPPLIES',[item('i-scrap','Scrap',STARTING_PACK.scrap,'Buildings, defenses, trade'),item('i-ammo','Shotgun shells',STARTING_PACK.ammo,'Shared by every gun'),item('i-sprout','Seeds',STARTING_PACK.seeds),item('i-wheat','Canned food',STARTING_PACK.food,`Pantry holds ${s.foodCap}`),item('i-drop','Water',STARTING_PACK.water,'1 each at breakfast'),item('i-pill','Meds',STARTING_PACK.meds,'+50 health'),item('i-fuel','Gasoline',STARTING_PACK.gas,'Two nights of light')]),
   card('THE FARM',[item('i-house','Farmhouse','sleeps 8'),item('i-anvil','Warehouse','level 1'),item('i-wheat','Crop field',`${field.plots} plots`,`${STARTING_PACK.ripe} ready to harvest · expands to 12`),item('i-bolt','Generator',`${gen.lamps} lamps`,`Burns ${gen.burn} gasoline a night`),item('i-silo','Barn','standing')]),
   card('ANIMALS',[item('i-egg','Hens',`× ${game.animalCount()}`,'Free-range, for now')]),
  ].join('');
  packDone=onDone;pack.showModal();pack.querySelector('.pack-modal').scrollTop=0;$('pack-continue').focus({preventScroll:true});
 }
 $('pack-continue').addEventListener('click',()=>pack.close());
 pack.addEventListener('cancel',e=>e.preventDefault());
 pack.addEventListener('close',()=>{const done=packDone;packDone=null;done?.();});

 // ===== The Operations board =====
 const forecast=document.createElement('div');forecast.id='ops-forecast';forecast.className='ops-forecast';$('ops-stores').closest('header').after(forecast);
 const routines=document.createElement('div');routines.className='routine-tools';routines.innerHTML='<span>ROUTINES</span><button type="button" data-routine-save="day">Save day plan</button><button type="button" data-routine-use="day">Use day plan</button><button type="button" data-routine-save="night">Save night plan</button><button type="button" data-routine-use="night">Use night plan</button><label><input id="routine-auto" type="checkbox"> Switch automatically at dusk / dawn</label>';
 forecast.after(routines);
 routines.addEventListener('click',e=>{const save=e.target.closest('[data-routine-save]'),use=e.target.closest('[data-routine-use]');if(save){const jobs=Object.fromEntries([...plan].filter(([,z])=>z.startsWith('job:')).map(([id,z])=>[id,z.slice(4)]));game.saveRoutine(save.dataset.routineSave,jobs);notice('Routine saved.');}if(use){for(const p of game.s.people){const job=game.s.routines[use.dataset.routineUse]?.[p.id];if(job&&plan.get(p.id)!=='away'&&(job!=='medic'||game.level('clinic')))plan.set(p.id,'job:'+job);}render();}});
 $('routine-auto').addEventListener('change',e=>game.s.routines.auto=e.target.checked);
 const zoneOf=p=>p.expeditionId?'away':`job:${p.job}`;
 const teamFor=place=>[...plan].filter(([,z])=>z===`place:${place}`).map(([id])=>game.s.people.find(p=>p.id===id)).filter(Boolean);
 function risk(placeId,team){const place=PLACES[placeId],bonus=game.s.expeditionBonus&&(!game.s.expeditionBonus.place||game.s.expeditionBonus.place===placeId)?game.s.expeditionBonus.risk:0;if(!team.length)return Math.min(.8,place.risk+bonus);const skill=team.reduce((t,p)=>t+game.skill(p,'scouting'),0),armed=team.some(p=>p.tool==='gun'||plan.get(p.id)==='job:defender');return bonus+Math.max(.03,Math.min(.5,place.risk-skill*.02-(armed?.08:0)-(team.some(p=>p.traits?.scout>1)?.03:0)-(team.some(p=>p.specialty==='scouting')?.05:0)));}
 function zoneState(key){const s=game.s;
  if(key==='away')return {locked:true};
  if(key.startsWith('job:')){const job=key.slice(4);if(job==='medic'&&!game.level('clinic'))return {disabled:'Build a clinic first.'};return {};}
  const id=key.slice(6),busy=s.missions.find(m=>m.stage!=='done');
  if(!s.discoveries[id])return {disabled:'Not found yet. Scouts and expeditions discover it.'};
  if(busy)return {disabled:`A team is already out (${PLACES[busy.place].name}).`};
  if(context==='midday'&&s.phase!=='day')return {disabled:'Expeditions leave by daylight.'};
  return {};}
 function jobInfo(job,count){const s=game.s;
  if(job==='farmer')return [`${s.plots.length} plots · ${s.seeds} seeds · ${game.toolTotal('scythe')} scythes`,!s.seeds?'No seeds: buy some in Supplies.':''];
  if(job==='builder'){const sites=s.sites.length;return [sites?`${sites} ${sites===1?'job':'jobs'} waiting: ${[...new Set(s.sites.map(x=>x.kind==='gadget'?'defenses':BUILDINGS[x.building].name.toLowerCase()))].join(', ')}`:'Nothing ordered yet. They mend defenses until you order something.',''];}
  if(job==='defender'){const guns=game.toolTotal('gun');return [`${guns} shotguns · ${s.ammo} shells`,count>guns?`Only ${guns} shotguns: the rest fight with fists.`:''];}
  if(job==='scout')return ['Short trips for gasoline, meds, food and water. Bring back horde forecasts and find new places.',''];
  if(job==='medic')return [game.level('clinic')?`Clinic level ${game.level('clinic')} · treats the wounded nearby`:'Treats the wounded at a clinic.',''];
  return ['Stays home and recovers.',''];}
 function chip(p){const z=plan.get(p.id),changed=z!==zoneOf(p),best=Object.entries(p.skills||{}).map(([k])=>[k,game.skill(p,k)]).sort((a,b)=>b[1]-a[1])[0];
  return `<button class="ops-chip${changed?' changed':''}${picked===p.id?' picked':''}${z==='away'?' locked':''}" type="button" data-person="${p.id}" aria-label="${esc(p.name)}">${avatar(p)}<span><strong>${esc(p.name)}</strong><small>${Math.ceil(p.hp)}/${p.maxHp} hp${p.traits?` · ${p.traits.good}`:''}${best&&best[1]?` · ${best[0]} ${best[1]}`:''}${p.tool?` · ${TOOLS[p.tool].toLowerCase()}`:''}</small></span></button>`;}
 function render(){const s=game.s,people=s.people,count=z=>people.filter(p=>plan.get(p.id)===z).length;
  $('ops-eyebrow').textContent=`OPERATIONS · DAY ${context==='morning'?s.day+1:s.day}`;
  $('ops-title').textContent=context==='midday'?'Change who does what.':'Who goes where today?';
  $('ops-confirm').textContent=context==='morning'?`Begin day ${s.day+1} →`:context==='start'?'Begin day 1 →':'Confirm orders';
  $('ops-cancel').textContent=context==='morning'?'Back to breakfast':context==='start'?'Skip for now':'Cancel';
  $('ops-stores').innerHTML=[['FOOD',`${s.food}/${s.foodCap}`],['WATER',`${s.water}/${s.waterCap}`],['SCRAP',s.scrap],['SHELLS',s.ammo],['SEEDS',s.seeds],['GAS',s.gas.toFixed(1)]].map(([k,v])=>`<span>${k}<strong>${v}</strong></span>`).join('');
  $('ops-farm').innerHTML=JOB_ZONES.filter(z=>JOBS[z.job]).map(z=>{const key=`job:${z.job}`,st=zoneState(key),[info,warn]=jobInfo(z.job,count(key));return `<div class="ops-zone${st.disabled?' disabled':''}" data-zone="${key}" tabindex="0" role="button" aria-label="${z.name}"><div class="zone-head">${icon(z.icon)}<strong>${z.name}</strong><small>${JOBS[z.job].toUpperCase()}</small></div><p class="zone-info">${st.disabled||info}</p><div class="zone-people">${people.filter(p=>plan.get(p.id)===key).map(chip).join('')}</div><p class="zone-warn">${warn}</p></div>`;}).join('')+(people.some(p=>p.expeditionId)?`<div class="ops-zone busy" data-zone="away"><div class="zone-head">${icon('i-flag')}<strong>Out on an expedition</strong></div><p class="zone-info">${(()=>{const m=s.missions.find(m=>m.stage!=='done');return m?`${PLACES[m.place].name} · ${m.stage==='decision'?'awaiting your decision':`back in about ${Math.ceil(Math.max(0,m.remaining)+(m.stage==='travel'?PLACES[m.place].time*.55:0))}s`}`:'';})()}</p><div class="zone-people">${people.filter(p=>plan.get(p.id)==='away').map(chip).join('')}</div></div>`:'');
  $('ops-away').innerHTML=Object.entries(PLACES).map(([id,place])=>{const key=`place:${id}`,st=zoneState(key),team=teamFor(id),n=team.length,loot=Object.keys(LOOT).filter(k=>place[k]).map(k=>LOOT[k]).join(', '),short=n&&(s.food<n||s.water<n);return `<div class="ops-zone${st.disabled?' disabled':''}" data-zone="${key}" tabindex="0" role="button" aria-label="${place.name}"><div class="zone-head">${icon('i-flag')}<strong>${s.discoveries[id]?place.name:'Unknown place'}</strong><small>${Math.round(risk(id,team)*100)}% RISK</small></div><p class="zone-info">${st.disabled||`${place.time}s out · ${Math.ceil(place.time*.55)}s back · ${loot} · ${Math.ceil(place.time*1.55)}s travel + decision time; ${Math.ceil(place.time*1.55)> (context==='morning'?120:game.forecast().daylight)?'returns after sunset':'can return before sunset if you decide promptly'}${s.expeditionBonus&&(!s.expeditionBonus.place||s.expeditionBonus.place===id)?' · marked cache bonus':''}`}</p><div class="zone-people">${team.map(chip).join('')}</div><p class="zone-warn">${short?`Needs ${n} food + ${n} water to pack (you have ${s.food} + ${s.water}).`:team.some(p=>p.hp<p.maxHp*.35)?'Too hurt to travel: heal them first.':''}</p></div>`;}).join('');
  const f=game.forecast(),packed=[...plan.values()].filter(z=>z.startsWith('place:')).length;f.foodShort=Math.max(0,f.food+packed-s.food);f.waterShort=Math.max(0,f.water+packed-s.water);forecast.innerHTML='<strong>NEXT BREAKFAST</strong> '+f.food+' food + '+f.water+' water · '+(f.foodShort||f.waterShort?'Short: '+f.foodShort+' food, '+f.waterShort+' water':'Rations covered')+(packed?' (after packing '+packed+' expedition rations)':'')+'<br><strong>DEFENSE</strong> '+f.guns+' guns ('+f.freeGuns+' available) · '+s.ammo+' shells · fuel for '+f.nights.toFixed(1)+' nights';$('routine-auto').checked=s.routines.auto;
  const changes=people.filter(p=>plan.get(p.id)!==zoneOf(p)).length;$('ops-message').classList.toggle('ok',!!changes);if(!$('ops-message').dataset.error)$('ops-message').textContent=changes?`${changes} ${changes===1?'change':'changes'} planned.`:'';}
 function openBoard(kind='midday'){const s=game.s;if(board.open||pack.open)return false;if(kind==='midday'&&!['playing','paused'].includes(s.mode))return false;context=kind;resumeAfter=kind==='start'||s.mode==='playing';picked=null;plan=new Map(s.people.map(p=>[p.id,zoneOf(p)]));if(kind==='morning'&&s.routines.auto)for(const p of s.people){const job=s.routines.day[p.id];if(!p.expeditionId&&JOBS[job]&&(job!=='medic'||game.level('clinic')))plan.set(p.id,'job:'+job);}$('ops-message').dataset.error='';$('ops-message').textContent='';if(s.mode==='playing')game.pause();render();board.showModal();return true;}
 function message(text){$('ops-message').dataset.error=text?'1':'';$('ops-message').classList.remove('ok');$('ops-message').textContent=text;beep?.('empty');}
 function place(id,key){const st=zoneState(key);if(st.disabled||st.locked){message(st.disabled||'');return false;}const p=game.s.people.find(p=>p.id===id);if(!p||plan.get(id)==='away')return false;plan.set(id,key);$('ops-message').dataset.error='';beep?.('select');picked=null;render();return true;}
 function confirm(){const s=game.s,teams={};for(const [id,z] of plan)if(z.startsWith('place:'))(teams[z.slice(6)]||=[]).push(id);const places=Object.keys(teams);
  if(places.length>1)return message('Only one expedition can be out at a time. Send one team.');
  if(places.length){const team=teamFor(places[0]),n=team.length;if(s.food<n||s.water<n)return message(`The team needs ${n} food and ${n} water to pack. Bring fewer people, or stock up first.`);if(team.some(p=>p.hp<p.maxHp*.35))return message(`${team.filter(p=>p.hp<p.maxHp*.35).map(p=>p.name).join(', ')} is too hurt to travel.`);}
  for(const [id,z] of plan)if(z.startsWith('job:')){const p=s.people.find(p=>p.id===id);if(p&&p.job!==z.slice(4))game.setJob(id,z.slice(4));}
  if(context==='morning')game.startDay();
  if(places.length){const result=game.beginExpedition(places[0],teams[places[0]]);if(result?.error)notice(result.error);}
  board.close();if(resumeAfter&&game.s.mode==='paused')game.resume();focusGame();sync();}
 $('ops-confirm').addEventListener('click',confirm);
 $('ops-cancel').addEventListener('click',()=>board.close());
 board.addEventListener('close',()=>{drag?.ghost?.remove();drag=null;if(resumeAfter&&game.s.mode==='paused'&&!document.querySelector('dialog[open]'))game.resume();sync();});
 // Drag a person onto a zone, or click a person and then a zone.
 board.addEventListener('pointerdown',e=>{const c=e.target.closest('.ops-chip');if(!c||c.classList.contains('locked'))return;drag={id:Number(c.dataset.person),x:e.clientX,y:e.clientY,el:c,moved:false,ghost:null};try{c.setPointerCapture(e.pointerId);}catch{}});
 board.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;if(!drag.moved){drag.moved=true;drag.ghost=drag.el.cloneNode(true);drag.ghost.classList.add('ops-ghost');board.append(drag.ghost);}drag.ghost.style.left=`${e.clientX}px`;drag.ghost.style.top=`${e.clientY}px`;const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('.ops-zone');board.querySelectorAll('.drop-ok').forEach(z=>z.classList.remove('drop-ok'));if(zone&&!zoneState(zone.dataset.zone).disabled&&zone.dataset.zone!=='away')zone.classList.add('drop-ok');});
 const endDrag=e=>{if(!drag)return;const d=drag;drag=null;d.ghost?.remove();board.querySelectorAll('.drop-ok').forEach(z=>z.classList.remove('drop-ok'));if(!d.moved){picked=picked===d.id?null:d.id;render();return;}const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('.ops-zone');if(zone)place(d.id,zone.dataset.zone);};
 board.addEventListener('pointerup',endDrag);board.addEventListener('pointercancel',()=>{drag?.ghost?.remove();drag=null;});
 board.addEventListener('click',e=>{if(e.target.closest('.ops-chip'))return;const zone=e.target.closest('.ops-zone');if(zone&&picked)place(picked,zone.dataset.zone);});
 board.addEventListener('keydown',e=>{const zone=e.target.closest?.('.ops-zone');if(zone&&picked&&(e.key==='Enter'||e.key===' ')&&!e.target.closest('.ops-chip')){e.preventDefault();place(picked,zone.dataset.zone);}if(e.target.closest?.('.ops-chip')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();const id=Number(e.target.closest('.ops-chip').dataset.person);picked=picked===id?null:id;render();board.querySelector(`[data-person="${id}"]`)?.focus();}});
 return {cancelResume:()=>{resumeAfter=false;},openPack,openBoard,isOpen:()=>board.open||pack.open,context:()=>context};
}
