// The cheat menu in Settings (Update 34). One toggle shows it; inside are the always-on cheats, the one-off
// cheats, and a box for typing a code. Turning the menu off switches every always-on cheat off too.
import {CHEAT_TOGGLES,CHEAT_ACTIONS} from './cheats.js';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function installCheatMenu({game,settings,saveSettings,sync,beep}){
 const $=id=>document.getElementById(id),master=$('set-cheats'),menu=$('cheat-menu');if(!master||!menu)return null;
 settings.cheatToggles??={};
 menu.innerHTML='<p class="cheat-sub">ALWAYS ON</p><div class="cheat-toggles">'+Object.entries(CHEAT_TOGGLES).map(([id,c])=>`<label class="settings-toggle"><input type="checkbox" data-cheat-toggle="${id}"><span><strong>${esc(c.label)} <code>${c.code}</code></strong><small>${esc(c.about)}</small></span></label>`).join('')+'</div>'
  +'<p class="cheat-sub">RIGHT NOW</p><div class="cheat-actions">'+Object.entries(CHEAT_ACTIONS).map(([id,c])=>`<button type="button" class="cheat-action" data-cheat="${id}"><span>${esc(c.label)}</span><code>${c.code}</code></button>`).join('')+'</div>'
  +'<form class="cheat-code" id="cheat-form"><label for="cheat-input">CODE</label><input id="cheat-input" type="text" autocomplete="off" spellcheck="false" placeholder="Type a cheat code"><button type="submit" class="secondary-button">Enter</button></form><p id="cheat-status" class="cheat-status" role="status" aria-live="polite"></p>';
 const status=(text,ok=true)=>{const el=$('cheat-status');el.textContent=text;el.classList.toggle('bad',!ok);};
 // The game follows the menu: always-on cheats only count while the menu is switched on.
 const apply=()=>{game.clearCheats();if(settings.cheats)for(const [id,on] of Object.entries(settings.cheatToggles))if(on&&CHEAT_TOGGLES[id])game.setCheat(id,true);};
 const store=()=>{settings.cheatToggles=Object.fromEntries(Object.keys(CHEAT_TOGGLES).map(id=>[id,!!game.cheats?.[id]]));saveSettings(settings);};
 function refresh(){
  master.checked=!!settings.cheats;menu.hidden=!settings.cheats;
  for(const box of menu.querySelectorAll('[data-cheat-toggle]'))box.checked=!!game.cheats?.[box.dataset.cheatToggle];
  const farm=['playing','paused','house','journal','wheel','prompt'].includes(game.s.mode);
  for(const b of menu.querySelectorAll('[data-cheat]'))b.disabled=!farm;
  if(!farm&&settings.cheats)status('Start or continue a farm to use the one-off cheats.');
 }
 master.addEventListener('change',()=>{settings.cheats=master.checked;if(!settings.cheats)settings.cheatToggles={};saveSettings(settings);apply();status(settings.cheats?'Cheats are on. A farm that uses them does not set an endless record.':'Cheats are off.');refresh();sync();});
 menu.addEventListener('change',e=>{const id=e.target.dataset?.cheatToggle;if(!id)return;game.setCheat(id,e.target.checked);store();status(`${CHEAT_TOGGLES[id].label}: ${e.target.checked?'on':'off'}.`);sync();});
 menu.addEventListener('click',e=>{const b=e.target.closest('[data-cheat]');if(!b)return;const r=game.useCheat(b.dataset.cheat);status(r.text,r.ok);if(!r.ok)beep?.('empty');sync();});
 $('cheat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('cheat-input'),r=game.cheatCode(input.value);if(r.toggle)store();status(r.text,r.ok);if(r.ok)input.value='';else beep?.('empty');refresh();sync();});
 apply();refresh();
 return {refresh};
}
