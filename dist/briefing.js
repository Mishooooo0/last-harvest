// Read-only planning: no saved-state changes or estimates of guaranteed survival.
export function survivalBriefing(game) {
 const s=game.s,people=s.people,home=people.filter(p=>!p.expeditionId),needs=people.length;
 const cards=[
  {title:'Breakfast reserves',ok:s.food>=needs&&s.water>=needs,value:`${Math.floor(s.food)} food · ${Math.floor(s.water)} water`,detail:`Budget at least ${needs} of each for the colony. Harvest food and refill water before dawn.`},
  {title:'Farmhouse integrity',ok:s.farmHp>=game.maxFarmHealth()*.5,value:`${Math.ceil(s.farmHp)} / ${game.maxFarmHealth()}`,detail:'Assign builders or buy repairs when the farmhouse is damaged.'},
  {title:'Ammunition',ok:s.ammo>5,value:`${s.ammo} shells`,detail:'Shared ammunition feeds your defenses. Restock or craft shells before dusk.'},
  {title:'Survivor health',ok:!people.some(p=>p.hp<p.maxHp*.4),value:`${people.filter(p=>p.hp<p.maxHp*.4).length} badly wounded`,detail:'Heal critical survivors or send them to the clinic.'},
  {title:'Construction crew',ok:!(s.sites.length||s.house?.project)||home.some(p=>p.job==='builder'),value:`${home.filter(p=>p.job==='builder').length} builders at home`,detail:`${s.sites.length} active construction sites. Keep a builder at home to finish projects.`},
  {title:'Home defense',ok:home.some(p=>p.job==='defender'&&p.tool==='gun'),value:`${home.filter(p=>p.job==='defender'&&p.tool==='gun').length} armed defenders`,detail:`${people.length-home.length} survivors on expeditions. Assign defenders and allow time to fetch shotguns.`}
 ];
 return {day:s.day,phase:s.phase,headline:game.nightBrief(),cards,issues:cards.filter(c=>!c.ok).length,steps:game.tutorialSteps()};
}
export function installBriefing({game,button,sync,clearKeys}) {
 const dialog=document.createElement('dialog');dialog.id='survival-briefing';dialog.setAttribute('aria-labelledby','briefing-title');document.body.append(dialog);
 let resume=false;
 const element=(tag,text,cls)=>{const el=document.createElement(tag);if(text)el.textContent=text;if(cls)el.className=cls;return el;};
 button.addEventListener('click',()=>{
  if(!['playing','paused'].includes(game.s.mode)||document.querySelector('dialog[open]'))return;
  resume=game.s.mode==='playing';game.pause();clearKeys();sync();
  const report=survivalBriefing(game);dialog.replaceChildren();
  dialog.append(element('p',`FIELD REPORT / DAY ${report.day} / ${report.phase.toUpperCase()}`,'briefing-eyebrow'));
  const title=element('h2','Survival briefing');title.id='briefing-title';dialog.append(title,element('p',report.headline,'briefing-threat'));
  dialog.append(element('p',report.issues?`${report.issues} areas need attention`:'Essential checks look good','briefing-status'));
  const grid=element('div',null,'briefing-grid');
  for(const card of report.cards){const tile=element('section',null,'briefing-card '+(card.ok?'ready':'attention'));tile.append(element('small',card.ok?'READY':'CHECK'),element('h3',card.title),element('strong',card.value),element('p',card.detail));grid.append(tile);}dialog.append(grid);
  const guide=element('details');guide.append(element('summary','First-farm checklist'));const list=element('ul');for(const step of report.steps)list.append(element('li',`${step.done?'✓':'○'} ${step.text}`));guide.append(list);dialog.append(guide);
  dialog.append(element('p','These checks are planning aids, not a survival guarantee. The farm is paused while you review.','briefing-note'));
  const close=element('button',resume?'Return to farm':'Close briefing','primary-button');close.type='button';close.addEventListener('click',()=>dialog.close());dialog.append(close);dialog.showModal();close.focus();
 });
 dialog.addEventListener('close',()=>{if(resume)game.resume();resume=false;sync();button.focus();});
 return dialog;
}
