// Drawing for expedition sites (Update 31). The site's ground, floors and walls are painted once into a
// cached picture; roofs, searchable furniture, people and the dead are drawn live on top. People and zombies
// reuse the farm renderer's pixel art, so a survivor looks the same on the farm and on a site.
import {W,H} from './renderer.js';
import {SITE} from './expedition.js';
import {drawVehicle} from './vehicle-art.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const THEMES={
 farm:{grass:'#5e6b43',grass2:'#56633e',road:'#8c7c52',road2:'#9a8a5c',floor:'#8a7150',floor2:'#7c6446',wall:'#6b4f36',wallTop:'#a07b52',roof:'#6b3a30',roofLine:'#4d2a23'},
 gas:{grass:'#5a6340',grass2:'#535c3c',road:'#4f514a',road2:'#5c5e55',floor:'#9c9a8a',floor2:'#8d8b7c',wall:'#76736a',wallTop:'#a8a496',roof:'#4b5a55',roofLine:'#36423e'},
 medical:{grass:'#5b6743',grass2:'#55603e',road:'#55574f',road2:'#62645a',floor:'#c6c3b2',floor2:'#b8b5a4',wall:'#9c9a8c',wallTop:'#d6d3c2',roof:'#5d6a6e',roofLine:'#434e52'},
 town:{grass:'#566240',grass2:'#4f5a3b',road:'#4b4d47',road2:'#585a52',floor:'#8f7a5e',floor2:'#836e53',wall:'#8a5a44',wallTop:'#b07a5c',roof:'#554a44',roofLine:'#3d3531'},
};
const caches=new WeakMap();
const seeded=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

// What stays still: grass, roads, building floors and walls, vehicles, trees. Painted once per site.
function paintGround(r,site){
 const c=document.createElement('canvas');c.width=site.width;c.height=site.height;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const T=THEMES[site.theme]||THEMES.town,rect=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));},rnd=seeded(site.seed||1);
 rect(0,0,site.width,site.height,T.grass);
 for(let i=0;i<site.width*site.height/900;i++)rect(rnd()*site.width,rnd()*site.height,4+rnd()*14,2+rnd()*5,i%3?T.grass2:'#6c7a4c55');
 for(const road of site.roads){rect(road.x,road.y,road.w,road.h,T.road);for(let i=0;i<road.w*road.h/140;i++)rect(road.x+rnd()*road.w,road.y+rnd()*road.h,2+rnd()*4,1+rnd()*2,T.road2);}
 // Faded lane marks on paved roads.
 if(site.theme!=='farm')for(const road of site.roads){if(road.w>road.h)for(let x=road.x+10;x<road.x+road.w;x+=46)rect(x,road.y+road.h/2-1,22,3,'#c9c2a066');else for(let y=road.y+10;y<road.y+road.h;y+=46)rect(road.x+road.w/2-1,y,3,22,'#c9c2a066');}
 for(const b of site.buildings){
  rect(b.x+6,b.y+8,b.w,b.h,'#1c241c55');rect(b.x,b.y,b.w,b.h,T.floor);
  for(let y=b.y+12;y<b.y+b.h;y+=14)rect(b.x+10,y,b.w-20,1,T.floor2);for(let x=b.x+24;x<b.x+b.w;x+=48)for(let y=b.y+12;y<b.y+b.h;y+=28)rect(x,y,1,14,T.floor2);
  // A rug and a doormat make each room read as lived-in.
  rect(b.x+b.w/2-40,b.y+b.h/2-22,80,44,'#7a514455');rect(b.x+b.w/2-36,b.y+b.h/2-18,72,36,'#c49d6633');
  b.doorAt&&rect(b.doorAt.x-16,b.doorAt.y-6,32,10,'#6b5a3a');
 }
 for(const o of site.obstacles)if(o.kind==='wall'){rect(o.x,o.y,o.w,o.h,T.wall);rect(o.x,o.y,o.w,Math.min(3,o.h),T.wallTop);}
 for(const p of site.props){
  if(p.kind==='tree'){g.save();r.tree(g,p.x+11,p.y+16,.7);g.restore();}
  else if(p.kind==='bale'){rect(p.x,p.y,p.w,p.h,'#b89955');rect(p.x,p.y,p.w,3,'#dcc278');rect(p.x+7,p.y,2,p.h,'#7c683b');}
  else if(p.kind==='barrel'){rect(p.x+2,p.y,p.w-4,p.h,'#5c6350');rect(p.x,p.y+4,p.w,3,'#343e34');rect(p.x,p.y+p.h-7,p.w,3,'#343e34');}
 }
 // The truck that brought the team, and the way home.
 const t=site.truck;drawVehicle(g,{kind:'pickup',x:t.x-46,y:t.y-27,w:92,h:52});
 return c;
}

const CONTAINER={cabinet:['#7d5f3f','#a88458'],shelf:['#6d5a3a','#9c8456'],locker:['#5f6b68','#8c9a96'],desk:['#80603f','#a98251'],crate:['#8b6c40','#b58f58'],hay:['#b89955','#dcc278'],pump:['#a3412f','#d06a4f'],bin:['#4f5a48','#717d68'],cache:['#7a5a2e','#e3c774']};
function drawContainer(r,g,c,t,hover){
 if(['car','tractor','ambulance'].includes(c.kind)){
  drawVehicle(g,c);
 }else{
  const [base,top]=CONTAINER[c.kind]||CONTAINER.crate;
  r.rect(g,c.x+3,c.y+5,c.w,c.h,'#1c241c55');r.rect(g,c.x,c.y,c.w,c.h,base);r.rect(g,c.x,c.y,c.w,4,top);
  if(c.kind==='shelf'||c.kind==='locker')for(let x=c.x+6;x<c.x+c.w-4;x+=c.kind==='locker'?14:10)r.rect(g,x,c.y+6,c.kind==='locker'?10:6,c.h-10,c.searched?'#2c261c':'#00000033');
  else{r.rect(g,c.x+4,c.y+c.h/2,c.w-8,2,'#00000033');r.rect(g,c.x+c.w/2-3,c.y+c.h/2-4,6,4,'#d8c08a');}
  if(c.searched)r.rect(g,c.x+4,c.y+6,c.w-8,c.h-12,'#20201a88');
 }
 // Unsearched furniture glints; a marked cache gets a flag; a hovered one gets an outline.
 if(!c.searched&&Math.sin(t*2+c.id*1.7)>.6){r.rect(g,c.x+c.w-8,c.y-6,2,8,'#f4dfa1');r.rect(g,c.x+c.w-11,c.y-3,8,2,'#f4dfa1');}
 if(c.marked&&!c.searched){r.rect(g,c.x-6,c.y-30,2,30,'#5e4d36');r.poly(g,[[c.x-4,c.y-30],[c.x+10,c.y-26],[c.x-4,c.y-21]],'#d9573f');}
 if(hover){g.strokeStyle='#f0d78a';g.lineWidth=1.5;g.setLineDash([4,3]);g.strokeRect(c.x-3.5,c.y-3.5,c.w+7,c.h+7);g.setLineDash([]);}
 if(c.progress>0&&!c.searched)r.progressBar(g,c.x+c.w/2,c.y-16,c.progress,'SEARCHING',54);
}
function drawRoof(r,g,b,T){
 const x=b.x-6,y=b.y-6,w=b.w+12,h=b.h+12;
 r.rect(g,x+8,y+10,w,h,'#10180f66');r.rect(g,x,y,w,h,T.roof);
 for(let yy=y+6;yy<y+h;yy+=10){r.rect(g,x,yy,w,2,T.roofLine);for(let xx=x+((yy/10|0)%2)*12;xx<x+w;xx+=24)r.rect(g,xx,yy,2,10,'#00000022');}
 r.rect(g,x,y+h/2-3,w,6,'#ffffff18');r.rect(g,x,y,w,3,'#ffffff22');
 g.font='bold 9px monospace';const label=b.name.toUpperCase(),tw=Math.ceil(g.measureText(label).width)+12;r.rect(g,b.x+b.w/2-tw/2,b.y+b.h/2-10,tw,15,'#a48b56');g.fillStyle='#3b3424';g.textAlign='center';g.fillText(label,b.x+b.w/2,b.y+b.h/2+1);g.textAlign='left';
}

export function siteView(run,camera){
 const k=camera.zoom,w=W/k,h=H/k,{width,height}=run.site;
 camera.cx=width<w?width/2:clamp(camera.cx,w/2,width-w/2);camera.cy=height<h?height/2:clamp(camera.cy,h/2,height-h/2);
 return {x:Math.round(camera.cx-w/2),y:Math.round(camera.cy-h/2),scale:k};
}

export function drawSite(r,run,t,opts={}){
 const g=r.ctx,site=run.site,T=THEMES[site.theme]||THEMES.town,view=opts.view,k=view.scale,selected=opts.selected||new Set(),hover=opts.hover||{};
 let cache=caches.get(site);if(!cache){cache=paintGround(r,site);caches.set(site,cache);}
 r.view=view;r.setTransform(g,1,0,0,1,0,0);g.fillStyle='#26301f';g.fillRect(0,0,W,H);
 g.imageSmoothingEnabled=k<1;g.drawImage(cache,view.x,view.y,W/k,H/k,0,0,W,H);g.imageSmoothingEnabled=false;
 r.setTransform(g,k,0,0,k,-view.x*k,-view.y*k);
 // The way home is marked once the team heads back, and faintly before.
 const e=site.exit;g.strokeStyle=run.leaving?'#f0d78acc':'#f0d78a44';g.lineWidth=2;g.setLineDash([6,5]);g.strokeRect(e.x+.5,e.y+.5,e.w,e.h);g.setLineDash([]);
 g.font='bold 9px monospace';g.fillStyle=run.leaving?'#f0d78a':'#f0d78a99';g.textAlign='center';g.fillText(run.leaving?'EVERYONE TO THE TRUCK':'THE TRUCK · HEAD HOME',e.x+e.w/2,e.y-6);g.textAlign='left';
 for(const c of site.containers)if(!run.hidden(c))drawContainer(r,g,c,t,hover.container===c);
 // Where the selected people are headed.
 for(const u of run.alive){
  if(!selected.has(u.id)||!u.order)continue;
  let from=u;
  [u.order,...u.orders].forEach((o,i)=>{
   const z=o.type==='attack'&&run.zombies.find(z=>z.id===o.zombieId),c=['search','sweep'].includes(o.type)&&site.containers.find(c=>c.id===o.containerId),b=o.type==='sweep'&&run.building(o.buildingId);
   const to=z||(c?{x:c.x+c.w/2,y:c.y+c.h/2}:b?{x:b.x+b.w/2,y:b.y+b.h/2}:o);if(!Number.isFinite(to?.x)||!Number.isFinite(to?.y))return;
   const color=z?'#e0614acc':o.role==='guard'?'#8fc3f0bb':'#ffd772bb';g.strokeStyle=color;g.lineWidth=1.5/k;g.setLineDash([4,4]);g.beginPath();g.moveTo(from.x,from.y);g.lineTo(to.x,to.y);g.stroke();g.setLineDash([]);
   r.rect(g,to.x-7/k,to.y-8/k,14/k,14/k,'#19291ee6');g.font='bold '+(10/k)+'px monospace';g.fillStyle=color;g.textAlign='center';g.fillText(String(i+1),to.x,to.y+3/k);g.textAlign='left';from=to;
  });
 }

 const items=[];
 for(const z of run.zombies){if(z.hp<=0||run.zombieHidden(z))continue;items.push({y:z.y,draw:()=>{r.actor(g,z,false,t);if(hover.zombie===z){g.strokeStyle='#e0614a';g.lineWidth=2;g.beginPath();g.ellipse(z.x,z.y+6,16,7,0,0,Math.PI*2);g.stroke();}}});}
 for(const u of run.alive)items.push({y:u.y,draw:()=>r.person(g,{...u.p,x:u.x,y:u.y,angle:u.angle,moving:u.moving,walk:u.walk,hurt:u.hurt,hammering:u.hammering,flash:u.flash,swing:u.swing,bubble:'',panic:false},t,{selected:selected.has(u.id),hover:hover.unit===u})});
 items.sort((a,b)=>a.y-b.y);for(const item of items)item.draw();
 for(const b of site.buildings)if(!b.checked)drawRoof(r,g,b,T);
 for(const s of run.shots){g.strokeStyle=s.acid?`rgba(182,216,124,${Math.min(1,s.life/.25)})`:`rgba(255,227,160,${Math.min(1,s.life/.1)})`;g.lineWidth=2;g.beginPath();g.moveTo(s.x1,s.y1);g.lineTo(s.x2,s.y2);g.stroke();}
 for(const p of run.particles){g.globalAlpha=clamp(p.life/(p.maxLife||.5),0,1);r.rect(g,p.x,p.y,p.size,p.size,p.color);}g.globalAlpha=1;
 for(const f of run.floaters){g.globalAlpha=clamp(f.life,0,1);g.font='bold 12px monospace';g.textAlign='center';g.fillStyle='#253229';g.fillText(f.text,f.x+1,f.y+1);g.fillStyle=f.color;g.fillText(f.text,f.x,f.y);}g.globalAlpha=1;g.textAlign='left';
 if(hover.building&&!hover.building.checked){const b=hover.building;g.strokeStyle='#f0d78a';g.lineWidth=2/k;g.setLineDash([5,4]);g.strokeRect(b.x-8.5,b.y-8.5,b.w+17,b.h+17);g.setLineDash([]);}
 // The afternoon wears on: the light warms and dims toward sunset.
 r.setTransform(g,1,0,0,1,0,0);
 const late=clamp((run.time-SITE.length*.55)/(SITE.length*.45),0,1);if(late>0){g.fillStyle=`rgba(255,140,60,${.14*late})`;g.fillRect(0,0,W,H);g.fillStyle=`rgba(16,26,54,${.18*late})`;g.fillRect(0,0,W,H);}
 const vignette=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.62);vignette.addColorStop(0,'#14251c00');vignette.addColorStop(1,'#16271d66');g.fillStyle=vignette;g.fillRect(0,0,W,H);
 // Arrows at the edge for the dead hunting the team out of view.
 let shown=0;for(const z of run.zombies){if(z.state!=='hunt'||z.hp<=0)continue;const sx=(z.x-view.x)*k,sy=(z.y-10-view.y)*k;if(sx>-8&&sx<W+8&&sy>-8&&sy<H+8)continue;const a=Math.atan2(sy-H/2,sx-W/2);g.save();g.translate(clamp(sx,20,W-20),clamp(sy,20,H-20));g.rotate(a);g.fillStyle=z.kind==='brute'?'#ff8a64':'#e0614a';g.beginPath();g.moveTo(10,0);g.lineTo(-6,-7);g.lineTo(-2,0);g.lineTo(-6,7);g.closePath();g.fill();g.restore();if(++shown>=14)break;}
 minimap(r,g,run,view,selected,cache);
 const box=opts.box;if(box){const x=Math.min(box.x0,box.x1),y=Math.min(box.y0,box.y1),w=Math.abs(box.x1-box.x0),h=Math.abs(box.y1-box.y0);g.fillStyle='#ffd77222';g.fillRect(x,y,w,h);g.strokeStyle='#ffd772';g.lineWidth=1;g.setLineDash([4,3]);g.strokeRect(x+.5,y+.5,w,h);g.setLineDash([]);}
}

function minimap(r,g,run,view,selected,cache){
 const site=run.site,mw=200,k=mw/site.width,mh=Math.round(site.height*k),mx=14,my=H-mh-14,X=x=>mx+x*k,Y=y=>my+y*k,dot=(x,y,c,s=3)=>{g.fillStyle=c;g.fillRect(Math.round(X(x)-s/2),Math.round(Y(y)-s/2),s,s);};
 r.miniRect={x:mx,y:my,w:mw,h:mh,k,left:0,top:0};
 g.fillStyle='#10160fd0';g.fillRect(mx-3,my-3,mw+6,mh+6);g.imageSmoothingEnabled=true;g.drawImage(cache,mx,my,mw,mh);g.imageSmoothingEnabled=false;g.fillStyle='#0c120c44';g.fillRect(mx,my,mw,mh);
 for(const b of run.site.buildings){g.fillStyle=b.checked?'#c9b07a88':'#6b3a30';g.fillRect(X(b.x),Y(b.y),b.w*k,b.h*k);}
 for(const c of run.site.containers)if(!c.searched&&!run.hidden(c))dot(c.x+c.w/2,c.y+c.h/2,c.marked?'#e3c774':'#d8c08a',2);
 for(const z of run.zombies)if(z.hp>0&&!run.zombieHidden(z))dot(z.x,z.y,'#e0614a',z.kind==='brute'?3:2);
 for(const u of run.alive)dot(u.x,u.y,selected.has(u.id)?'#ffd772':'#8fc3f0',selected.has(u.id)?4:3);
 dot(site.truck.x,site.truck.y,'#f8d878',4);
 g.strokeStyle='#ffffff80';g.lineWidth=1;g.strokeRect(Math.round(X(view.x))+.5,Math.round(Y(view.y))+.5,Math.round(W/view.scale*k),Math.round(H/view.scale*k));g.strokeStyle='#5d6a48';g.strokeRect(mx-2.5,my-2.5,mw+5,mh+5);
}
