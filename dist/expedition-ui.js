// Expedition screens (Update 31): packing the truck, the HUD on the site, and the day's summary at dusk.
import {PLACES} from './colony.js';
import {SITE,LOOT_LABELS} from './expedition.js';
import {LOOKS} from './renderer.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=id=>`<svg class="icon"><use href="#${id}"/></svg>`;
const avatar=p=>`<span class="pc-avatar" style="--shirt:${LOOKS[p.look%LOOKS.length].shirt}">${esc(p.name[0])}</span>`;
const clock=sec=>`${Math.floor(sec/60)}:${String(Math.floor(sec%60)).padStart(2,'0')}`;
const list=names=>names.length<2?names.join(''):`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`;
const WEAPONS=[['gun','Shotgun','i-shotgun'],['scythe','Scythe','i-scythe'],[null,'Hands','i-people']];
const BAG=[['scrap','i-scrap'],['seeds','i-sprout'],['gas','i-fuel'],['meds','i-pill'],['component','i-bolt'],['gun','i-shotgun'],['scythe','i-scythe']];

// What a place is known for, most likely first, as words for the Operations board and the truck.
export function placeLoot(place){
 const words=Object.entries(place.loot).sort((a,b)=>b[1]-a[1]).map(([k])=>LOOT_LABELS[k]==='shotgun'?'weapons':LOOT_LABELS[k]==='scythe'?'tools':LOOT_LABELS[k]);
 if(place.component)words.push('radio parts');if(place.survivor>=.3)words.push('people hiding');
 return [...new Set(words)].join(', ');
}

export function installExpeditionUI({game,notice,sync,focusGame,beep,selected,selectOnly,selectFighters,onLaunch}){
 const $=id=>document.getElementById(id);

 // ===== Pack the truck =====
 const pack=document.createElement('dialog');pack.id='truck-dialog';pack.className='help-dialog truck-dialog';pack.setAttribute('aria-labelledby','truck-title');
 pack.innerHTML='<div class="help-modal truck-modal"><p id="truck-eyebrow" class="eyebrow">EXPEDITION</p><h2 id="truck-title">Pack the truck</h2><p id="truck-about" class="help-intro"></p><div id="truck-team" class="truck-team"></div><div class="truck-supplies"><label class="truck-range"><span>'+icon('i-ammo')+' Shells</span><input id="truck-shells" type="range" min="0" step="1"><output id="truck-shells-out"></output></label><label class="truck-range"><span>'+icon('i-pill')+' Meds</span><input id="truck-meds" type="range" min="0" step="1"><output id="truck-meds-out"></output></label></div><p id="truck-rations" class="truck-note"></p><p id="truck-home" class="truck-note"></p><p id="truck-message" class="truck-message" role="status" aria-live="polite"></p><footer class="truck-foot"><button id="truck-back" class="secondary-button" type="button">← Back to the board</button><button id="truck-leave" class="primary-button" type="button">Leave at dawn →</button></footer></div>';
 document.body.append(pack);
 let packing=null;
 function weaponOptions(p){
  const team=packing.team,chosen=kind=>team.filter(q=>packing.weapons[q.id]===kind).length,have=kind=>game.toolsFree(kind)+team.filter(q=>q.tool===kind).length;
  return WEAPONS.map(([kind,label,ic])=>{const on=packing.weapons[p.id]===kind,full=kind&&!on&&chosen(kind)>=have(kind);return `<button type="button" class="truck-weapon${on?' on':''}" data-person="${p.id}" data-weapon="${kind??''}" aria-pressed="${on}" ${full?'disabled title="None left in the warehouse"':''}>${icon(ic)}<span>${label}</span></button>`;}).join('');
 }
 function renderPack(){
  const s=game.s,{team,place}=packing,guns=team.filter(p=>packing.weapons[p.id]==='gun').length;
  $('truck-eyebrow').textContent=`EXPEDITION · DAY ${packing.day}`;$('truck-title').textContent=`Pack the truck for the ${place.name.toLowerCase()}`;
  $('truck-about').innerHTML=`${esc(place.description)} <strong>Danger: ${place.danger}.</strong> Likely finds: ${esc(placeLoot(place))}. The trip takes the whole day: five minutes on the site, and you are home at dusk. You cannot give orders at the farm while you are away.`;
  $('truck-team').innerHTML=team.map(p=>`<div class="truck-person">${avatar(p)}<div><strong>${esc(p.name)}</strong><small>${Math.ceil(p.hp)}/${p.maxHp} health · ${esc(p.traits?.good||'')}${p.job==='medic'?' · patches up the team':''}</small></div><div class="truck-weapons" role="group" aria-label="Weapon for ${esc(p.name)}">${weaponOptions(p)}</div></div>`).join('');
  const shells=$('truck-shells'),meds=$('truck-meds');shells.max=s.ammo;meds.max=s.meds;shells.value=packing.shells;meds.value=packing.meds;
  $('truck-shells-out').textContent=`${packing.shells} of ${s.ammo}`;$('truck-meds-out').textContent=`${packing.meds} of ${s.meds}`;
  $('truck-rations').textContent=`Rations for the road: ${team.length} food and ${team.length} water.`;
  const stayGuns=game.toolsFree('gun')+team.filter(p=>p.tool==='gun').length-guns;
  $('truck-home').textContent=`Staying at the farm: ${stayGuns} shotgun${stayGuns===1?'':'s'}, ${s.ammo-packing.shells} shells and ${s.meds-packing.meds} meds for the night.${guns&&!packing.shells?' Your shotguns have no shells!':''}`;
  $('truck-home').classList.toggle('warn',!!guns&&!packing.shells);
 }
 function openPack({place:placeId,ids,day,onLeave}){
  const s=game.s,team=s.people.filter(p=>ids.includes(p.id)),guns=team.filter(p=>p.tool==='gun').length;
  packing={placeId,place:PLACES[placeId],team,day,onLeave,weapons:Object.fromEntries(team.map(p=>[p.id,p.tool])),shells:Math.min(s.ammo,guns*12),meds:Math.min(s.meds,1)};
  $('truck-message').textContent='';renderPack();pack.showModal();$('truck-leave').focus();
 }
 pack.addEventListener('click',e=>{const b=e.target.closest('[data-weapon]');if(!b||b.disabled)return;packing.weapons[Number(b.dataset.person)]=b.dataset.weapon||null;beep?.('select');renderPack();});
 $('truck-shells').addEventListener('input',e=>{packing.shells=Number(e.target.value);renderPack();});
 $('truck-meds').addEventListener('input',e=>{packing.meds=Number(e.target.value);renderPack();});
 $('truck-back').addEventListener('click',()=>pack.close());
 $('truck-leave').addEventListener('click',()=>{const kit={weapons:{...packing.weapons},shells:packing.shells,meds:packing.meds},error=packing.onLeave(kit);if(error){$('truck-message').textContent=error;beep?.('empty');return;}pack.close();});

 // ===== The HUD on the site =====
 const hud=document.createElement('div');hud.id='site-hud';hud.className='site-hud';hud.hidden=true;
 hud.innerHTML='<section class="hud-panel site-clock"><p id="site-place" class="eyebrow">EXPEDITION</p><div class="site-sunset"><span>SUNSET IN</span><strong id="site-timer">5:00</strong></div><div class="meter site-meter"><span id="site-fill"></span></div><p id="site-danger" class="site-danger"></p><div class="site-actions"><button id="site-home" class="phase-confirm" type="button">Head home to the truck</button><button id="site-meds" class="mini-button" type="button">Use meds <kbd>M</kbd></button><button id="site-fighters" class="mini-button" type="button">Fighters <kbd>Q</kbd></button></div><p id="site-radio" class="site-radio"></p></section><section class="hud-panel site-bag" aria-label="Carried and found"><div class="site-carry"><span title="Shells the team carries">'+icon('i-ammo')+'<strong id="site-ammo">0</strong></span><span title="Meds the team carries">'+icon('i-pill')+'<strong id="site-medcount">0</strong></span></div><div id="site-found" class="site-found"></div></section><section id="site-team" class="hud-panel site-team" aria-label="Your team"></section><p class="hud-panel site-hint">Drag to select · search clicks queue · Shift-right-click queues any order · Alt-right-click replaces · H holds</p>';
 $('hud').append(hud);
 let teamKey='';
 $('site-home').addEventListener('click',()=>{if(game.run?.headHome()){beep?.('order');sync();}focusGame();});
 $('site-meds').addEventListener('click',()=>{useMeds();focusGame();});
 $('site-fighters').addEventListener('click',()=>{selectFighters();sync();focusGame();});
 $('site-team').addEventListener('click',e=>{const card=e.target.closest('[data-unit]');if(!card)return;const id=Number(card.dataset.unit);if(e.shiftKey){selected.has(id)?selected.delete(id):selected.add(id);beep?.('select');}else selectOnly([id]);sync();focusGame();});
 function useMeds(){const run=game.run;if(!run)return;const target=selected.size===1?[...selected][0]:undefined,result=run.useMeds(target);notice(result.text);if(!result.ok)beep?.('empty');sync();}
 function syncHud(){
  const run=game.run;hud.hidden=!run;if(!run)return;
  const left=run.timeLeft(),hunting=run.zombies.filter(z=>z.state==='hunt'&&z.hp>0).length;
  $('site-place').textContent=`EXPEDITION · ${run.site.name.toUpperCase()}`;$('site-timer').textContent=clock(left);$('site-fill').style.width=`${100*left/SITE.length}%`;
  hud.querySelector('.site-clock').classList.toggle('late',left<60);
  $('site-danger').textContent=run.leaving?'Everyone is heading back to the truck.':hunting?`${hunting} of the dead ${hunting===1?'is':'are'} hunting the team.`:'Quiet for now. Gunshots draw them in.';
  $('site-danger').classList.toggle('danger',hunting>0);
  $('site-home').disabled=run.leaving;$('site-home').textContent=run.leaving?'Heading home…':'Head home to the truck';$('site-meds').disabled=!run.meds;
  $('site-ammo').textContent=run.ammo;$('site-medcount').textContent=run.meds;
  const found=BAG.map(([k,ic])=>{const n=k==='gun'||k==='scythe'?run.foundTools[k]:run.bag[k];return n?`<span title="${LOOT_LABELS[k]}">${icon(ic)}<strong>${n}</strong></span>`:'';}).join('')+(run.found.length?`<span title="Survivors found">${icon('i-people')}<strong>${run.found.length}</strong></span>`:'');
  const foundHtml=found||'<em>Nothing found yet</em>';if($('site-found').dataset.html!==foundHtml){$('site-found').dataset.html=foundHtml;$('site-found').innerHTML=foundHtml;}
  const key=run.units.map(u=>u.id).join(',');
  if(key!==teamKey){teamKey=key;$('site-team').innerHTML=run.units.map((u,i)=>`<button class="site-card" type="button" data-unit="${u.id}" title="Key ${i+1}">${avatar(u.p)}<span class="site-card-info"><strong>${esc(u.p.name)}${u.survivor?' <small>found</small>':''}<small class="site-card-queue"></small></strong><span class="site-card-tool"></span><span class="meter"><span></span></span></span></button>`).join('');}
  for(const u of run.units){const card=$('site-team').querySelector(`[data-unit="${u.id}"]`);if(!card)continue;const dead=u.p.hp<=0;card.title=u.status+(u.orders.length?' · '+u.orders.length+' queued':'');card.querySelector('.site-card-queue').textContent=u.orders.length?' +'+u.orders.length:'';card.classList.toggle('selected',selected.has(u.id));card.classList.toggle('fallen',dead);card.querySelector('.site-card-tool').textContent=dead?'Lost':`${u.p.tool==='gun'?'Shotgun':u.p.tool==='scythe'?'Scythe':'Bare hands'} · ${u.status}${u.orders.length?' · '+u.orders.length+' queued':''}`;card.querySelector('.meter span').style.width=`${Math.max(0,100*u.p.hp/u.p.maxHp)}%`;card.disabled=dead;}
 }
 function radio(text){const el=$('site-radio');if(!el)return;el.textContent=`FARM RADIO · ${text}`;el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}

 // ===== Home at dusk =====
 const home=document.createElement('dialog');home.id='expedition-home';home.className='help-dialog home-dialog';home.setAttribute('aria-labelledby','home-title');
 home.innerHTML='<div class="help-modal"><p id="home-eyebrow" class="eyebrow">DUSK</p><h2 id="home-title">Back at the farm</h2><p id="home-lead" class="help-intro"></p><ul id="home-list" class="home-list"></ul><button id="home-close" class="primary-button" type="button">Back to the farm →</button></div>';
 document.body.append(home);
 $('home-close').addEventListener('click',()=>home.close());
 home.addEventListener('close',()=>{sync();focusGame();});
 function showSummary(r){
  const lost=r.reason==='lost',bag=Object.entries(r.bag||{}).filter(([,n])=>n).map(([k,n])=>`${n} ${LOOT_LABELS[k]}`),tools=Object.entries(r.tools||{}).filter(([,n])=>n).map(([k,n])=>`${n} ${k==='gun'?'shotgun':'scythe'}${n>1?'s':''}`);
  $('home-eyebrow').textContent=`DUSK · ${r.name.toUpperCase()}`;$('home-title').textContent=lost?'Nobody came back.':r.reason==='sunset'?'Home as the sun went down.':'Back at the farm.';
  $('home-lead').textContent=lost?`The whole team was lost at the ${r.name.toLowerCase()}. Everything they carried is gone.`:`${list(r.team)} ${r.team.length>1?'are':'is'} back from the ${r.name.toLowerCase()}. It is already dusk: start the night when you are ready.`;
  const lines=[!lost&&`<li><strong>Brought home:</strong> ${bag.length?esc(list(bag)):'nothing but stories'}.</li>`,tools.length&&`<li><strong>Found weapons:</strong> ${esc(list(tools))}, now part of the warehouse.</li>`,r.joined.length&&`<li><strong>New faces:</strong> ${esc(list(r.joined))} moved in.</li>`,r.deaths.length&&`<li class="warn"><strong>Lost:</strong> ${esc(list(r.deaths))}.</li>`,`<li>${r.searched} place${r.searched===1?'':'s'} searched · ${r.kills} of the dead put down${r.medsUsed?` · ${r.medsUsed} med${r.medsUsed===1?'':'s'} used`:''}.</li>`,!lost&&(r.ammo||r.meds)&&`<li>Returned to the stores: ${r.ammo} shells, ${r.meds} meds.</li>`].filter(Boolean).join('');
  $('home-list').innerHTML=lines;if(!home.open)home.showModal();
 }
 return {openPack,syncHud,radio,showSummary,useMeds,isPacking:()=>pack.open};
}
