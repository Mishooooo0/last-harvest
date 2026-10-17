// Main menu (Update 26): a game-style menu over a living night scene.
// The scene is a copy of the title farm drawn at night, with a few walkers shambling outside the fence.
// It never touches the real game state and never saves.
import {FARM_BOUNDARY,SCOUT_GATE} from './perimeter.js';
import {FARMHOUSE} from './engine.js';

const rnd=(a,b)=>a+Math.random()*(b-a);
// Walkers keep to the treeline south of the boundary, so they never cross into the farm.
const band=()=>({x:rnd(160,1160),y:rnd(FARM_BOUNDARY.bottom+20,FARM_BOUNDARY.bottom+64)});
// The menu shows an established homestead, like the opening's last picture.
const ESTABLISHED={silo:2,well:1,waterTank:1,coop:2,doghouse:1,market:1,workshop:2,watchtower:2,barn:1,clinic:1,radio:1};

export function createMenuScene(state){
 const scene=structuredClone(state);
 Object.assign(scene,{menuScene:true,phase:'night',phaseTime:30,lit:true,gas:Math.max(2,scene.gas||0),shake:0,particles:[],zombies:[]});
 for(const [id,level] of Object.entries(ESTABLISHED))if(id in scene.buildings)scene.buildings[id]=Math.max(scene.buildings[id]||0,level);
 scene.dogs=[{id:1,species:'dog',name:'Rex',x:FARMHOUSE.x+FARMHOUSE.w/2,y:FARMHOUSE.y+FARMHOUSE.h+14,hp:60,maxHp:60,angle:Math.PI/2,walk:0,moving:false,hurt:0,hurtCooldown:0,cooldown:0,timer:0,task:null,waypoint:null,goal:null,routeTimer:0,inside:false,out:false}];
 // Two keep watch at the south gate; the others sit by the campfire.
 for(const p of scene.people)Object.assign(p,{waiting:false,bubble:null,moving:false,inside:false,away:0});
 const guard=(p,dx)=>p&&Object.assign(p,{x:SCOUT_GATE.x+dx,y:FARM_BOUNDARY.bottom-24,angle:Math.PI/2,job:'defender',tool:'gun'});
 guard(scene.people[0],-36);guard(scene.people[3],36);
 const kinds=['walker','walker','walker','runner','walker','brute','walker','walker','spitter'];
 kinds.forEach((kind,i)=>{const at=band();scene.zombies.push({id:9000+i,kind,x:at.x,y:at.y,hp:60,maxHp:60,radius:kind==='brute'?17:12,speed:kind==='brute'?8:rnd(10,17),angle:0,hurt:0,walk:rnd(0,6.3),target:band(),wait:rnd(0,4)});});
 return scene;
}

export function stepMenuScene(scene,dt){
 for(const z of scene.zombies){
  if(z.wait>0){z.wait-=dt;continue;}
  const dx=z.target.x-z.x,dy=z.target.y-z.y,d=Math.hypot(dx,dy);
  if(d<3){z.target=band();z.wait=rnd(1.5,5);continue;}
  const step=Math.min(d,z.speed*dt);z.x+=dx/d*step;z.y+=dy/d*step;z.angle=Math.atan2(dy,dx);z.walk+=dt*(z.kind==='runner'?7:4);
 }
}

// The camera frames the lit farmhouse, the campfire and the south gate, and drifts slowly.
export const menuView=now=>({x:Math.round(-370+Math.sin(now/17000)*40),y:0,scale:.8});

// The menu itself: arrow keys or W/S move, Enter picks, Escape goes back. Hover moves the marker too.
export function installMainMenu({beep}){
 const $=id=>document.getElementById(id),layer=document.querySelector('.title-layer'),main=$('title-main'),modes=$('title-newfarm');
 let panel=main,active=null;
 const items=()=>[...panel.querySelectorAll(panel===main?'.menu-item':'.title-mode')].filter(b=>!b.hidden);
 const setActive=(b,{focus=false,sound=true}={})=>{
  if(!b)return;if(focus)b.focus({preventScroll:true});if(b===active)return;
  active?.classList.remove('active');active=b;b.classList.add('active');if(sound)beep('select');
 };
 const show=(next,focus=true)=>{
  panel=next;main.hidden=next!==main;modes.hidden=next!==modes;layer.classList.toggle('choosing',next===modes);
  active?.classList.remove('active');active=null;
  const first=next===modes?modes.querySelector('.title-mode.recommended')||items()[0]:items()[0];
  setActive(first,{focus,sound:false});
 };
 for(const box of [main,modes]){
  box.addEventListener('mouseover',e=>{const b=e.target.closest('.menu-item,.title-mode');if(b&&box.contains(b))setActive(b);});
  box.addEventListener('focusin',e=>{const b=e.target.closest('.menu-item,.title-mode');if(b)setActive(b,{sound:false});});
 }
 $('title-new').addEventListener('click',()=>{beep('order');show(modes);});
 $('title-back').addEventListener('click',()=>{show(main);setActive($('title-new'),{focus:true,sound:false});});
 document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('is-title')||document.querySelector('dialog[open]'))return;
  const k=e.key.toLowerCase(),list=items(),i=list.indexOf(active);
  const move=d=>{e.preventDefault();setActive(list[(i+d+list.length)%list.length],{focus:true});};
  const across=panel===modes;
  if(k==='arrowdown'||k==='s'||(across&&(k==='arrowright'||k==='d')))move(1);
  else if(k==='arrowup'||k==='w'||(across&&(k==='arrowleft'||k==='a')))move(-1);
  else if((k==='escape'||k==='backspace')&&panel===modes){e.preventDefault();$('title-back').click();}
  else if((k==='enter'||k===' ')&&active&&document.activeElement!==active){e.preventDefault();active.click();}
 });
 // Back to the first screen, with Continue (or New farm) marked. Called once the saved farm is known.
 return {reset:()=>show(main,false)};
}
