import {GameEngine,GADGETS,FENCE} from './engine.js';

// The existing world keeps its coordinates; the enlarged clearing includes every building lot.
export const FARM_BOUNDARY=Object.freeze({left:-432,top:-192,right:1248,bottom:720});
export const SCOUT_GATE=Object.freeze({x:504,y:720});
export const GATE_INSIDE=Object.freeze({x:504,y:680});
export const GATE_OUTSIDE=Object.freeze({x:504,y:760});
const inside=p=>p.x>FARM_BOUNDARY.left&&p.x<FARM_BOUNDARY.right&&p.y>FARM_BOUNDARY.top&&p.y<FARM_BOUNDARY.bottom;
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const occupies=(f,slot)=>f.perimeter?f.perimeter===slot.perimeter:overlap(f,slot);
export function perimeterLayout(){
 const b=FARM_BOUNDARY,out=[];
 for(const [side,y] of [['north',b.top],['south',b.bottom]])for(let x=b.left;x<b.right;x+=48){const gate=side==='south'&&x+24===SCOUT_GATE.x;out.push({perimeter:side+':'+x,kind:gate?'gate':'fence',x,y:y-5,w:48,h:10,vertical:false});}
 for(const [side,x] of [['west',b.left],['east',b.right]])for(let y=b.top;y<b.bottom;y+=48)out.push({perimeter:side+':'+y,kind:'fence',x:x-5,y,w:10,h:48,vertical:true});
 return out;
}
export function ensurePerimeter(game){
 const s=game.s;if(s.perimeterVersion===1)return;
 game.gadgetId=Math.max(game.gadgetId||0,...s.fences.map(f=>f.id),...s.traps.map(f=>f.id));
 for(const f of perimeterLayout()){
  // Keep defenses and paid blueprints in older saves. They can stand in for a boundary piece.
  if([...s.fences,...s.traps,...s.sites.filter(p=>p.kind==='gadget').map(p=>({...p.rect,perimeter:p.perimeter}))].some(g=>occupies(g,f)))continue;
  const hp=GADGETS[f.kind].hp;s.fences.push({...f,id:++game.gadgetId,hp,maxHp:hp,hurt:0,...(f.kind==='gate'?{open:false,manualOpen:false}:{})});
 }
 s.perimeterVersion=1;game.updateWalls();
}
export function validPerimeter(s){
 if(s.perimeterVersion!==undefined&&s.perimeterVersion!==1)return false;
 const layout=perimeterLayout(),keys=new Set();
 for(const f of [...s.fences,...s.sites.filter(p=>p.perimeter).map(p=>({...p.rect,kind:p.gadget,perimeter:p.perimeter,hp:1,maxHp:1}))]){
  if(!f.perimeter)continue;
  const slot=layout.find(p=>p.perimeter===f.perimeter);
  if(!slot||keys.has(f.perimeter)||f.kind!==slot.kind||!['x','y','w','h'].every(k=>f[k]===slot[k])||!Number.isFinite(f.hp)||f.hp<=0||!Number.isFinite(f.maxHp)||f.maxHp<=0||f.hp>f.maxHp)return false;
  if(f.kind==='gate'&&f.manualOpen!==undefined&&typeof f.manualOpen!=='boolean')return false;
  keys.add(f.perimeter);
 }
 return true;
}
export function expeditionRoute(origin,place){
 const route=[origin,GATE_INSIDE,GATE_OUTSIDE],b=FARM_BOUNDARY;
 if(place.x<b.left)route.push({x:b.left-64,y:b.bottom+64},{x:b.left-64,y:place.y});
 else if(place.y<b.top)route.push({x:b.right+64,y:b.bottom+64},{x:b.right+64,y:place.y});
 route.push(place);return route;
}
export function routePosition(route,f){
 const lengths=route.slice(1).map((p,i)=>Math.hypot(p.x-route[i].x,p.y-route[i].y));let left=Math.max(0,Math.min(1,f))*lengths.reduce((a,b)=>a+b,0);
 for(let i=0;i<lengths.length;i++){if(left<=lengths[i]||i===lengths.length-1){const t=lengths[i]?left/lengths[i]:0,a=route[i],b=route[i+1];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)};}left-=lengths[i];}
 return {...route[0],angle:0};
}
export const perimeterMethods={
 boundarySafe(rect){const center={x:rect.x+rect.w/2,y:rect.y+rect.h/2};return !this.s.zombies.some(z=>z.hp>0&&Math.hypot(z.x-center.x,z.y-center.y)<180);},
 maintainBoundary(dt){
  // Explicit automatic work orders let builders repair safe sections at night, too.
  // Never commandeer people with a player order, or send them into a nearby horde.
  const s=this.s;
  for(const p of s.people)if(p.order?.autoBoundary){
   const target=p.order.type==='build'?s.sites.find(site=>site.id===p.order.siteId)?.rect:s.fences.find(f=>f.id===p.order.gadgetId);
   if(p.job!=='builder'||p.expeditionId||!target||!this.boundarySafe(target)||s.zombies.some(z=>z.hp>0&&Math.hypot(z.x-p.x,z.y-p.y)<120)){
    p.order=null;p.task=null;
    if(p.orders.length){const [next,...rest]=p.orders;this.giveOrder(p,next);p.orders=rest;}
   }
  }
  this.boundaryTimer=(this.boundaryTimer||0)-dt;if(this.boundaryTimer>0)return;this.boundaryTimer=.5;
  const builders=s.people.filter(p=>p.job==='builder'&&p.hp>0&&!p.expeditionId&&p.away<=0&&!p.order&&!p.orders.length&&!s.zombies.some(z=>z.hp>0&&Math.hypot(z.x-p.x,z.y-p.y)<120));
  if(!builders.length)return;
  const slots=perimeterLayout();
  for(const p of builders){
   const claims=s.people.map(p=>p.order).filter(o=>o?.autoBoundary);
   const distance=r=>Math.hypot(r.x+r.w/2-p.x,r.y+r.h/2-p.y);
   const options=slots.filter(slot=>this.boundarySafe(slot)).map(slot=>{
    const built=s.fences.find(f=>occupies(f,slot)),site=s.sites.find(site=>site.kind==='gadget'&&occupies({...site.rect,perimeter:site.perimeter},slot));
    if(site)return claims.some(o=>o.siteId===site.id)?null:{site,slot};
    if(built)return built.hp<built.maxHp&&!claims.some(o=>o.gadgetId===built.id)?{built,slot}:null;
    if(s.traps.some(t=>overlap(t,slot))||s.scrap<GADGETS[slot.kind].cost)return null;
    return {slot};
   }).filter(Boolean).sort((a,b)=>(a.built?1:0)-(b.built?1:0)||distance(a.slot)-distance(b.slot));
   const target=options[0];if(!target)continue;
   if(target.built){this.giveOrder(p,{type:'repair',gadgetId:target.built.id,autoBoundary:true});continue;}
   let site=target.site;
   if(!site){
    const {kind,perimeter,vertical,...rect}=target.slot;s.scrap-=GADGETS[kind].cost;
    site={id:++this.siteId,kind:'gadget',gadget:kind,perimeter,rect,vertical,progress:0,work:GADGETS[kind].work,priority:1};s.sites.push(site);
   }
   this.giveOrder(p,{type:'build',siteId:site.id,autoBoundary:true});
  }
 },
 defenseCount(){return this.s.fences.filter(f=>!f.perimeter).length+this.s.traps.length+this.s.sites.filter(p=>p.kind==='gadget'&&!p.perimeter).length;},
 perimeterStatus(){const layout=perimeterLayout(),s=this.s;let missing=0,damaged=0,cost=0,waiting=0;for(const slot of layout){const built=s.fences.find(f=>occupies(f,slot)),planned=s.sites.some(p=>p.kind==='gadget'&&occupies({...p.rect,perimeter:p.perimeter},slot));if(planned){waiting++;continue;}if(!built){if(s.traps.some(t=>overlap(t,slot)))continue;missing++;cost+=GADGETS[slot.kind].cost;}else if(built.hp<built.maxHp&&!built.repairPlanned){damaged++;cost+=FENCE.repairCost;}}return {missing,damaged,cost,waiting,total:layout.length};},
 restorePerimeter(){if(!['playing','paused'].includes(this.s.mode))return false;const info=this.perimeterStatus();if(!info.cost||this.s.scrap<info.cost){this.notice(info.cost?'Need '+info.cost+' scrap to restore the boundary.':'The boundary is intact or repairs are already queued.',true);return false;}this.s.scrap-=info.cost;for(const slot of perimeterLayout()){if(this.s.sites.some(p=>p.kind==='gadget'&&occupies({...p.rect,perimeter:p.perimeter},slot))||this.s.traps.some(t=>overlap(t,slot)))continue;const built=this.s.fences.find(f=>occupies(f,slot));if(built){if(built.hp<built.maxHp)built.repairPlanned=true;continue;}const {kind,perimeter,vertical,...rect}=slot;this.s.sites.push({id:++this.siteId,kind:'gadget',gadget:kind,perimeter,rect,vertical,progress:0,work:GADGETS[kind].work,priority:1});}this.notice('Boundary repairs queued. Assign a builder to close the gaps.',true);return true;},
 scoutWork(p,dt){if(p.task?.leaving&&!p.task.gatePassed){const target=p.task.atGate?GATE_OUTSIDE:GATE_INSIDE;p.status='Leaving through the scouting gate';if(this.walkTo(p,target,82,dt)){if(p.task.atGate)p.task.gatePassed=true;else p.task.atGate=true;}return;}return GameEngine.prototype.scoutWork.call(this,p,dt);},
 updateScoutGate(){const gate=this.s.fences.find(f=>f.perimeter&&f.kind==='gate');if(!gate)return;const traffic=this.s.people.some(p=>(p.expeditionId||p.task?.leaving||p.gateReturn)&&Math.abs(p.x-SCOUT_GATE.x)<28&&Math.abs(p.y-SCOUT_GATE.y)<58);const open=!!gate.manualOpen||traffic;if(open!==gate.open){gate.open=open;this.updateWalls();}},
 zombieEntry(p){if(!inside(p))return p;const b=FARM_BOUNDARY,choices=[{d:p.x-b.left,x:b.left-60,y:p.y},{d:b.right-p.x,x:b.right+60,y:p.y},{d:p.y-b.top,x:p.x,y:b.top-60},{d:b.bottom-p.y,x:p.x,y:b.bottom+60}];return choices.sort((a,b)=>a.d-b.d)[0];}
};
