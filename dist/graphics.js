import {ColonyRenderer} from './colony-renderer.js';
import {W,H,LOOKS,atBreakfast} from './renderer.js';
import {BUILDINGS,FARMHOUSE,LAMPS,WORLD} from './engine.js';

const PREF='last-harvest-graphics';
const seedRandom=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const night=s=>s.phase==='night'&&s.mode!=='house';

// All decoration lives in the renderer. World positions, collisions and saved farms remain logical pixels.
export class EnhancedRenderer extends ColonyRenderer{
 constructor(canvas){super(canvas);try{this.quality=localStorage.getItem(PREF)==='balanced'?'balanced':'high';}catch{this.quality='high';}this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.motionQuery=matchMedia('(prefers-reduced-motion: reduce)');this.motionQuery.addEventListener('change',e=>this.reducedMotion=e.matches);this.resize();}
 rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h);}
 setQuality(quality){this.quality=quality==='balanced'?'balanced':'high';try{localStorage.setItem(PREF,this.quality);}catch{}this.resize();}

 tree(g,x,y,size=1){g.save();g.translate(x,y);g.scale(size,size);
  this.poly(g,[[-22,11],[17,8],[45,25],[17,32],[-11,22]],'#182e232e');
  this.rect(g,-5,-7,11,28,'#4c4030');this.rect(g,-2,-5,3,25,'#a88b54');this.rect(g,4,2,2,17,'#302e25');
  const layers=[{y:1,w:31,h:25},{y:-18,w:26,h:25},{y:-35,w:20,h:25},{y:-50,w:12,h:20}];
  for(const {y:yy,w,h} of layers){this.poly(g,[[-w,yy],[-w+6,yy-8],[-w+4,yy-9],[-w/2,yy-h+7],[-w/2-2,yy-h+5],[0,yy-h],[w/2,yy-h+10],[w/2-2,yy-h+11],[w-5,yy-9],[w-7,yy-7],[w,yy],[w-10,yy+4],[4,yy+1],[-4,yy+5],[-w+9,yy+3]],'#263e31');
   this.poly(g,[[-w+5,yy-3],[-w/2+1,yy-h+9],[0,yy-h+2],[-2,yy-7],[-11,yy-3]],'#476743');
   this.poly(g,[[0,yy-h+3],[w/2,yy-h+11],[w-5,yy-2],[8,yy+1],[1,yy-4]],'#36563a');
   for(let j=0;j<4;j++){const px=-w+9+j*w/3,py=yy-5-(j%2)*5;this.rect(g,px,py,5,2,j%2?'#648051':'#54784b');}
   this.rect(g,-w+10,yy-3,7,1,'#8b9c6066');this.rect(g,w-10,yy,6,2,'#1b3228');
  }
  this.rect(g,-3,19,9,2,'#3c422d');g.restore();
 }

 building(g,x,y,w,h,color,roof){super.building(g,x,y,w,h,color,roof);g.save();
  // Fine roof tiles are clipped to the existing silhouette, so lots keep their exact footprint.
  g.beginPath();g.moveTo(x-12,y+12);g.lineTo(x+w/2,y-37);g.lineTo(x+w+12,y+12);g.closePath();g.clip();
  this.poly(g,[[x-12,y+12],[x+w/2,y-37],[x+w/2,y+12]],'#ffffff0d');
  this.poly(g,[[x+w/2,y-37],[x+w+12,y+12],[x+w/2,y+12]],'#11251d22');
  for(let row=0;row<8;row++){const yy=y-34+row*6;this.rect(g,x-12,yy,w+24,1,'#111c1b30');for(let xx=x-12+(row%2)*8;xx<x+w+12;xx+=16)this.rect(g,xx,yy,1,6,'#101e1828');}
  g.restore();this.rect(g,x-11,y+12,w+22,1,'#e7c38b88');this.rect(g,x-10,y+28,w+20,3,'#222b2470');
  for(let yy=y+38;yy<y+h-8;yy+=8){this.rect(g,x+5,yy,w-10,1,'#201c1929');this.rect(g,x+6,yy+1,w-12,1,'#fff5cb12');}
  for(const xx of [x+1,x+w-2]){this.rect(g,xx,y+34,1,Math.max(1,h-42),'#f6d99a55');for(let yy=y+41;yy<y+h-9;yy+=18)this.rect(g,xx,yy,2,2,'#303327');}
  this.rect(g,x-2,y+h-5,w+4,4,'#55574a');for(let xx=x+3;xx<x+w;xx+=12)this.rect(g,xx,y+h-5,1,4,'#292e28');
 }

 house(g){super.house(g);const {x,y,w,h}=FARMHOUSE;g.save();g.beginPath();g.moveTo(x-14,y+22);g.lineTo(x+w/2,y-58);g.lineTo(x+w+14,y+22);g.closePath();g.clip();
  this.poly(g,[[x-14,y+22],[x+w/2,y-58],[x+w/2,y+22]],'#acb79a1c');
  for(let row=0;row<13;row++){const yy=y-56+row*6;this.rect(g,x-14,yy,w+28,1,'#17271f50');for(let xx=x-14+(row%2)*9;xx<x+w+14;xx+=18)this.rect(g,xx,yy,1,6,'#26332845');}g.restore();
  // The dormer remains in front of the new tile detail.
  this.poly(g,[[x+w/2-20,y-18],[x+w/2,y-36],[x+w/2+20,y-18]],'#4b5e4d');this.rect(g,x+w/2-14,y-18,28,20,'#443c31');this.rect(g,x+w/2-10,y-15,20,14,'#e5c480');this.rect(g,x+w/2,y-15,2,14,'#786345');
  for(const wx of [x+18,x+58,x+w-80,x+w-40])for(const wy of [y+48,y+100]){this.rect(g,wx-4,wy-1,3,27,'#5e7455');this.rect(g,wx+23,wy-1,3,27,'#52644a');this.rect(g,wx+4,wy+4,5,7,'#f6df9c');this.rect(g,wx+4,wy+14,1,5,'#fceac199');this.rect(g,wx-4,wy+26,30,2,'#d7bc83');}
  for(let xx=x+14;xx<x+w-12;xx+=9)this.rect(g,xx,y+h+1,1,6,'#604f3c77');
  for(const xx of [x+11,x+w-23]){this.rect(g,xx,y+h-9,13,9,'#73533d');this.rect(g,xx-2,y+h-11,17,3,'#b58c5e');for(let j=0;j<4;j++){this.rect(g,xx+j*3,y+h-17-(j%2)*3,3,7,'#506c3e');this.rect(g,xx+j*3,y+h-18-(j%2)*3,3,2,j%2?'#c7ab70':'#c78868');}}
 }

 forest(g,random){
  // Cached tufts, small stones and leaf litter give the clearing texture at close zoom.
  g.save();const r=seedRandom(1937),lots=[...Object.values(BUILDINGS),FARMHOUSE,{x:85,y:385,w:160,h:108},{x:306,y:217,w:334,h:226}];
  for(let i=0;i<2700;i++){const x=WORLD.left+r()*WORLD.width,y=WORLD.top+r()*WORLD.height;
   if(lots.some(b=>x>b.x-10&&x<b.x+b.w+12&&y>b.y-50&&y<b.y+b.h+20))continue;
   if(x>430&&x<570&&y>430)continue;
   const c=i%4===0?'#b1ac6b77':i%3===0?'#243f2e77':'#7e99545c';this.rect(g,x,y,1,3,c);this.rect(g,x-2,y+1,1,2,c);this.rect(g,x+2,y-1,1,4,c);
   if(i%9===0){this.rect(g,x+4,y+3,3,1,'#c3b47b66');this.rect(g,x+4,y+4,3,1,'#263b2866');}
  }g.restore();super.forest(g,random);
 }

 bed(g,x,y,wet){super.bed(g,x,y,wet);this.rect(g,x-24,y-16,48,1,'#c2975855');this.rect(g,x-24,y+23,48,2,'#2b352733');for(let row=0;row<4;row++){const yy=y-9+row*8;this.rect(g,x-20,yy,40,1,wet?'#293b3399':'#352c2599');this.rect(g,x-19,yy+2,37,1,'#ad815733');for(let j=0;j<3;j++)this.rect(g,x-17+j*13+(row%2)*3,yy+3,2,1,'#c49c5b55');}}
 crop(g,p,t,type){if(p.growth<0)return super.crop(g,p,t,type);g.save();g.translate(p.x,p.y);const sway=this.reducedMotion?0:Math.sin(this.visualTime*1.6+p.x*.07)*.035;g.transform(1,0,sway,1,0,0);super.crop(g,{...p,x:0,y:0},t,type);g.restore();}

 person(g,a,t,opts={}){super.person(g,a,t,opts);const look=LOOKS[a.look%LOOKS.length],x=Math.round(a.x+(a.panic?Math.sin(t*40+a.id):0)),y=Math.round(a.y);g.save();g.translate(x,y);if(a.hurt>0&&Math.floor(t*20)%2===0)g.globalAlpha=.5;
  this.rect(g,-5,-25,2,8,'#fff0bc55');this.rect(g,4,-23,2,9,'#51352a44');this.rect(g,-2,-15,5,1,'#553b2f55');this.rect(g,-7,-13,2,12,'#f4e4ba25');this.rect(g,5,-12,2,12,'#202e2c55');this.rect(g,-6,-3,12,2,'#35382f');this.rect(g,0,-3,2,2,'#c7af71');
  if(a.job==='farmer'){this.rect(g,-9,-28,19,1,'#fff1b0');this.rect(g,-4,-31,7,1,'#f5dc91');this.rect(g,-3,-12,2,8,'#d8c19066');}
  if(a.job==='builder'){this.rect(g,-5,-31,9,1,'#ffe5a2');this.rect(g,0,-30,2,4,'#f8d668');this.rect(g,-6,-10,3,4,'#d9af5c');}
  if(a.job==='defender'){this.rect(g,-6,-31,10,1,'#a3b580');this.rect(g,-6,-11,4,4,'#718160');this.rect(g,1,-11,4,4,'#718160');}
  if(a.job==='medic'){this.rect(g,-7,-29,14,3,'#e0e4d5');this.rect(g,-1,-30,2,5,'#b9614a');this.rect(g,-2,-29,4,2,'#b9614a');this.rect(g,-6,-9,4,5,'#ece9cc');this.rect(g,-5,-8,2,3,'#b9614a');}
  if(a.job==='scout'){this.rect(g,-11,-13,3,2,'#ae9c6d');this.rect(g,-11,-8,3,2,'#463e2c');this.rect(g,-4,-30,7,1,'#9caa76');}
  this.rect(g,-5,-26,8,1,look.hair);g.restore();
  if(a.tool==='gun'){g.save();g.translate(x,y-9);g.rotate(a.angle||0);this.rect(g,13,-2,10,1,'#d1d5bf');this.rect(g,2,0,8,2,'#967342');this.rect(g,11,-3,2,2,'#79867e');g.restore();}
 }

 actor(g,a,farmer,t,tool){super.actor(g,a,farmer,t,tool);if(farmer)return;g.save();g.translate(Math.round(a.x),Math.round(a.y));if(a.boss)g.scale(1.5,1.5);if(a.hurt>0&&Math.floor(t*20)%2===0)g.globalAlpha=.5;
  if(a.kind==='crawler'){this.rect(g,10,-8,2,2,'#ead389');this.rect(g,-11,-1,5,1,'#899978');this.rect(g,-9,5,5,2,'#8b9b70');}
  else{this.rect(g,-6,-28,2,8,'#c2c59b77');this.rect(g,4,-25,2,10,'#394c3966');this.rect(g,-6,-10,4,1,'#a3ad7b');this.rect(g,-5,-8,5,1,'#a3ad7b');this.rect(g,-3,-6,2,4,'#354735');this.rect(g,2,-23,2,2,a.kind==='spitter'?'#d9ef8a':'#e1b875');this.rect(g,-4,-23,1,2,'#d8c97f');this.rect(g,8,-11,2,9,'#bac18a55');}
  g.restore();
 }

 fencePiece(g,f,alpha=1,tint=''){super.fencePiece(g,f,alpha,tint);if(tint)return;g.save();g.globalAlpha=alpha;const {x,y,w,h}=f;if(f.vertical){const xx=x+w/2;for(const yy of [y,y+h/2-2,y+h-4]){this.rect(g,xx-1,yy-12,3,1,'#ead39a');this.rect(g,xx,yy-5,1,2,'#423e30');}}else{for(const xx of [x,x+w/2-2,x+w-4]){this.rect(g,xx,y+h/2-14,5,1,'#ead39a');this.rect(g,xx+1,y+h/2-8,1,1,'#3e3b31');}this.rect(g,x,y+h/2-9,w,1,'#c8ad79');}g.restore();}

 drawGroundEffects(g,s,t){
  // Water is clipped to the pond; ripples never spill onto roads or crop beds.
  g.save();g.beginPath();g.moveTo(121,412);g.lineTo(178,405);g.lineTo(210,420);g.lineTo(219,442);g.lineTo(205,460);g.lineTo(159,468);g.lineTo(116,452);g.closePath();g.clip();
  const water=g.createLinearGradient(110,405,220,475);water.addColorStop(0,'#acd6b31c');water.addColorStop(.5,'#387d8833');water.addColorStop(1,'#102b3b44');g.fillStyle=water;g.fillRect(100,400,140,85);
  for(let i=0;i<12;i++){const x=120+(i*37)%93+Math.sin(t*.55+i)*4,y=418+(i*19)%43;this.rect(g,x,y,5+Math.sin(t+i)*3,1,night(s)?'#95bca936':'#cae4c76b');}
  for(let i=0;i<3;i++){const phase=(t*.18+i/3)%1;g.globalAlpha=(1-phase)*.35;g.strokeStyle='#c4e4c5';g.lineWidth=.7;g.beginPath();g.ellipse(145+i*21,440+i*4,3+phase*16,1+phase*5,0,0,Math.PI*2);g.stroke();}g.restore();
 }

 drawShadows(g,s){if(night(s))return;g.save();const dusk=Math.max(0,1-(s.phaseDuration-s.phaseTime)/35),length=16+dusk*24;g.fillStyle='#182c2630';
  for(const p of s.people)if(!p.inside&&!p.away){g.beginPath();g.ellipse(p.x+length*.35,p.y+7,length*.7,4,-.15,0,Math.PI*2);g.fill();}
  for(const id of Object.keys(BUILDINGS)){if(!s.buildings[id]||['pasture','field','barn'].includes(id))continue;const b=BUILDINGS[id];this.poly(g,[[b.x+b.w,b.y+12],[b.x+b.w+length,b.y+30],[b.x+b.w+length,b.y+b.h+12],[b.x+b.w,b.y+b.h]],'#14271e23');}
  g.restore();
 }

 glow(g,x,y,r,color,alpha=.25){const gradient=g.createRadialGradient(x,y,1,x,y,r);gradient.addColorStop(0,`rgba(${color},${alpha})`);gradient.addColorStop(.35,`rgba(${color},${alpha*.45})`);gradient.addColorStop(1,`rgba(${color},0)`);g.fillStyle=gradient;g.fillRect(x-r,y-r,r*2,r*2);}
 drawLighting(g,s,t){g.save();if(night(s)){
   const v=this.view;g.fillStyle='#0d23452b';g.fillRect(v.x,v.y,W/v.scale,H/v.scale);g.globalCompositeOperation='screen';
   const pulse=this.reducedMotion?1:1+Math.sin(t*5.1)*.025;this.glow(g,653,463,105*pulse,'255,157,63',.32);
   if(s.lit&&s.buildings.generator){const lamps=LAMPS.slice(0,BUILDINGS.generator.levels[s.buildings.generator-1].lamps);for(const [x,y] of lamps)this.glow(g,x+7,y-22,88,'255,207,126',this.quality==='balanced'?.16:.25);}
   const {x,y,w}=FARMHOUSE,windows=this.houseLights?this.houseLights(s):[x+29,x+69,x+w-69,x+w-29].map(wx=>[wx,y+112,28]);for(const [wx,wy,r] of windows)this.glow(g,wx,wy,r,'255,196,97',.28);
   for(const p of s.people)if(p.flash>0&&!p.inside&&!p.away)this.glow(g,p.x,p.y-10,65,'255,219,140',.45);
   g.globalCompositeOperation='source-over';
  }else{
   this.setTransform(g,1,0,0,1,0,0);const sky=g.createLinearGradient(0,0,W,H);sky.addColorStop(0,'#ffe0a00b');sky.addColorStop(1,'#112e3210');g.fillStyle=sky;g.fillRect(0,0,W,H);
  }g.restore();
 }

 drawAtmosphere(g,s,t){if(this.quality==='balanced'||this.reducedMotion||this.ambient===false)return;g.save();const v=this.view,k=v.scale;this.setTransform(g,k,0,0,k,-v.x*k,-v.y*k);
  if(!night(s)&&s.weather!=='rain'&&s.weather!=='fog'){for(let i=0;i<22;i++){const x=v.x+(i*137+t*4)% (W/k),y=v.y+(i*83+t*2)% (H/k),a=.12+.08*Math.sin(t+i);this.rect(g,x,y,1,1,`rgba(251,226,171,${a})`);}}
  if(night(s)&&s.weather!=='rain'){for(let i=0;i<10;i++){const x=140+i*49+Math.sin(t*.35+i)*14,y=420+Math.sin(t*.4+i*2)*45,a=Math.max(0,Math.sin(t*1.1+i*1.8))*.45;this.rect(g,x,y,2,1,`rgba(221,230,133,${a})`);}}
  if(s.buildings.generator&&s.generatorOn&&s.gas>0&&night(s)){for(let i=0;i<3;i++){const phase=(t*.3+i/3)%1;g.fillStyle=`rgba(165,177,170,${(1-phase)*.12})`;g.beginPath();g.ellipse(735+Math.sin(t*.7+i)*5,305-phase*35,3+phase*5,2+phase*4,0,0,Math.PI*2);g.fill();}}
  g.restore();
 }

 render(s,t,opts={}){if(!this.reducedMotion&&s.mode!=='paused'&&!s.phaseReady)this.visualTime=t;this.visualTime??=0;super.render(s,this.visualTime,opts);if((s.mode!=='title'||s.menuScene)&&!atBreakfast(s))this.drawAtmosphere(this.ctx,s,this.visualTime);}
}

export function installGraphicsControls(renderer){const host=document.querySelector('#settings-graphics')||document.querySelector('#help-dialog .help-modal');if(!host)return;const panel=document.createElement('section');panel.className='graphics-settings';panel.innerHTML='<label for="graphics-quality">QUALITY</label><select id="graphics-quality"><option value="high">High · display resolution, up to 4K</option><option value="balanced">Balanced · 720p, fewer effects</option></select><p id="graphics-resolution"></p>';host.append(panel);const select=panel.querySelector('select'),readout=panel.querySelector('p');select.value=renderer.quality;const refresh=()=>readout.textContent=`Rendering ${renderer.canvas.width} × ${renderer.canvas.height}. Pixel art stays sharp; your display determines the output size.`;select.addEventListener('change',()=>{renderer.setQuality(select.value);refresh();});new ResizeObserver(refresh).observe(renderer.canvas);refresh();}
