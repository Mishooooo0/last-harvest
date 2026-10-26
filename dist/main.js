import {installBriefing} from './briefing.js';
import {installMorningWheel} from './wheel-ui.js';
import {installOpening} from './opening.js';
import {BUILDINGS,UPGRADES,GADGETS,PANTRY_SIZE,WATER_CAP,DAWN_SUPPLIES,MEAL_COST,JOBS,MAX_PEOPLE,TOOLS,WORLD,FARM_CENTER,FARMHOUSE,SHOP} from './engine.js';
import {LOOKS,W,H,atBreakfast} from './renderer.js';
import {ColonyEngine as GameEngine,PLACES} from './colony.js';
import {drawSite,siteView} from './site-art.js';
import {installExpeditionUI} from './expedition-ui.js';
import {SceneRenderer as Renderer} from './world-art.js';
import {installGraphicsControls} from './graphics.js';
import {installColonyUI} from './colony-ui.js';
import {installOperations} from './operations.js';
import {loadSettings,saveSettings,installSettings} from './settings.js';
import {installCheatMenu} from './cheats-ui.js';
import {loadPrices} from './prices.js';
import {loadStartingKit} from './starting-kit.js';
import {openSaveStorage} from './save-files.js';
import {createMenuScene,stepMenuScene,menuView,installMainMenu} from './menu.js';
// Prices come from prices.json before anything reads them. Problems are listed on the title screen.
const priceReport=await loadPrices();
// The starting kit comes from starting-kit.json, and farm saves from the game folder's saves/ subfolder.
const kitReport=await loadStartingKit();
const saveFiles=await openSaveStorage({onError:()=>notice('This farm could not be saved to the game folder. Is the game server running? Start the game from its shortcut.')});
let colonyUI=null,ops=null,expUI=null,gameRef=null;

const $=id=>document.getElementById(id);
// Mistakes in the hand-edited files are listed on the title screen; the game keeps its built-in values for them.
const fileWarnings=[['prices.json',priceReport.warnings],['starting-kit.json',kitReport.warnings]].filter(([,list])=>list.length);
if(fileWarnings.length){const esc=x=>x.replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'})[c]),w=$('prices-warning');w.innerHTML=fileWarnings.map(([name,list])=>{console.warn(name+':\n'+list.join('\n'));return `<strong>${name}</strong> ${list.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}${list.length>3?`<span>…and ${list.length-3} more (see the browser console).</span>`:''}`;}).join('');w.hidden=false;}
let soundOn=true,audio=null,master=null,noiseData=null,toastTimer,helpPaused=false;
const settings=loadSettings();soundOn=settings.sound;
const lastPlayed={},keys=new Set();

// ===== Sound: synthesized on the fly — noise bursts for guns and wood, tones for chimes and voices =====
function tone({type='sine',f=440,f2=null,t=0,dur=.15,vol=.2,attack=.005}){const now=audio.currentTime+t,osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(f,now);if(f2)osc.frequency.exponentialRampToValueAtTime(Math.max(1,f2),now+dur);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(vol,now+attack);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);osc.connect(gain).connect(master);osc.start(now);osc.stop(now+dur+.05);}
function noise({t=0,dur=.2,vol=.3,filter='lowpass',freq=1200,freq2=null,q=1}){noiseData||=(()=>{const buffer=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;return buffer;})();const now=audio.currentTime+t,source=audio.createBufferSource(),shape=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=noiseData;shape.type=filter;shape.Q.value=q;shape.frequency.setValueAtTime(freq,now);if(freq2)shape.frequency.exponentialRampToValueAtTime(freq2,now+dur);gain.gain.setValueAtTime(vol,now);gain.gain.exponentialRampToValueAtTime(.0001,now+dur);source.connect(shape).connect(gain).connect(master);source.start(now);source.stop(now+dur+.05);}
const SOUNDS={
 rifle:()=>{noise({dur:.14,vol:.32,filter:'bandpass',freq:2400,freq2:900,q:.8});tone({type:'square',f:200,f2:80,dur:.06,vol:.08});},
 tower:()=>noise({dur:.12,vol:.22,filter:'bandpass',freq:2600,freq2:1000,q:.8}),
 sickle:()=>noise({dur:.18,vol:.22,filter:'highpass',freq:2500,freq2:6000}),
 kill:()=>{noise({dur:.25,vol:.26,freq:520,freq2:110});tone({type:'sawtooth',f:140,f2:50,dur:.25,vol:.05});},
 hurt:()=>{tone({type:'square',f:110,f2:60,dur:.18,vol:.14});noise({dur:.12,vol:.22,freq:800});},
 harvest:()=>{tone({type:'triangle',f:660,dur:.12,vol:.16});tone({type:'triangle',f:990,t:.08,dur:.16,vol:.14});},
 plant:()=>tone({type:'triangle',f:330,f2:440,dur:.12,vol:.14}),
 buy:()=>{tone({f:880,dur:.08,vol:.13});tone({f:1320,t:.07,dur:.13,vol:.11});},
 sell:()=>{tone({f:1320,dur:.08,vol:.12});tone({f:1760,t:.07,dur:.14,vol:.1});},
 build:()=>{for(const t of [0,.13,.26])noise({t,dur:.07,vol:.4,filter:'bandpass',freq:900,q:2});},
 empty:()=>tone({type:'square',f:90,dur:.05,vol:.08}),
 select:()=>tone({type:'square',f:700,dur:.03,vol:.05}),
 order:()=>{tone({type:'square',f:520,dur:.04,vol:.05});tone({type:'square',f:780,t:.05,dur:.04,vol:.05});},
 bark:()=>{tone({type:'square',f:520,f2:380,dur:.07,vol:.1});tone({type:'square',f:560,f2:400,t:.11,dur:.07,vol:.1});},
 boom:()=>{noise({dur:1.1,vol:.8,freq:900,freq2:50});tone({f:70,f2:28,dur:.9,vol:.55});},
 egg:()=>tone({f:1200,f2:600,dur:.06,vol:.1}),
 eat:()=>{for(const t of [0,.1,.2])noise({t,dur:.05,vol:.16,filter:'bandpass',freq:1500,q:3});},
 night:()=>{tone({f:220,f2:440,dur:1.1,vol:.07,attack:.3});tone({f:330,f2:180,t:.9,dur:1.2,vol:.05,attack:.2});},
 day:()=>{for(const [t,f] of [[0,2400],[.12,2900],[.3,2600],[.42,3100]])tone({f,f2:f*1.25,t,dur:.08,vol:.045});},
 warning:()=>{tone({type:'triangle',f:523,dur:.4,vol:.11});tone({type:'triangle',f:392,t:.35,dur:.5,vol:.11});},
 win:()=>[523,659,784,1047].forEach((f,i)=>tone({type:'triangle',f,t:i*.13,dur:.3,vol:.13})),
 lose:()=>[392,330,262,196].forEach((f,i)=>tone({type:'triangle',f,t:i*.18,dur:.4,vol:.12})),
 fence:()=>noise({dur:.08,vol:.32,filter:'bandpass',freq:700,q:3}),
 fencebreak:()=>noise({dur:.32,vol:.42,freq:1400,freq2:180}),
 survivors:()=>{for(const t of [0,.18])noise({t,dur:.07,vol:.5,filter:'bandpass',freq:500,q:4});},
 scout:()=>{tone({f:1400,f2:1900,dur:.15,vol:.07});tone({f:1900,f2:1300,t:.18,dur:.18,vol:.07});},
 generator:()=>{for(let i=0;i<5;i++)tone({type:'square',f:55,t:i*.07,dur:.05,vol:.08});},
 panic:()=>tone({type:'sawtooth',f:600,f2:900,dur:.4,vol:.06}),
 lightsout:()=>tone({type:'sawtooth',f:120,f2:30,dur:.8,vol:.1}),
 jackpot:()=>[523,659,784,1047,1319].forEach((f,i)=>tone({type:'square',f,t:i*.09,dur:.2,vol:.07})),
 tick:()=>tone({type:'square',f:1700,dur:.015,vol:.045}),
 groan:()=>{tone({type:'sawtooth',f:80+Math.random()*35,f2:62,dur:.9,vol:.05,attack:.15});noise({dur:.8,vol:.04,filter:'bandpass',freq:380,q:2});},
};
function beep(name){if(!soundOn||!audio||!master)return;const now=performance.now();if(now-(lastPlayed[name]||0)<45)return;lastPlayed[name]=now;try{(SOUNDS[name]||SOUNDS.select)();}catch{}}
function unlockAudio(){if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=settings.volume/100;master.connect(audio.destination);}catch{}}audio?.resume().catch(()=>{});}
function notice(text){if(!text)return;const msg=$('build-message');if(msg&&$('build-dialog').open){msg.textContent=text;msg.classList.remove('flash');void msg.offsetWidth;msg.classList.add('flash');}$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}

const game=new GameEngine(e=>{const away=!!gameRef?.run&&!e.site;if(e.type==='sound'&&!away)beep(e.name);if(e.type==='notice'&&away)expUI?.radio(e.text);else if(e.type==='notice'||e.type==='phase')notice(e.text);if(e.type==='expedition-home')expeditionHome(e.summary);if(e.type==='phase'&&e.name==='night')banner(e.horde?'THE HORDE':'A QUIET NIGHT',e.horde?`${e.count} zombies are coming out of the woods`:`${e.count} stragglers wander in`,e.horde);if(e.type==='night-cleared'&&e.horde)beep('win');if(e.type==='night-cleared')banner(e.horde?'HORDE BROKEN':'NIGHT\'S END',e.horde?'The farm held. Greet the dawn when you are ready.':'Greet the dawn when you are ready.',false);});
// A big announcement across the map for hordes and the end of a night.
let bannerTimer;function banner(title,line,danger){const el=$('night-banner');if(!el)return;text('night-banner-title',title);text('night-banner-text',line);el.classList.toggle('danger',!!danger);el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{el.hidden=true;},3600);}
gameRef=game;game.confirmPhases=true;
const canvas=$('game'),renderer=new Renderer(canvas);
const listNames=names=>names.length<2?names.join(''):`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`;
const text=(id,value)=>{const el=$(id);if(el&&el.textContent!==String(value))el.textContent=value;};
const put=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;},html=(el,value)=>{if(el&&el.dataset.html!==value){el.dataset.html=value;el.innerHTML=value;}};
const live=()=>['playing','paused'].includes(game.s.mode);
// The longest endless run is remembered in this browser.
const bestKey='last-harvest-best-endless';let best=Number(localStorage.getItem(bestKey))||0;

// ===== The HUD: laid out on the canvas's 1280×720 grid and scaled with the picture =====
const stageEl=document.querySelector('.game-stage'),frameEl=document.querySelector('.game-frame'),hudEl=$('hud');
function fitHud(){renderer.resize();const narrow=innerWidth<760||innerHeight<420;document.body.classList.toggle('hud-stacked',narrow);if(narrow&&hudEl.parentElement!==frameEl)frameEl.append(hudEl);if(!narrow&&hudEl.parentElement!==stageEl)stageEl.insertBefore(hudEl,$('intro-overlay'));stageEl.style.setProperty('--k',String(stageEl.clientWidth/W));}
new ResizeObserver(fitHud).observe(stageEl);addEventListener('resize',fitHud);fitHud();
// Pop-up panels (supplies, fields & gates) open from the command card; only one at a time.
function togglePop(id,force){const pop=$(id),show=force??pop.hidden;for(const other of ['supplies-pop','fields-pop'])$(other).hidden=true;pop.hidden=!show;$('supplies-btn').classList.toggle('active',!$('supplies-pop').hidden);$('fields-btn').classList.toggle('active',!$('fields-pop').hidden);if(show)colonyUI?.refresh(true);}
$('supplies-btn').addEventListener('click',()=>{unlockAudio();togglePop('supplies-pop');});
$('fields-btn').addEventListener('click',()=>{unlockAudio();togglePop('fields-pop');});
document.querySelectorAll('[data-close-pop]').forEach(b=>b.addEventListener('click',()=>togglePop(b.closest('.hud-pop').id,false)));
// The button next to the timer: end the day early, start the night when the sun is down, greet the dawn.
function confirmPhase(){if(!live())return;unlockAudio();if(game.confirmPhase()){togglePop('supplies-pop',false);focusGame();}else notice('The night is not over yet. Hold the farm until the timer runs out.');sync();}
$('phase-confirm').addEventListener('click',confirmPhase);
installBriefing({game,button:$('briefing-btn'),sync,clearKeys:()=>keys.clear()});
$('ops-btn').addEventListener('click',()=>{unlockAudio();if(!ops.openBoard('midday'))notice('Start your run to plan operations.');sync();});

// ===== The camera: you look down on the farm as its leader. WASD to pan, scroll to zoom. =====
const camera={cx:FARM_CENTER.x+140,cy:FARM_CENTER.y+40,zoom:1};
const siteCamera={cx:0,cy:0,zoom:1},cam=()=>game.run?siteCamera:camera;
function view(){if(game.run)return siteView(game.run,siteCamera);const k=camera.zoom,w=W/k,h=H/k;camera.cx=Math.max(WORLD.left+w/2,Math.min(WORLD.right-w/2,camera.cx));camera.cy=Math.max(WORLD.top+h/2,Math.min(WORLD.bottom-h/2,camera.cy));return {x:Math.round(camera.cx-w/2),y:Math.round(camera.cy-h/2),scale:k};}
const toWorld=(px,py)=>{const v=renderer.view;return {x:v.x+px/v.scale,y:v.y+py/v.scale};};
function lookAt(x,y){const c=cam();c.cx=x;c.cy=y;}

// ===== Selection and orders =====
const selected=new Set();
const pointer={x:W/2,y:H/2,over:false,down:false,button:0,startX:0,startY:0,drag:null,shift:false};
let placing=null,vertical=false,hover={},pendingAssign=null;
function selectOnly(ids){selected.clear();ids.forEach(id=>selected.add(id));if(ids.length)beep('select');syncSelection();}
function toggleSelect(id){selected.has(id)?selected.delete(id):selected.add(id);beep('select');syncSelection();}
function cleanSelection(){const ids=new Set((game.run?game.run.alive:game.s.people).map(p=>p.id));for(const id of [...selected])if(!ids.has(id))selected.delete(id);}
function commandAt(at,queued=false,replace=false){
 if(!selected.size)return false;
 if(game.run){const reply=game.run.command([...selected],at.x,at.y,queued,replace);if(!reply)return false;beep('order');notice(reply.text);return true;}
 const reply=colonyUI?colonyUI.command(at,queued):game.command([...selected],at.x,at.y);
 if(!reply)return false;
 if(reply.type==='lot'){pendingAssign=[...selected];openBuild(reply.lot);return true;}
 beep('order');notice(reply.text);return true;
}
// A left click selects a person, places a defense, opens a lot, or clears the selection. Orders are right-clicks.
function clickAt(px,py,shift,touch=false){
 const at=toWorld(px,py),s=game.s;
 if(game.run){const u=game.run.unitAt(at.x,at.y);if(u){shift?toggleSelect(u.id):selectOnly([u.id]);return;}if(touch&&selected.size){commandAt(at,shift);return;}if(!shift&&selected.size)selectOnly([]);return;}
 if(placing){game.placeGadget(placing,at.x,at.y,vertical);return;}
 const person=game.personAt(at.x,at.y);
 if(person){shift?toggleSelect(person.id):selectOnly([person.id]);return;}
 // A phone has no right button, so a tap gives the selected people their order.
 if(touch&&selected.size){commandAt(at,shift);return;}
 const lot=game.lotAt(at.x,at.y);
 if(lot&&(BUILDINGS[lot].card||!(BUILDINGS[lot].solid===false&&s.buildings[lot]))){openBuild(lot);return;}
 if(!shift&&selected.size)selectOnly([]);
}
function boxSelect(box,add){
 const a=toWorld(Math.min(box.x0,box.x1),Math.min(box.y0,box.y1)),b=toWorld(Math.max(box.x0,box.x1),Math.max(box.y0,box.y1));
 const ids=(game.run?game.run.alive:game.s.people.filter(outside)).filter(p=>p.x>=a.x&&p.x<=b.x&&p.y-12>=a.y&&p.y-12<=b.y).map(p=>p.id);
 if(!add){selectOnly(ids);return;}
 ids.forEach(id=>selected.add(id));if(ids.length)beep('select');syncSelection();
}
// Q selects the fighters (defenders and anyone with a shotgun); Ctrl+A selects everyone outside.
const outside=p=>!p.inside&&p.away<=0;
function selectFighters(){if(game.run){const ids=game.run.alive.filter(u=>u.p.tool).map(u=>u.id);if(!ids.length){notice('Nobody on the team is armed.');return;}selectOnly(ids);return;}const ids=game.s.people.filter(p=>outside(p)&&(p.job==='defender'||p.tool==='gun')).map(p=>p.id);if(!ids.length){notice('No fighters outside. Give someone the Defender job in Operations.');return;}selectOnly(ids);}
function selectEveryone(){selectOnly((game.run?game.run.alive:game.s.people.filter(outside)).map(p=>p.id));}
// Left-drag draws a selection box (Shift adds to it); right- or middle-drag moves the map, and so does a finger.
// A short left press is a click; a short right press sends the selected people.
function dragKind(){if(pointer.button!==0)return 'pan';if(placing)return 'defense';return pointer.touch?'pan':'box';}
function onMinimap(px,py,clamp){const m=renderer.miniRect;if(!m||!live())return false;if(clamp){px=Math.max(m.x,Math.min(m.x+m.w,px));py=Math.max(m.y,Math.min(m.y+m.h,py));}else if(px<m.x||px>m.x+m.w||py<m.y||py>m.y+m.h)return false;lookAt((m.left??WORLD.left)+(px-m.x)/m.k,(m.top??WORLD.top)+(py-m.y)/m.k);return true;}
function canvasPoint(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};}
let fenceStart=null;
function endDrag(){fenceStart=null;pointer.down=false;pointer.drag=null;document.body.classList.remove('is-panning');}
canvas.addEventListener('pointermove',e=>{const p=canvasPoint(e);
 if(pointer.down&&live()){
  if(pointer.drag==='mini')onMinimap(p.x,p.y,true);
  else{if(!pointer.drag&&Math.hypot(p.x-pointer.startX,p.y-pointer.startY)>6){pointer.drag=dragKind();document.body.classList.toggle('is-panning',pointer.drag==='pan');}
   if(pointer.drag==='pan'){const c=cam();c.cx-=(p.x-pointer.x)/c.zoom;c.cy-=(p.y-pointer.y)/c.zoom;view();}}}
 Object.assign(pointer,p,{over:true});});
canvas.addEventListener('pointerleave',()=>{pointer.over=false;$('tooltip').hidden=true;});
canvas.addEventListener('pointerdown',e=>{unlockAudio();focusGame();const p=canvasPoint(e);Object.assign(pointer,p,{down:true,button:e.button,touch:e.pointerType==='touch',startX:p.x,startY:p.y,drag:null,shift:e.shiftKey});canvas.setPointerCapture(e.pointerId);
 if(!live())return;
 if(e.button===0&&onMinimap(p.x,p.y)){pointer.drag='mini';return;}
 if(e.button===0&&placing)fenceStart=toWorld(p.x,p.y);});
canvas.addEventListener('pointerup',e=>{if(!pointer.down)return;const p=canvasPoint(e),was={...pointer},lineStart=fenceStart;endDrag();
 if(!live()||was.drag==='pan'||was.drag==='mini')return;
 if(was.button===2){const at=toWorld(p.x,p.y);if(placing){if(e.altKey)game.removeGadgetAt(at.x,at.y);else setPlacing(null);}else commandAt(at,e.shiftKey,e.altKey);sync();return;}
 if(was.button!==0)return;
 if(was.drag==='defense'&&lineStart){game.placeDefenseLine(placing,lineStart,toWorld(p.x,p.y));sync();return;}
 if(was.drag==='box'){boxSelect({x0:was.startX,y0:was.startY,x1:p.x,y1:p.y},e.shiftKey);return;}
 clickAt(p.x,p.y,e.shiftKey,was.touch);sync();});
canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{if(!live()&&game.s.mode!=='title')return;e.preventDefault();const before=toWorld(pointer.x,pointer.y),c=cam();c.zoom=Math.max(.45,Math.min(1.4,c.zoom*(e.deltaY<0?1.12:1/1.12)));const k=c.zoom;c.cx=before.x-(pointer.x-W/2)/k;c.cy=before.y-(pointer.y-H/2)/k;},{passive:false});
// Double-click someone to select everyone outside who has the same job.
canvas.addEventListener('dblclick',e=>{if(!live()||placing)return;const p=canvasPoint(e),at=toWorld(p.x,p.y);if(game.run){const u=game.run.unitAt(at.x,at.y);if(u)selectOnly(game.run.alive.filter(x=>x.p.job===u.p.job).map(x=>x.id));return;}const person=game.personAt(at.x,at.y);if(person)selectOnly(game.s.people.filter(x=>x.job===person.job&&outside(x)).map(x=>x.id));});

// ===== Hover: whatever is under the mouse is described, and empty lots show what could stand there =====
const ZOMBIE_NAMES={brute:'Brute',runner:'Runner',crawler:'Crawler',spitter:'Spitter',screamer:'Screamer',walker:'Walker'};
function describeSite(at){const run=game.run,u=run.unitAt(at.x,at.y);
 if(u)return {hover:{unit:u},html:`<strong>${u.p.name}</strong><span>${u.p.tool==='gun'?'Shotgun':u.p.tool==='scythe'?'Scythe':'Bare hands'} · ${Math.ceil(u.p.hp)}/${u.p.maxHp} health</span><em>${u.status}</em>${selected.has(u.id)?'':'<small>Click to select · Shift-click to add</small>'}`};
 const z=run.zombieAt(at.x,at.y);if(z)return {hover:{zombie:z},html:`<strong>${ZOMBIE_NAMES[z.kind]||'Zombie'}</strong><span>${Math.ceil(z.hp)}/${z.maxHp} health</span>${selected.size?'<small>Right-click: everyone selected attacks it</small>':''}`};
 const c=run.containerAt(at.x,at.y);if(c)return {hover:{container:c},html:`<strong>${c.marked?'Marked cache':c.kind[0].toUpperCase()+c.kind.slice(1)}</strong><span>${c.progress>0?`${Math.round(c.progress*100)}% searched`:'Not searched yet'}</span><small>${selected.size?'Right-click: queue search · Alt-right-click: search now':'Select someone, then right-click to search it'}</small>`};
 const b=run.buildingAt(at.x,at.y);if(b)return {hover:{building:b},html:`<strong>${b.name}</strong><span>${b.checked?'Checked':'Not checked yet'}</span><small>Right-click: enter, cover and search automatically</small>`};
 return {hover:{},html:''};}
function describe(at){
 if(game.run)return describeSite(at);
 const s=game.s,person=game.personAt(at.x,at.y);
 if(person)return {hover:{person},html:`<strong>${person.name}</strong><span>${JOBS[person.job]}${person.tool?` · ${TOOLS[person.tool]}`:''} · ${Math.ceil(person.hp)}/${person.maxHp} health</span><em>${person.status}</em>${selected.has(person.id)?'':'<small>Click to select · Shift-click to add · double-click for everyone on the same job</small>'}`};
 const zombie=game.zombieAt(at.x,at.y);
 if(zombie)return {hover:{zombie},html:`<strong>${zombie.boss?'Colossus':({brute:'Brute',runner:'Runner',crawler:'Crawler',spitter:'Spitter',screamer:'Screamer',walker:'Walker'}[zombie.kind]||'Zombie')}</strong><span>${Math.ceil(zombie.hp)}/${zombie.maxHp} health</span>${zombie.kind==='crawler'?'<em>Slips under fences · use spikes</em>':zombie.kind==='spitter'?'<em>Ranged acid attack · outrange it with shotguns</em>':zombie.kind==='screamer'?'<em>Calls reinforcements near the farmhouse</em>':''}${selected.size?'<small>Right-click: everyone selected attacks it</small>':''}`};
 const site=game.gadgetSiteAt(at.x,at.y);
 if(site)return {hover:{},html:`<strong>${GADGETS[site.gadget].name} · planned</strong><span>${Math.round(site.progress*100)}% built</span><small>${selected.size?'Right-click to send them to build it':'A builder will put it up'}${placing?' · Right-click to cancel':''}</small>`};
 const lot=game.lotAt(at.x,at.y);
 if(lot){const b=BUILDINGS[lot],level=s.buildings[lot],next=b.levels[level],building=s.sites.find(x=>x.building===lot);
  if(building)return {hover:{lot},html:`<strong>${b.name} · under construction</strong><span>${Math.round(building.progress*100)}% built${building.level>1?` · level ${building.level}`:''}</span><small>${selected.size?'Right-click to send the selected people to build':'Give someone the Builder job, or select people and right-click here'}</small>`};
  if(!level)return {hover:{lot},html:`<strong>${b.name}</strong><span>${b.about}</span><em>${next.text}</em><small>Click to build · ${next.cost} scrap · ${s.scrap>=next.cost?'you can afford it':'not enough scrap'}</small>`};
  return {hover:{lot},html:`<strong>${b.name} · level ${level}</strong><span>${b.levels[level-1].text}</span>${next?`<small>Click to see the next level · ${next.cost} scrap</small>`:'<small>Fully upgraded</small>'}`};}
 const gadget=game.builtGadgetAt(at.x,at.y);
 if(gadget)return {hover:{},html:`<strong>${GADGETS[gadget.kind].name}</strong><span>${Math.ceil(gadget.hp)}/${gadget.maxHp} sturdy</span>${gadget.hp<gadget.maxHp&&selected.size?'<small>Right-click to mend it</small>':''}`};
 const plot=game.plotAt(at.x,at.y);
 if(plot)return {hover:{plot},html:`<strong>${plot.growth>=1?'Ripe crop':plot.growth<0?'Empty plot':'Growing'}</strong><span>${plot.growth>=1?'Ready to harvest':plot.growth<0?(s.seeds?'Ready to plant':'No seeds left'):`${Math.ceil((1-plot.growth)*game.growTimeFor(plot))}s to go`}</span>${selected.size&&game.plotNeedsWork(plot)?'<small>Right-click to send them to work it</small>':''}`};
 if(at.x>=FARMHOUSE.x&&at.x<=FARMHOUSE.x+FARMHOUSE.w&&at.y>=FARMHOUSE.y&&at.y<=FARMHOUSE.y+FARMHOUSE.h)return {hover:{},html:`<strong>Farmhouse</strong><span>${Math.ceil(s.farmHp)}/${game.maxFarmHealth()} · sleeps ${MAX_PEOPLE}</span>${selected.size?'<small>Right-click to send them inside</small>':''}`};
 return {hover:{},html:''};
}
let tooltipEvent=null;
function moveTooltip(e){tooltipEvent=e;}
function syncTooltip(){
 const tip=$('tooltip');
 if(!pointer.over||!live()||pointer.drag||placing){tip.hidden=true;hover={};document.body.classList.remove('is-hovering');return;}
 const at=toWorld(pointer.x,pointer.y),info=describe(at);hover=info.hover;
 document.body.classList.toggle('is-hovering',!!info.html);if(!info.html){tip.hidden=true;return;}
 html(tip,info.html);tip.hidden=false;
 const stage=document.querySelector('.game-stage').getBoundingClientRect(),r=canvas.getBoundingClientRect(),sx=r.width/W,x=pointer.x*sx+r.left-stage.left,y=pointer.y*sx+r.top-stage.top;
 tip.style.left=`${Math.min(stage.width-tip.offsetWidth-8,x+16)}px`;tip.style.top=`${Math.min(stage.height-tip.offsetHeight-8,y+16)}px`;
}

// ===== Defenses: pick one, then click the map to place a blueprint for a builder =====
const GADGET_KEYS=['fence','wire','spikes','mine'];
function setPlacing(kind){endDrag();placing=kind;document.body.classList.toggle('is-placing',!!kind);document.querySelectorAll('[data-gadget]').forEach(b=>b.classList.toggle('active',b.dataset.gadget===kind));$('defense-bar').hidden=!kind;if(kind)text('defense-hint','Click repeatedly or drag a row · snaps to ends · R rotates · right-click / Esc finishes · Alt-right-click removes');$('defense-btn').classList.toggle('active',!!kind);sync();}
document.querySelectorAll('[data-gadget]').forEach(b=>b.addEventListener('click',()=>setPlacing(b.dataset.gadget)));
$('defense-btn').addEventListener('click',()=>{unlockAudio();setPlacing(placing?null:'fence');});
$('defense-rotate').addEventListener('click',()=>{vertical=!vertical;});
$('defense-done').addEventListener('click',()=>setPlacing(null));

// ===== Starting, pausing, overlays =====
function focusGame(){canvas.focus({preventScroll:true});}
// A new farm opens its starting pack, then the Operations board for day 1.
function welcome(){game.pause();sync();ops.openPack(()=>{if(!ops.openBoard('start')&&game.s.mode==='paused')game.resume();sync();});}
function start(endless,campaign=false){unlockAudio();keys.clear();game.start(endless,campaign);selected.clear();setPlacing(null);Object.assign(camera,{cx:FARM_CENTER.x+140,cy:FARM_CENTER.y+60,zoom:1});$('intro-overlay').hidden=true;focusGame();opening.open(welcome);}
function restart(){unlockAudio();keys.clear();game.restart();selected.clear();setPlacing(null);$('intro-overlay').hidden=true;focusGame();opening.open(welcome);}
function togglePause(){keys.clear();if(game.s.mode==='playing')game.pause();else if(game.s.mode==='paused'){game.resume();focusGame();}sync();}
$('start-btn').addEventListener('click',()=>start(false));
$('title-help').addEventListener('click',()=>$('help-btn').click());
$('title-fullscreen').addEventListener('click',()=>$('fullscreen-btn').click());
$('title-sound').addEventListener('click',()=>setSound(!soundOn));
$('endless-btn').addEventListener('click',()=>start(true));
$('pause-btn').addEventListener('click',togglePause);
$('state-action').addEventListener('click',()=>game.s.mode==='paused'?togglePause():restart());
$('state-restart').addEventListener('click',restart);
$('state-endless').addEventListener('click',()=>{unlockAudio();game.continueEndless();focusGame();sync();});
$('shelter-yes').addEventListener('click',()=>{unlockAudio();game.answerSurvivors(true);focusGame();sync();});
$('shelter-no').addEventListener('click',()=>{unlockAudio();game.answerSurvivors(false);focusGame();sync();});
$('house-start').addEventListener('click',()=>{unlockAudio();selected.clear();ops.openBoard('morning');sync();});
// Sound on/off is one setting: the HUD button, the title link and the Settings switch all change it.
function setSound(on,boot=false){soundOn=on;if(!boot){settings.sound=on;saveSettings(settings);if(on){unlockAudio();beep('plant');}}const b=$('sound-btn'),t=$('title-sound');b.classList.toggle('muted',!on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Mute sound':'Enable sound');t.textContent=`Sound: ${on?'on':'off'}`;t.setAttribute('aria-pressed',String(on));}
setSound(soundOn,true);
$('sound-btn').addEventListener('click',()=>{setSound(!soundOn);notice(soundOn?'Sound on':'Sound off');});
$('fullscreen-btn').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('Fullscreen is unavailable in this browser.');}});
const opening=installOpening({game,sync,focusGame});
const pausedReplay=document.createElement('button');pausedReplay.type='button';pausedReplay.id='opening-replay-paused';pausedReplay.className='text-button opening-replay';pausedReplay.textContent='Opening story & survival guide';$('state-overlay').querySelector('.state-card').append(pausedReplay);pausedReplay.addEventListener('click',()=>opening.open());
const help=$('help-dialog');
const replay=document.createElement('button');replay.type='button';replay.id='opening-replay';replay.className='secondary-button opening-replay';replay.textContent='Replay the opening · story & survival';help.querySelector('.help-modal').append(replay);replay.addEventListener('click',()=>{const resume=helpPaused;helpPaused=false;help.close();opening.open(null,resume);});
$('help-btn').addEventListener('click',()=>{helpPaused=game.s.mode==='playing';if(helpPaused){game.pause();keys.clear();sync();}help.showModal();});
$('help-close').addEventListener('click',()=>help.close());
help.addEventListener('close',()=>{if(helpPaused&&game.s.mode==='paused'){game.resume();focusGame();}helpPaused=false;sync();});
help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)help.close();}});
window.addEventListener('blur',()=>{keys.clear();if(game.s.mode==='playing'){game.pause();sync();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(game.s.mode==='playing'){game.pause();sync();}}});

// ===== Keys =====
window.addEventListener('keydown',e=>{
 const k=e.key.toLowerCase();
 if(buildDialog.open){if(k==='b'){e.preventDefault();buildDialog.close();}return;}
 if(document.querySelector('dialog[open]'))return;
 if(e.target instanceof HTMLSelectElement)return;
 if(e.target instanceof HTMLButtonElement&&(k===' '||k==='enter'))return;
 if(e.ctrlKey&&k==='a'){e.preventDefault();if(live()){selectEveryone();sync();}return;}
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','p','escape','b','g','j','r','o','f','i','n','q','m','1','2','3','4','5','6','7','8','+','-','=','h'].includes(k))e.preventDefault();
 keys.add(k);if(e.repeat)return;
 if(k==='p')togglePause();
 if(k==='escape'){if(!$('supplies-pop').hidden||!$('fields-pop').hidden)togglePop('supplies-pop',false);else if(placing)setPlacing(null);else if(selected.size)selectOnly([]);else togglePause();}
 if(!live())return;
 if(game.run){const run=game.run;
  if(k==='q')selectFighters();
  if(k==='m')expUI.useMeds();
  if(k==='h'&&selected.size){run.holdAll([...selected]);notice('Holding position.');}
  if(k==='+'||k==='=')siteCamera.zoom=Math.min(1.4,siteCamera.zoom*1.12);
  if(k==='-')siteCamera.zoom=Math.max(.45,siteCamera.zoom/1.12);
  if(k===' '){const group=run.alive.filter(u=>selected.has(u.id)),at=group.length?group:run.alive;if(at.length)lookAt(at.reduce((t,u)=>t+u.x,0)/at.length,at.reduce((t,u)=>t+u.y,0)/at.length);}
  const n=Number(k);if(n>=1&&n<=8){const u=run.units[n-1];if(u&&u.p.hp>0){e.shiftKey?toggleSelect(u.id):selectOnly([u.id]);if(!e.shiftKey)lookAt(u.x,u.y);}}
  sync();return;}
 if(k==='b')openBuild();
 if(k==='g')setPlacing(placing?null:'fence');
 if(k==='j')openJournal(false);
 if(k==='o')ops.openBoard('midday');
 if(k==='f')togglePop('fields-pop');
 if(k==='i')togglePop('supplies-pop');
 if(k==='n')confirmPhase();
 if(k==='q')selectFighters();
 if(k==='r'&&placing)vertical=!vertical;
 if(k==='h')game.s.people.forEach(p=>selected.has(p.id)&&game.clearOrders([p.id]));
 if(k==='+'||k==='=')camera.zoom=Math.min(1.4,camera.zoom*1.12);
 if(k==='-')camera.zoom=Math.max(.45,camera.zoom/1.12);
 if(k===' '){const group=game.s.people.filter(p=>selected.has(p.id)&&!p.inside&&p.away<=0);if(group.length)lookAt(group.reduce((t,p)=>t+p.x,0)/group.length,group.reduce((t,p)=>t+p.y,0)/group.length);else lookAt(FARMHOUSE.x+FARMHOUSE.w/2,FARMHOUSE.y+FARMHOUSE.h+60);}
 const number=Number(k);
 if(number>=1&&number<=8){if(placing&&number<=4){setPlacing(GADGET_KEYS[number-1]);return;}const person=game.s.people[number-1];if(person){e.shiftKey?toggleSelect(person.id):selectOnly([person.id]);if(!e.shiftKey&&!person.inside&&person.away<=0)lookAt(person.x,person.y);}}
 sync();
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

// ===== The build menu: order a building or its next level; someone has to build it =====
const buildDialog=$('build-dialog'),buildIcons={field:'i-wheat',barn:'i-house',clinic:'i-cross',radio:'i-bolt',weapons:'i-shotgun',warehouse:'i-anvil',silo:'i-silo',well:'i-well',waterTank:'i-drop',coop:'i-egg',pasture:'i-cow',doghouse:'i-paw',market:'i-market',workshop:'i-anvil',watchtower:'i-tower',generator:'i-bolt',crops:'i-corn'},scrapIcon='<svg class="icon"><use href="#i-scrap"/></svg>';let buildPaused=false;
const card=(id,b,kind)=>`<article class="build-card" ${kind==='research'?'data-research':'data-building'}="${id}"><div class="build-card-top"><span class="build-icon"><svg class="icon"><use href="#${buildIcons[id]}"/></svg></span><div><h3>${b.name}</h3><span class="build-level"></span></div><span class="level-pips" aria-hidden="true">${b.levels.map(()=>'<i></i>').join('')}</span></div><p class="build-about">${b.about}</p><dl class="build-effect"><div><dt>NOW</dt><dd class="build-now"></dd></div><div><dt>NEXT</dt><dd class="build-next"></dd></div></dl><div class="build-progress" hidden><span></span></div><button class="primary-button build-action" type="button" ${kind==='research'?'data-upgrade':'data-build'}="${id}"></button>${id==='market'?'<button class="text-button build-sell" type="button" data-sell></button>':''}${id==='generator'?'<button class="text-button build-sell" type="button" data-power></button>':''}${id==='pasture'?'<button class="text-button build-sell" type="button" data-cow></button>':''}</article>`;
$('build-grid').innerHTML=Object.entries(BUILDINGS).map(([id,b])=>card(id,b,'building')).join('');$('upgrade-grid').innerHTML=Object.entries(UPGRADES).map(([id,b])=>card(id,b,'research')).join('');
function openBuild(focus){if($('build-message'))$('build-message').textContent='';if(buildDialog.open||!live())return;buildPaused=game.s.mode==='playing';if(buildPaused){game.pause();keys.clear();}syncBuild();document.querySelectorAll('.build-card').forEach(c=>c.classList.toggle('focus',c.dataset.building===focus));buildDialog.showModal();if(focus)buildDialog.querySelector(`[data-building="${focus}"]`).scrollIntoView({block:'nearest'});sync();}
$('build-btn').addEventListener('click',()=>{unlockAudio();openBuild();});
$('build-close').addEventListener('click',()=>buildDialog.close());
buildDialog.addEventListener('close',()=>{pendingAssign=null;if(buildPaused&&game.s.mode==='paused'){game.resume();focusGame();}buildPaused=false;sync();});
buildDialog.addEventListener('click',e=>{
 const build=e.target.closest('[data-build]'),upgrade=e.target.closest('[data-upgrade]');
 const flash=el=>{const card=el.closest('.build-card');card.classList.remove('raised');void card.offsetWidth;card.classList.add('raised');};
 if(build){unlockAudio();const id=build.dataset.build,site=game.orderBuild(id);if(site){flash(build);if(pendingAssign?.length){const b=BUILDINGS[id];game.command(pendingAssign,b.x+b.w/2,b.y+b.h/2);notice(`${listNames(game.s.people.filter(p=>pendingAssign.includes(p.id)).map(p=>p.name))}: off to build the ${b.name.toLowerCase()}.`);pendingAssign=null;buildDialog.close();}}sync();return;}
 if(upgrade){unlockAudio();if(game.research(upgrade.dataset.upgrade))flash(upgrade);sync();return;}
 if(e.target.closest('[data-sell]')){unlockAudio();game.sellFood();sync();return;}
 if(e.target.closest('[data-power]')){unlockAudio();game.toggleGenerator();sync();return;}
 if(e.target.closest('[data-cow]')){unlockAudio();game.buyCow();sync();return;}
 if(e.target===buildDialog){const r=buildDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)buildDialog.close();}
});
// Upgrades that need something besides scrap.
function buildLock(id,level){const s=game.s;if(id==='weapons'&&!s.discoveredPlans?.length)return 'Needs weapon blueprints · bring some back from any expedition';if(id==='radio'&&level===1&&(s.components||0)<1)return 'Needs an aerial component · gas station or town';return '';}
function syncBuild(){const s=game.s,builders=s.people.filter(p=>p.job==='builder').length;text('build-scrap',s.scrap);text('build-food',`${s.food}/${s.foodCap}`);text('build-daylight',builders?`${builders} ${builders===1?'BUILDER':'BUILDERS'} · ${s.phase==='day'?'WORKING':'RESTING UNTIL DAWN'}`:'NO BUILDERS YET · ASSIGN THE JOB OR SEND PEOPLE');$('build-daylight').classList.toggle('resting',s.phase!=='day'||!builders);
 document.querySelectorAll('.build-card').forEach(card=>{const research=!!card.dataset.research,id=research?card.dataset.research:card.dataset.building,b=research?UPGRADES[id]:BUILDINGS[id],level=research?s.upgrades[id]:s.buildings[id],next=b.levels[level],site=!research&&s.sites.find(x=>x.building===id),q=selector=>card.querySelector(selector);card.classList.toggle('built',level>0);card.querySelectorAll('.level-pips i').forEach((pip,i)=>pip.classList.toggle('on',i<level));
  put(q('.build-level'),level?`LEVEL ${level} OF ${b.levels.length}`:id==='crops'?'WHEAT':research?'NOT RESEARCHED':'NOT BUILT');put(q('.build-now'),level?b.levels[level-1].text:id==='silo'?`The farmhouse pantry holds ${PANTRY_SIZE} food`:id==='waterTank'?`Farmhouse barrels hold ${WATER_CAP} water`:id==='crops'?'Wheat · 1 food per harvest':id==='weapons'?'Standard shotguns':'Nothing here yet');put(q('.build-next'),next?next.text:'Fully upgraded');
  const bar=q('.build-progress');bar.hidden=!site;if(site)bar.firstElementChild.style.width=`${Math.round(site.progress*100)}%`;
  const action=q('.build-action'),locked=next&&!site&&buildLock(id,level),short=next&&!site&&!locked&&s.scrap<next.cost;html(action,!next?'Fully upgraded':site?`Under construction · ${Math.round(site.progress*100)}%`:locked?locked:`${research?'Upgrade':level?'Order level '+(level+1):'Order construction'} · ${next.cost} ${scrapIcon}${short?` · need ${next.cost-s.scrap} more`:''}`);action.disabled=!next||!!site||!!locked||short;action.classList.toggle('locked',!!locked);
  const sell=q('[data-sell]');if(sell){const amount=Math.min(5,s.food);put(sell,!level?'Build the stall to trade food':amount?`Sell ${amount} food for ${amount*game.stat('market','price')} scrap →`:'No food to sell yet');sell.disabled=!level||!amount;}
  const power=q('[data-power]');if(power){put(power,!level?'Comes with 2 gasoline':`${s.generatorOn?'Switch off':'Switch on'} · ${s.gas.toFixed(1)} gasoline left`);power.disabled=!level;}
  const cow=q('[data-cow]');if(cow){const herd=s.cows.length,room=game.stat('pasture','cows');put(cow,!level?'Comes with 2 cows':herd<room?`Buy a cow · ${SHOP.cow} scrap (${herd}/${room})`:`Herd complete · ${herd} cows`);cow.disabled=!level||herd>=room||s.scrap<SHOP.cow;}});}

// ===== Supplies: healing goes to the selected person, or to whoever is hurt worst =====
document.querySelectorAll('[data-buy]').forEach(b=>{const price=b.querySelector('.shop-price');if(price?.firstChild)price.firstChild.nodeValue=String(SHOP[b.dataset.buy]);});
document.querySelectorAll('.plan-tool[data-gadget] small').forEach(el=>{const g=GADGETS[el.closest('[data-gadget]').dataset.gadget];el.textContent=`${g.cost} scrap · ${el.textContent.split('·').pop().trim()}`;});
const target=()=>selected.size===1?[...selected][0]:undefined;
document.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{unlockAudio();if(!live()){notice('Start your run to use the supply store.');return;}game.buy(b.dataset.buy,target());sync();}));
document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>{unlockAudio();if(!live()){notice('Start your run to use the supply store.');return;}const act=b.dataset.action;if(act==='eat')game.eat(target());else if(act==='meds')game.useMeds(target());else game.sellFood();sync();}));

// ===== The people panel: everyone's job, tool, health and what they are doing =====
let rosterKey='';
// Folded panels open and fold only when clicked: the ▲ tab, the people header or the objectives title.
// They start folded unless Settings says otherwise, and nothing in the game opens them by itself.
const folds=[...document.querySelectorAll('.hud .hud-fold')];
function setFold(panel,open){panel.classList.toggle('pinned',open);const tab=panel.querySelector('.fold-handle');if(tab){tab.setAttribute('aria-expanded',String(open));tab.setAttribute('aria-label',open?'Fold this panel':'Open this panel');}}
const toggleFold=panel=>setFold(panel,!panel.classList.contains('pinned'));
folds.forEach(panel=>{setFold(panel,settings.hudOpen);panel.querySelector('.fold-handle')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleFold(panel);if(live())focusGame();});});
document.querySelector('.hud-people .people-head').addEventListener('click',e=>{if(!e.target.closest('.chip'))toggleFold(e.currentTarget.closest('.hud-fold'));});
document.querySelector('#hud-objectives summary').addEventListener('click',e=>{e.preventDefault();toggleFold(e.currentTarget.closest('.hud-fold'));});
$('people-strip').addEventListener('click',e=>{const chip=e.target.closest('.chip');if(!chip)return;e.stopPropagation();const id=Number(chip.dataset.id),person=game.s.people.find(p=>p.id===id);if(!person)return;e.shiftKey?toggleSelect(id):selectOnly([id]);if(!person.inside&&person.away<=0)lookAt(person.x,person.y);sync();});
$('people-list').addEventListener('click',e=>{const card=e.target.closest('.pcard');if(!card)return;const id=Number(card.dataset.id),person=game.s.people.find(p=>p.id===id);if(!person)return;e.shiftKey?toggleSelect(id):selectOnly([id]);if(!person.inside&&person.away<=0)lookAt(person.x,person.y);sync();});
function syncPeople(){const s=game.s,list=$('people-list'),key=s.people.map(x=>x.id).join(',');text('people-count',`${s.people.length}/${MAX_PEOPLE} PEOPLE`);text('water-value',`${s.water}/${s.waterCap}`);text('animals-value',game.animalCount());text('gas-value',s.gas.toFixed(1));text('meds-value',s.meds);text('tools-value',`${game.toolsFree('gun')}/${game.toolTotal('gun')} · ${game.toolsFree('scythe')}/${game.toolTotal('scythe')}`);
 if(key!==rosterKey){$('people-strip').innerHTML=s.people.map((x,i)=>`<button class="chip" type="button" data-id="${x.id}" title="${x.name} · key ${i+1}" aria-label="Select ${x.name}" style="--shirt:${LOOKS[x.look%LOOKS.length].shirt}">${x.name[0]}<i><b></b></i></button>`).join('');}
 if(key!==rosterKey){rosterKey=key;list.innerHTML=s.people.map((x,i)=>`<button class="pcard" type="button" data-id="${x.id}" title="Click to select · key ${i+1}"><span class="pc-avatar" style="--shirt:${LOOKS[x.look%LOOKS.length].shirt}">${x.name[0]}<kbd>${i+1}</kbd></span><span class="pc-info"><strong>${x.name}</strong><span class="pc-job"></span><span class="pc-status"></span><span class="meter pc-hp"><span></span></span></span></button>`).join('');}
 for(const x of s.people){const card=list.querySelector(`[data-id="${x.id}"]`);if(!card)continue;put(card.querySelector('.pc-job'),`${JOBS[x.job]}${x.tool?` · ${TOOLS[x.tool].toLowerCase()}`:''}`);put(card.querySelector('.pc-status'),x.hungry?`${x.status} · hungry`:x.status);card.querySelector('.pc-hp span').style.width=`${100*x.hp/x.maxHp}%`;card.classList.toggle('alarm',!!(x.panic||x.bubble==='Out of seeds'||x.hungry||x.waiting||x.bubble==='No shells!'));card.classList.toggle('selected',selected.has(x.id));card.classList.toggle('away',!!(x.expeditionId||x.away>0));const chip=$('people-strip').querySelector(`[data-id="${x.id}"]`);if(chip){chip.querySelector('b').style.width=`${100*x.hp/x.maxHp}%`;chip.classList.toggle('selected',selected.has(x.id));chip.classList.toggle('alarm',card.classList.contains('alarm'));chip.classList.toggle('away',card.classList.contains('away'));}}}
function syncSelection(){const s=game.s;cleanSelection();const group=s.people.filter(p=>selected.has(p.id));const bar=$('selection-bar');
 if(s.mode==='house')html($('selection-text'),'Everyone is at breakfast · <strong>start the day</strong> when you are ready');
 else if(placing){html($('selection-text'),`<strong>Placing: ${GADGETS[placing].name}</strong> · ${GADGETS[placing].cost} scrap · ${placing==='fence'?'drag to draw a line or click once':'click the map'} · <kbd>R</kbd> rotate · right-click to take back`);}
 else if(group.length){html($('selection-text'),`<strong>${listNames(group.map(p=>p.name))}</strong> · right-click the map to send ${group.length>1?'them':group[0].name} (they fight on the way), or right-click a zombie, crop, lot or the house.`);}
 else html($('selection-text'),'Click someone, or drag a box around a group. <kbd>Q</kbd> selects your fighters. Right-drag or <kbd>WASD</kbd> moves the map.');
 bar.classList.toggle('has-selection',group.length>0);$('back-to-work').hidden=!group.some(p=>p.order);$('deselect').hidden=!group.length;}
$('back-to-work').addEventListener('click',()=>{game.clearOrders([...selected]);notice('Back to their jobs.');sync();});
$('deselect').addEventListener('click',()=>{selectOnly([]);sync();});

// ===== The journal book =====
const journal=$('journal-dialog');let journalIndex=-1,journalPaused=false;
function openJournal(auto){if(document.querySelector('dialog[open]')||['title','prompt'].includes(game.s.mode))return;journalPaused=!auto&&game.s.mode==='playing';if(journalPaused){game.pause();keys.clear();}journalIndex=game.s.journal.length-1;renderJournal();$('journal-continue').hidden=game.s.mode!=='journal';$('journal-close').hidden=game.s.mode==='journal';journal.showModal();}
$('journal-tool').addEventListener('click',()=>openJournal(false));
$('fighters-btn').addEventListener('click',()=>{unlockAudio();if(live()){selectFighters();sync();}focusGame();});
$('journal-continue').addEventListener('click',()=>journal.close());
$('journal-close').addEventListener('click',()=>journal.close());
$('journal-prev').addEventListener('click',()=>{journalIndex=Math.max(0,journalIndex-1);renderJournal();});
$('journal-next').addEventListener('click',()=>{journalIndex=Math.min(game.s.journal.length-1,journalIndex+1);renderJournal();});
journal.addEventListener('close',()=>{if(game.s.mode==='journal')game.closeJournal();if(journalPaused&&game.s.mode==='paused'){game.resume();focusGame();}journalPaused=false;sync();});
const journalMood=e=>e.horde&&!e.fell&&!e.deaths.length?(e.farmDamage>=40?`The horde of ${e.wave} nearly broke through. We held, barely.`:`We broke a horde of ${e.wave}. The farm still stands.`):e.fell?'The farm fell tonight. Whoever finds this: grow something.':e.deaths.length?`We lost ${listNames(e.deaths)} tonight. The house is quieter.`:e.farmDamage>=40?'They nearly tore the house down. More fences tomorrow.':e.animalDeaths.length?'The dead got into the animals. Keep the herd closer.':e.kills>=25?'A long, loud night. My ears are still ringing.':!e.hits&&!e.farmDamage?'A quiet night. Not a scratch on anyone.':'Another night behind us. The sun is coming up.';
const survivorLine=e=>[`${e.survivors} living here`,e.arrivals.length&&`${listNames(e.arrivals)} arrived`,e.deaths.length&&`${listNames(e.deaths)} died`,e.left.length&&`${listNames(e.left)} left`].filter(Boolean).join(' · ');
function renderJournal(){const pages=game.s.journal,entry=pages[journalIndex],row=(k,v)=>`<div><dt>${k}</dt><dd>${v}</dd></div>`;$('journal-empty').hidden=!!entry;$('journal-prev').disabled=journalIndex<=0;$('journal-next').disabled=journalIndex>=pages.length-1;text('journal-page-label',pages.length?`Page ${journalIndex+1} of ${pages.length}`:'');
 if(!entry){text('journal-title','A blank page');text('journal-mood','');$('journal-stats').innerHTML='';$('journal-totals').innerHTML='';return;}
 text('journal-title',`Day ${entry.day}`);text('journal-mood',journalMood(entry));
 $('journal-stats').innerHTML=[row('Days survived',entry.fell?`${entry.day-1} · fell on night ${entry.day}`:entry.day),row('Times my people got hit',entry.hits?`${entry.hits} (−${entry.damage} health)`:'Not once'),row('Zombies killed',entry.kills),row('Farmhouse damage',entry.farmDamage||'None'),row('Animals',`${entry.animals}${entry.animalDeaths.length?` · lost ${entry.animalDeaths.length}`:''}`),row('Survivors',survivorLine(entry)),row('Crops harvested',entry.harvested),row('The night',entry.horde?`A horde of ${entry.wave}`:'Quiet · a few stragglers'),entry.expedition&&row('Expedition',`${PLACES[entry.expedition.place]?.name||'A site'} · ${entry.expedition.lost?'the team was lost':`${entry.expedition.searched} searched · ${entry.expedition.kills} put down${entry.expedition.joined?` · ${entry.expedition.joined} joined`:''}${entry.expedition.deaths?` · ${entry.expedition.deaths} lost`:''}`}`)].filter(Boolean).join('');
 const upTo=pages.slice(0,journalIndex+1),sum=key=>upTo.reduce((total,page)=>total+(Array.isArray(page[key])?page[key].length:page[key]||0),0);
 $('journal-totals').innerHTML=[row('Nights survived',entry.fell?entry.day-1:entry.day),row('Zombies killed',sum('kills')),row('Times my people got hit',sum('hits')),row('Farmhouse damage',sum('farmDamage')),row('Crops harvested',sum('harvested')),row('Survivors lost',sum('deaths')),row('Animals lost',sum('animalDeaths'))].join('');}

// ===== The morning wheel: the engine picks the slice, the wheel just spins to land on it =====
const wheelDialog=$('wheel-dialog');
const morningWheel=installMorningWheel({game,sync,focusGame,unlockAudio,beep});
function openWheel(){morningWheel.open();}

// ===== Breakfast in the farmhouse =====
function syncHouse(){const s=game.s,b=s.breakfast,show=s.mode==='house'&&!!b;$('house-overlay').hidden=!show;if(!show)return;text('house-day',`MORNING · DAY ${s.day+1}`);
 const lines=[b.fed.length&&`<li><strong>Breakfast:</strong> ${listNames(b.fed)} had ${b.fed.length} portions${b.prepared?` (${b.prepared} prepared)`:``} and drank ${b.fed.length} water.</li>`,b.hungry.length&&`<li class="warn"><strong>Hungry:</strong> ${listNames(b.hungry)} went without. Another hungry morning and they leave.</li>`,b.left.length&&`<li class="warn"><strong>Gone:</strong> ${listNames(b.left)} left the farm in the night. There was nothing to eat.</li>`,b.wounded.length&&`<li><strong>Resting:</strong> ${listNames(b.wounded)} ${b.wounded.length>1?'are':'is'} hurt and resting upstairs.</li>`,b.water&&`<li>The well and tank gave ${b.water} water.</li>`,`<li>Dawn supplies: +${DAWN_SUPPLIES.ammo} shells, +${DAWN_SUPPLIES.seeds} seeds, +${DAWN_SUPPLIES.water} water.</li>`].filter(Boolean).join('');
 html($('house-notes'),lines);text('house-start','Plan the day →');text('house-stores',`Food ${s.food}/${s.foodCap} · Water ${s.water}/${s.waterCap}`);}

// ===== Keeping the page in step with the game =====
let previousMode='',opsShown=false,modalShown=false;
let lastRun=null;
// A run starting: the camera goes to the truck and the whole team is selected.
function runChanged(run){lastRun=run;if(!run)return;setPlacing(null);togglePop('supplies-pop',false);Object.assign(siteCamera,{cx:run.site.truck.x,cy:run.site.truck.y-200,zoom:1});selectOnly(run.alive.map(u=>u.id));}
// Home at dusk: back to the farm camera at the south gate, with the day's summary.
function expeditionHome(summary){selected.clear();lastRun=null;Object.assign(camera,{cx:560,cy:520});keys.clear();expUI?.showSummary(summary);sync();}
function sync(){const s=game.s;document.body.classList.toggle('on-site',!!game.run);$('cheat-label').hidden=!s.cheated||s.mode==='title';if(game.run!==lastRun)runChanged(game.run);expUI?.syncHud();const remaining=Math.max(0,Math.ceil(s.phaseDuration-s.phaseTime));const morning=['wheel','house'].includes(s.mode);text('day-label',`DAY ${String(morning?s.day+1:s.day).padStart(2,'0')}`);const wave=s.phase==='night'&&s.wave,left=wave?Math.max(0,wave.total-wave.spawned)+s.zombies.length:0;text('phase-label',morning?'MORNING':s.phase==='day'?'DAYLIGHT':wave?.horde?`HORDE · NIGHT ${s.day}`:'QUIET NIGHT');text('phase-timer',wave?`${left} left`:`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`);$('phase-fill').style.width=wave?`${wave.total?100*left/wave.total:0}%`:`${Math.max(0,100*(1-s.phaseTime/s.phaseDuration))}%`;document.querySelector('.hud-clock')?.classList.toggle('horde-on',!!wave?.horde);
 const ahead=game.nightsToHorde?game.nightsToHorde(morning?s.day+1:s.day):0,next=game.nightPlan?game.nightPlan((morning?s.day+1:s.day)+ahead):null,hordeLine=$('horde-line');if(hordeLine){const tonight=!wave&&ahead===0;hordeLine.classList.toggle('danger',tonight||!!wave?.horde);put(hordeLine,wave?(wave.horde?`${wave.total} in this horde · ${s.today.kills} killed tonight`:`Next horde in ${game.nightsToHorde(s.day+1)+1} night${game.nightsToHorde(s.day+1)?'s':''}`):tonight?`⚠ HORDE TONIGHT · ${next?.count||''} zombies`:`Next horde in ${ahead} night${ahead===1?'':'s'} · ${next?.count||''} zombies`);}document.body.classList.toggle('is-night',s.phase==='night');
 const hurt=s.people.reduce((t,p)=>t+p.hp,0),most=s.people.reduce((t,p)=>t+p.maxHp,0)||1;text('people-value',`${s.people.length}`);$('people-fill').style.width=`${100*hurt/most}%`;text('farm-value',`${Math.ceil(s.farmHp)}/${game.maxFarmHealth()}`);$('farm-fill').style.width=`${Math.max(0,100*s.farmHp/game.maxFarmHealth())}%`;
 for(const k of ['seeds','scrap','ammo'])text(k+'-value',s[k]);text('food-value',`${s.food}/${s.foodCap}`);$('food-value').parentElement.classList.toggle('full',s.food>=s.foodCap);text('water-bar',`${s.water}/${s.waterCap}`);text('harvest-value',s.harvested);text('kills-value',s.kills);const raised=Object.entries(s.buildings).filter(([id,n])=>n>(BUILDINGS[id].starts||0)).length;text('built-value',raised);const nights=s.mode==='won'?(s.campaign?10:3):s.day-1;
 $('mode-label').hidden=!s.endless;text('mode-label',s.campaign?'CAMPAIGN':'ENDLESS');text('survive-label',s.campaign?'Contact settlement · survive 10 nights':s.endless?'Survive the endless nights':'Survive three nights');put($('goal-survive').querySelector('.goal-counter'),s.campaign?`${nights}/10`:s.endless?`${nights}${best?` · best ${best}`:''}`:`${Math.min(3,nights)}/3`);text('best-label',best?`YOUR BEST: ${best} ${best===1?'NIGHT':'NIGHTS'}`:'NO RECORD YET');
 const anyHurt=s.people.some(p=>p.hp<p.maxHp),cost=SHOP;document.querySelectorAll('[data-buy]').forEach(b=>{const k=b.dataset.buy;b.disabled=live()&&(s.scrap<cost[k]||(k==='heal'&&!anyHurt)||(k==='repair'&&s.farmHp>=game.maxFarmHealth()));});
 const price=game.stat('market','price'),sellAmount=Math.min(5,s.food);document.querySelector('[data-action="eat"]').disabled=live()&&(s.food<MEAL_COST||!anyHurt);document.querySelector('[data-action="meds"]').disabled=live()&&(s.meds<=0||!anyHurt);document.querySelector('[data-action="sell"]').disabled=live()&&(!price||!sellAmount);text('sell-value',price*(sellAmount||5));text('sell-note',price?`${sellAmount||5} food at the stall`:'Needs a market stall');
 const confirmBtn=$('phase-confirm'),ready=!!s.phaseReady,night=s.phase==='night';confirmBtn.hidden=!live();confirmBtn.classList.toggle('ready',ready);confirmBtn.disabled=night&&!ready;html(confirmBtn,`${night?(ready?'Greet the dawn →':'Night in progress…'):(ready?'Start the night →':'End the day early')} <kbd>N</kbd>`);
 if(ready)text('phase-label',night?'DAWN · WAITING':'DUSK · WAITING');
 document.body.classList.toggle('is-title',s.mode==='title');
 const alertCount=live()&&game.alerts?game.alerts().length:0,badge=$('objectives-badge');badge.hidden=!alertCount;put(badge,`⚠ ${alertCount}`);
 syncPeople();syncSelection();syncHouse();if(buildDialog.open)syncBuild();
 $('goal-build')?.classList.toggle('complete',raised>=2);$('goal-harvest')?.classList.toggle('complete',s.harvested>=5);$('goal-kills')?.classList.toggle('complete',s.kills>=10);$('goal-survive')?.classList.toggle('complete',s.mode==='won');
 if(s.mode==='journal'&&!journal.open)openJournal(true);if(s.mode==='wheel'&&!journal.open&&!wheelDialog.open)openWheel();
 const visiting=s.mode==='prompt'&&!!s.visitors;$('survivor-overlay').hidden=!visiting;if(visiting){const many=s.visitors.length>1;text('survivor-title',`${listNames(s.visitors)} ${many?'are':'is'} at the gate.`);text('survivor-text',many?`${s.visitors.length} tired, hungry strangers ask to stay. They'll work for their keep.`:'Tired, hungry and unarmed, they ask to stay. They will work for their keep.');}
 text('defense-scrap',s.scrap);
 $('pause-btn').disabled=['title','won','gameover','prompt','house','journal','wheel'].includes(s.mode)||!!ops?.isOpen();$('pause-btn').setAttribute('aria-label',s.mode==='paused'?'Resume game':'Pause game');$('pause-btn').classList.toggle('paused',s.mode==='paused');
 document.body.classList.toggle('farm-low',s.mode==='playing'&&s.farmHp<30);document.body.classList.toggle('in-house',atBreakfast(s));
 if(previousMode!==s.mode||ops?.isOpen()!==opsShown||modalShown!==!!document.querySelector('dialog[open]')){modalShown=!!document.querySelector('dialog[open]');previousMode=s.mode;opsShown=!!ops?.isOpen();const show=['paused','gameover','won'].includes(s.mode)&&!(s.mode==='paused'&&(opsShown||document.querySelector('dialog[open]')));$('state-overlay').hidden=!show;if(show){const won=s.mode==='won',paused=s.mode==='paused',record=s.endless&&!s.campaign&&!s.cheated&&s.mode==='gameover'&&nights>best;if(record){best=nights;localStorage.setItem(bestKey,String(best));}
  const tally=`harvested ${s.harvested} crops, raised ${raised} ${raised===1?'building':'buildings'}, and stopped ${s.kills} zombies`,held=`The farm held for ${nights} ${nights===1?'night':'nights'}${record?', a new record!':`. Your best is ${best}.`}`;
  text('state-eyebrow',paused?'TAKE A BREATHER':won?'THREE NIGHTS. ONE FARM.':s.endless?`ENDLESS · DAY ${s.day}`:'THE FARM FALLS SILENT');text('state-title',paused?'The farm can wait.':won?'Still growing.':'One more sunrise?');text('state-description',paused?'Your people and the horde will be right here.':won?`You led the homestead through 3 nights, ${tally}. The dead are still out there.`:`${s.farmHp<=0?'The farmhouse was overrun.':'Nobody is left on the farm.'} ${s.endless?`${held} You ${tally}.`:`You ${tally}. A new farm is a fresh chance.`}`);text('state-action',paused?'Back to the farm →':'Plant a new beginning →');$('state-restart').hidden=!paused;$('state-endless').hidden=!(won&&!s.endless);keys.clear();}}
 colonyUI?.refresh();
}

// ===== The frame loop =====
let last=performance.now(),hud=0;
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;const s=game.s;
 if(live()||s.mode==='title'){const mx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),my=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const c=cam();c.cx+=mx*720/c.zoom*dt;c.cy+=my*720/c.zoom*dt;}
 game.advance(dt*(colonyUI?.speed()||1));cleanSelection();syncTooltip();
 const at=toWorld(pointer.x,pointer.y),ghost=placing&&pointer.over&&live()?game.gadgetGhost(placing,at.x,at.y,vertical):null,box=pointer.drag==='box'?{x0:pointer.startX,y0:pointer.startY,x1:pointer.x,y1:pointer.y}:null;
 // The main menu shows its own night scene; the real farm is drawn once a run begins.
 if(s.mode==='title'){menuScene??=createMenuScene(s);stepMenuScene(menuScene,dt);}else menuScene=null;
 if(game.run)drawSite(renderer,game.run,now/1000,{view:view(),selected,hover,box});
 else renderer.render(menuScene||s,now/1000,{view:menuScene?menuView(now):view(),selected,hover,ghost,box,fenceLine:pointer.drag==='defense'&&fenceStart?game.defenseLine(placing,fenceStart,at):null});
 const dead=game.run?game.run.zombies:s.zombies;if(s.mode==='playing'&&dead.length&&Math.random()<dt*.5){const v=renderer.view,cx=v.x+W/2/v.scale,cy=v.y+H/2/v.scale;if(dead.some(z=>Math.hypot(z.x-cx,z.y-cy)<400))beep('groan');}
 hud+=dt;if(hud>.1||s.mode!==previousMode){sync();hud=0;}requestAnimationFrame(frame);}
colonyUI=installColonyUI({saves:saveFiles,game,selected,selectOnly,lookAt,notice,sync,focusGame,setPlacing,keys,start,afterLoad:()=>{rosterKey='';ops?.cancelResume();}});
expUI=installExpeditionUI({game,notice,sync,focusGame,beep,selected,selectOnly,selectFighters});
if(saveFiles.moved)setTimeout(()=>notice(`${saveFiles.moved} saved farm${saveFiles.moved===1?'':'s'} moved from the browser into the game folder (saves/).`),600);
ops=installOperations({game,notice,sync,focusGame,beep,packTruck:o=>expUI.openPack(o)});
colonyUI.refresh(true);
let menuScene=null;
const mainMenu=installMainMenu({beep});mainMenu.reset();
installGraphicsControls(renderer);
// Settings pause the run while open, like the almanac.
let settingsPaused=false;
const settingsUI=installSettings({settings,renderer,setSound,setVolume:v=>{if(master)master.gain.value=v/100;},setHudOpen:open=>folds.forEach(panel=>setFold(panel,open)),fullscreen:()=>$('fullscreen-btn').click(),
 onOpen:()=>{cheatMenu?.refresh();settingsPaused=game.s.mode==='playing';if(settingsPaused){game.pause();keys.clear();sync();}},
 onClose:()=>{if(settingsPaused&&game.s.mode==='paused'){game.resume();focusGame();}settingsPaused=false;sync();}});
// The cheat menu lives in Settings (Update 34).
const cheatMenu=installCheatMenu({game,settings,saveSettings,sync,beep});
$('settings-btn').addEventListener('click',()=>{unlockAudio();settingsUI?.open();});
$('title-settings').addEventListener('click',()=>settingsUI?.open());
sync();requestAnimationFrame(frame);

