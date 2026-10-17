import {GameEngine,GADGETS,FENCE} from './engine.js';

const same=(a,b)=>['x','y','w','h'].every(k=>Math.abs(a[k]-b[k])<.01);
export const defensePlanningMethods={
 // Snap to the ends of both completed defenses and paid blueprints.
 gadgetRect(kind,x,y,vertical){
  const rect=GameEngine.prototype.gadgetRect.call(this,kind,x,y,vertical);
  if(!GADGETS[kind].rotates)return rect;
  const pieces=[...this.s.fences,...this.s.traps,...this.s.sites.filter(s=>s.kind==='gadget').map(s=>({...s.rect,kind:s.gadget,vertical:s.vertical}))];
  let best=null,distance=FENCE.grid+2;
  for(const p of pieces){
   if(!GADGETS[p.kind]?.rotates||!!p.vertical!==!!vertical)continue;
   const cx=p.x+p.w/2,cy=p.y+p.h/2;
   for(const sign of [-1,1]){
    const at=vertical?{x:cx,y:cy+sign*(p.h+rect.h)/2}:{x:cx+sign*(p.w+rect.w)/2,y:cy};
    const d=Math.hypot(at.x-x,at.y-y);
    if(d<distance){best=at;distance=d;}
   }
  }
  return best?{...rect,x:best.x-rect.w/2,y:best.y-rect.h/2}:rect;
 },
 defenseLine(kind,from,to){
  const spec=GADGETS[kind];if(!spec)return {kind,points:[],cost:0,valid:false};
  const vertical=spec.rotates&&Math.abs(to.y-from.y)>Math.abs(to.x-from.x),axis=Math.abs(to.y-from.y)>Math.abs(to.x-from.x)?'y':'x';
  const first=this.gadgetRect(kind,from.x,from.y,vertical),origin={x:first.x+first.w/2,y:first.y+first.h/2};
  const length=Math.abs(to[axis]-origin[axis]),sign=to[axis]>=origin[axis]?1:-1;
  const step=Math.ceil((axis==='x'?first.w:first.h)/FENCE.grid)*FENCE.grid;
  const count=Math.round(length/step)+1,points=[];
  for(let i=0;i<Math.min(count,FENCE.max+1);i++){
   const at={...origin,[axis]:origin[axis]+i*sign*step};
   // Keep every piece on the same line rather than snapping each one to a different neighbor.
   const rect={x:at.x-first.w/2,y:at.y-first.h/2,w:first.w,h:first.h};
   const built=[...this.s.fences,...this.s.traps].find(p=>p.kind===kind&&same(p,rect));
   const planned=this.s.sites.some(p=>p.gadget===kind&&same(p.rect,rect));
   const ghost=this.gadgetGhost(kind,at.x,at.y,vertical);
   const skip=planned||!!built&&(built.hp===built.maxHp||built.repairPlanned);
   points.push({...ghost,rect,x:at.x,y:at.y,vertical,skip,valid:skip||ghost.valid&&same(ghost.rect,rect),cost:skip?0:ghost.cost});
  }
  return {kind,points,cost:points.reduce((n,p)=>n+p.cost,0),valid:count<=FENCE.max&&points.some(p=>!p.skip)&&points.every(p=>p.valid)};
 },
 placeDefenseLine(kind,from,to){
  if(!['playing','paused'].includes(this.s.mode))return false;
  const line=this.defenseLine(kind,from,to),pieces=line.points.filter(p=>!p.skip);
  if(!line.valid){this.notice('This line is blocked or already planned. Adjust the preview.');return false;}
  if(this.s.scrap<line.cost){this.notice(`This line needs ${line.cost} scrap; you have ${this.s.scrap}.`);return false;}
  if(this.defenseCount()+pieces.filter(p=>!p.repair).length>FENCE.max){this.notice('Too many defenses in this line.');return false;}
  for(const p of pieces)this.placeGadget(kind,p.x,p.y,p.vertical);
  this.notice(`${pieces.length} ${GADGETS[kind].name.toLowerCase()} sections planned · ${line.cost} scrap. Drag another line, or press Esc to finish.`);
  return true;
 },
 fenceLine(from,to){return this.defenseLine('fence',from,to);},
 placeFenceLine(from,to){return this.placeDefenseLine('fence',from,to);},
};
