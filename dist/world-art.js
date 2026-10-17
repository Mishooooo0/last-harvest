import {EnhancedRenderer} from './graphics.js';
import {LOOKS} from './renderer.js';
import {BUILDINGS,FARMHOUSE} from './engine.js';
import {FARM_BOUNDARY} from './perimeter.js';
import {houseMaxHealth} from './house-systems.js';
import {drawFarmhouseInterior} from './interior-art.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const seedAt=(x,y)=>Math.abs(Math.round(x*73+y*139))>>>0;

// Scene art is drawn from world geometry, so every moving subject and upgrade remains live.
export class SceneRenderer extends EnhancedRenderer {
 renderHouse(s,t){drawFarmhouseInterior(this,s,t);}
 paintWorld(g){
  super.paintWorld(g);
  // Recolor only the original flat grass swatches; buildings, roads, water and crops retain their materials.
  const palette=new Map([[0x596344,[98,116,73]],[0x606a46,[105,123,77]],[0x52603f,[82,105,64]],[0x626b46,[107,124,76]],[0x555f41,[90,108,67]]]);
  const frame=g.getImageData(0,0,g.canvas.width,g.canvas.height),pixels=frame.data;
  for(let i=0;i<pixels.length;i+=4){const color=palette.get((pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2]);if(color){pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];}}
  g.putImageData(frame,0,0);
 }
 building(g,x,y,w,h,color,roof,shadow=true){
  const barn=x===125&&y===110;
  if(shadow)this.poly(g,[[x+4,y+h-8],[x+w,y+h-8],[x+w+30,y+h+14],[x+25,y+h+14]],'#263f2e45');
  this.rect(g,x,y,w,h,barn?'#a85843':color);this.rect(g,x+w-12,y,12,h,'#25302335');
  for(let yy=y+32;yy<y+h-8;yy+=8){this.rect(g,x+5,yy,w-10,1,'#2b281f35');this.rect(g,x+6,yy+1,w-18,1,'#f6d9a22a');}
  for(let xx=x+14;xx<x+w-10;xx+=24){this.rect(g,xx,y+32,1,Math.max(0,h-40),'#3c362625');for(let yy=y+39;yy<y+h-10;yy+=24)this.rect(g,xx+1,yy,1,1,'#382f26');}
  this.rect(g,x-3,y+h-7,w+6,8,'#66634d');this.rect(g,x-3,y+h-7,w+6,2,'#a5a17d');
  for(let xx=x+3;xx<x+w;xx+=13)this.rect(g,xx,y+h-5,1,6,'#414b3a');
  const top=y-39,cx=x+w/2,rx=x-11,rw=w+22;
  this.poly(g,[[rx-2,y+13],[cx,top-2],[rx+rw+2,y+13],[rx+rw+2,y+31],[rx-2,y+31]],'#303d32');
  this.poly(g,[[rx,y+12],[cx,top],[rx+rw,y+12]],barn?'#6b3a30':roof);
  g.save();g.beginPath();g.moveTo(rx,y+12);g.lineTo(cx,top);g.lineTo(rx+rw,y+12);g.closePath();g.clip();
  this.poly(g,[[rx,top],[cx,top],[cx,y+16],[rx,y+16]],'#a2b68e24');
  this.poly(g,[[cx,top],[rx+rw,top],[rx+rw,y+16],[cx,y+16]],'#122b2635');
  for(let yy=top+5,row=0;yy<y+15;yy+=6,row++){
   this.rect(g,rx,yy,rw,1,'#142a274d');this.rect(g,rx,yy+1,rw,1,'#c0c7a515');
   for(let xx=rx+(row%2)*9;xx<rx+rw;xx+=18)this.rect(g,xx,yy,1,6,'#192c293b');
  }g.restore();
  this.rect(g,rx,y+12,rw,4,barn?'#bd7751':'#bd9463');this.rect(g,rx+1,y+13,rw-2,1,'#efd099');
  this.rect(g,rx+2,y+17,rw-4,8,'#2a352a');this.rect(g,x-4,y+29,5,Math.max(2,h-30),'#d2b98b');this.rect(g,x+w-1,y+29,5,Math.max(2,h-30),'#ad986f');
 }

 // The farmhouse from outside (Update 32) matches the rooms inside: four bedrooms upstairs with their own
 // curtains and a landing window over the stairs; downstairs the kitchen with its stove flue on the left, the
 // front door under a small porch, and the common room's wide window with the stone fireplace chimney on the right.
 // It is drawn once into the background (no state) and live each frame on top, with its lights, smoke, the
 // door and shutter upgrades, and damage. The footprint never changes.
 house(g,live=false,s=null,t=0){
  const {x,y,w,h}=FARMHOUSE,cx=x+w/2,R=(a,b,c,d,e)=>this.rect(g,a,b,c,d,e);
  const night=!!s&&s.phase==='night',lit=!!s&&(s.lit||(s.house?.charge||0)>0);
  const health=s?s.farmHp/Math.max(1,houseMaxHealth(s)):1,levels=s?.house?.levels||{},shutters=levels.shutters||1,door=levels.doors||1;
  const glass=night?(lit?'warm':'dark'):'day',hurt=health<.7,wrecked=health<.4;
  if(!live)this.poly(g,[[x+8,y+h-6],[x+w,y+h-6],[x+w+32,y+h+21],[x+27,y+h+21]],'#233e2c55');
  // Behind the roof: the stone chimney of the common-room fireplace, and the kitchen stove's metal flue.
  const chim=x+w-46;R(chim,y-74,24,80,'#8a8577');
  for(let yy=y-72,row=0;yy<y+4;yy+=6,row++)for(let xx=chim-(row%2)*5;xx<chim+24;xx+=10){const sx=Math.max(chim,xx);R(sx,yy,Math.min(9,chim+24-sx),5,(row+Math.floor(xx/10))%3?'#9b9686':'#7c786b');}
  R(chim-3,y-80,30,6,'#5f5b50');R(chim-3,y-80,30,2,'#8d897b');R(chim+3,y-86,6,6,'#4f4c43');R(chim+15,y-86,6,6,'#4f4c43');
  R(x+30,y-34,5,40,'#6f7672');R(x+31,y-34,2,40,'#a7aea8');R(x+27,y-38,11,5,'#3b3f40');R(x+29,y-41,7,3,'#55595a');
  // Walls: lap siding, corner boards, a band between the floors, and a gutter running down to the rain barrel.
  R(x,y,w,h,'#c1a878');R(x+w-14,y,14,h,'#a18c64');
  for(let yy=y+28;yy<y+h-12;yy+=7){R(x+3,yy,w-6,1,'#816f4c');R(x+4,yy+1,w-20,1,'#dfc99a');}
  R(x,y+26,5,h-36,'#dcc89a');R(x+w-6,y+26,6,h-36,'#8f7b57');
  R(x,y+86,w,5,'#8f7650');R(x,y+86,w,1,'#d8bf8c');R(x,y+90,w,1,'#5e4f38');
  R(x-3,y+24,3,h-40,'#6f7672');R(x-3,y+24,1,h-40,'#a7aea8');
  R(x-3,y+h-12,w+6,12,'#6c6a5b');for(let row=0;row<2;row++)for(let xx=x-3+(row?7:0);xx<x+w+3;xx+=14)R(xx,y+h-11+row*6,Math.min(12,x+w+3-xx),5,(xx/14+row)%3<1?'#8d8a77':'#7b796a');
  // The roof with its tiles and eave, and the dormer whose window lights the stairs.
  const roofTop=y-59;this.poly(g,[[x-15,y+22],[cx,roofTop-2],[x+w+15,y+22],[x+w+15,y+38],[x-15,y+38]],'#2d3d32');
  this.poly(g,[[x-13,y+21],[cx,roofTop],[x+w+13,y+21]],'#526252');
  g.save();g.beginPath();g.moveTo(x-13,y+21);g.lineTo(cx,roofTop);g.lineTo(x+w+13,y+21);g.closePath();g.clip();
  this.poly(g,[[x-14,roofTop],[cx,roofTop],[cx,y+22],[x-14,y+22]],'#a2b59422');
  for(let yy=roofTop+6,row=0;yy<y+22;yy+=6,row++){R(x-14,yy,w+28,1,'#2f453b');R(x-14,yy+1,w+28,1,'#a4b59422');for(let xx=x-14+(row%2)*9;xx<x+w+14;xx+=18)R(xx,yy,1,6,'#273c324d');}
  if(wrecked)for(const [mx,my] of [[x+40,y+4],[x+150,y-6],[x+122,y+12]]){R(mx,my,14,6,'#1e2a22');R(mx+2,my+6,10,2,'#3d2c22');}
  g.restore();R(x-14,y+21,w+28,5,'#a66c48');R(x-14,y+21,w+28,1,'#d7ac72');R(x-8,y+26,w+16,3,'#314234');
  this.poly(g,[[cx-24,y-16],[cx,y-40],[cx+24,y-16]],'#374b3d');this.poly(g,[[cx-20,y-17],[cx,y-36],[cx+20,y-17]],'#4b5e4d');R(cx-15,y-17,30,22,'#867957');
  this.houseWindow(g,cx-9,y-14,18,15,'#7e8468',{glass});
  // Upstairs, left to right: the West and Garden rooms, the landing over the stairs, the East and Loft rooms.
  const up=y+40,down=y+98;
  [[x+12,'#8c6f5c'],[x+54,'#617d73'],[x+128,'#78815b'],[x+170,'#8a7080']].forEach(([wx,curtain],i)=>this.houseWindow(g,wx,up,22,28,curtain,{glass,shutters,boarded:wrecked&&i===2,hanging:wrecked&&i===0}));
  this.houseWindow(g,cx-7,up+2,14,24,'#7e8468',{glass});
  // Downstairs: two kitchen windows with cafe curtains and flower boxes, then the common room's wide window.
  for(const wx of [x+9,x+50]){this.houseWindow(g,wx,down,22,24,'#b99a6a',{glass,shutters,cafe:true,boarded:wrecked&&wx===x+9});R(wx-3,down+31,28,7,'#78533d');R(wx-4,down+30,30,2,'#b98b60');for(let j=0;j<6;j++){R(wx-1+j*4,down+24-(j%2)*3,3,7,'#536c3e');R(wx-1+j*4,down+23-(j%2)*3,3,3,j%2?'#e4ba6d':'#bd7356');}}
  this.houseWindow(g,x+140,down,56,26,'#6f826c',{glass,wide:true,boarded:wrecked});
  // The front door with a transom, under a small porch roof on two posts; Front door upgrades add iron straps and a bar.
  R(cx-16,y+h-58,32,48,'#5b4632');R(cx-14,y+h-56,28,6,glass==='warm'?'#f2d58c':glass==='dark'?'#2e3a44':'#9fb4ae');R(cx-14,y+h-49,28,39,'#7a5634');
  for(const [px,py,ph] of [[-11,-45,14],[2,-45,14],[-11,-27,13],[2,-27,13]])R(cx+px,y+h+py,9,ph,'#694a2d');R(cx+8,y+h-31,3,3,'#e1c278');
  if(door>=2)for(const ry of [y+h-42,y+h-20]){R(cx-14,ry,28,3,'#4a4f4f');R(cx-12,ry+1,2,1,'#9aa29c');R(cx+10,ry+1,2,1,'#9aa29c');}
  if(door>=3){R(cx-16,y+h-33,32,4,'#3b3f40');R(cx-16,y+h-33,32,1,'#7b8380');}
  if(hurt){R(cx-12,y+h-24,2,10,'#3a2a1c');R(cx+5,y+h-38,2,7,'#3a2a1c');R(cx-8,y+h-41,6,1,'#3a2a1c');}
  R(x+80,y+h-66,52,7,'#4b5e4d');R(x+80,y+h-66,52,2,'#7c8f72');R(x+82,y+h-59,48,3,'#2d3d32');
  if(wrecked){R(x+112,y+h-66,10,7,'#1e2a22');R(x+114,y+h-59,6,2,'#3d2c22');}
  for(const px of [x+84,x+122]){R(px,y+h-59,5,49,'#bda576');R(px,y+h-59,2,49,'#ead2a1');}
  R(x+80,y+h-12,52,6,'#8e7653');R(x+80,y+h-12,52,2,'#c9ad7c');
  R(cx-22,y+h-2,44,5,'#aaa083');R(cx-25,y+h+3,50,5,'#8d8a70');R(cx-28,y+h+8,56,5,'#77795e');R(cx-22,y+h-2,44,1,'#d0c7a6');
  if(wrecked)R(cx+6,y+h+3,12,2,'#4d4a3c');
  // The porch lamp burns at night when the house has power or battery light.
  R(x+128,y+h-50,7,9,'#3b3f40');R(x+129,y+h-48,5,6,night&&lit?'#ffe7a5':'#7c7d6c');R(x+130,y+h-53,3,3,'#3b3f40');
  // Beside the house: the rain barrel, a woodpile for the fireplace, and a washing line.
  R(x-18,y+h-32,15,26,'#5c6350');R(x-19,y+h-28,17,3,'#343e34');R(x-19,y+h-14,17,3,'#343e34');R(x-17,y+h-33,13,2,'#7c876d');R(x-16,y+h-32,10,2,'#527974');
  for(let row=0;row<3;row++)for(let k=0;k<4-row;k++){const lx=x+w+8+k*8+row*4,ly=y+104-row*7;R(lx,ly,8,7,'#6b4f36');R(lx+2,ly+2,4,3,'#b08a5c');R(lx+3,ly+3,2,1,'#8a6a45');}
  R(x+w+4,y+111,38,3,'#4d3b29');
  const sway=live&&!this.reducedMotion&&this.ambient!==false?Math.sin(t*1.6):0,lx0=x-62,lx1=x-30,ly=y+28;
  for(const px of [lx0,lx1]){R(px,ly,3,34,'#7a6441');R(px-3,ly,9,2,'#9c8156');}
  g.strokeStyle='#d8d2b8';g.lineWidth=1;g.beginPath();g.moveTo(lx0+2,ly+2);g.quadraticCurveTo((lx0+lx1)/2,ly+6,lx1+1,ly+2);g.stroke();
  [['#a35d4a',lx0+5],['#d9d2bc',lx0+13],['#5d7a9b',lx0+21]].forEach(([c,clx],i)=>{const off=Math.round(sway*(1+i%2));R(clx+off,ly+4,6,9,c);R(clx+off,ly+4,6,1,'#00000033');});
  // Damage shows on the outside: cracked boards first, then holes in the siding.
  if(hurt)for(const [dx,dy,dw] of [[20,77,14],[120,79,12],[178,135,12],[36,139,8],[86,52,8]]){R(x+dx,y+dy,dw,2,'#3a2a1c');R(x+dx+2,y+dy+2,dw-4,1,'#5b4632');}
  if(wrecked)for(const [dx,dy] of [[40,75],[150,131]]){R(x+dx,y+dy,12,9,'#1e1a14');R(x+dx-2,y+dy-1,4,3,'#6b5a3c');R(x+dx+10,y+dy+7,4,3,'#6b5a3c');}
  // Smoke from the fireplace chimney, and a thinner wisp from the stove flue.
  if(live&&s){const calm=this.reducedMotion||this.ambient===false;
   for(const [sx,sy,n,size] of [[chim+12,y-88,4,1],[x+32,y-42,2,.6]])for(let i=0;i<n;i++){const p=calm?.3+i*.18:(t*.28+i/n)%1,r=(3+p*9)*size;g.fillStyle=`rgba(206,202,190,${(1-p)*.38})`;g.fillRect(Math.round(sx+p*16*size-r/2+(calm?0:Math.sin(t+i)*2)),Math.round(sy-p*44*size-r/2),Math.round(r),Math.round(r));}}
 }
 // Where the farmhouse windows glow at night: nowhere when the house has no light.
 houseLights(s){
  if(!(s.lit||(s.house?.charge||0)>0))return [];
  const {x,y,h}=FARMHOUSE;
  return [[x+23,y+54,26],[x+65,y+54,26],[x+105,y+54,22],[x+139,y+54,26],[x+181,y+54,26],[x+20,y+110,26],[x+61,y+110,26],[x+168,y+111,40],[x+131,y+h-46,46]];
 }
 // A farmhouse window: frame, glass by day or lamplight by night, curtains in the room's colour, and the Window
 // shutters upgrade (wooden shutters, then iron-strapped). Damage boards a window up or leaves a shutter hanging.
 houseWindow(g,x,y,w,h,curtain,o={}){
  const R=(a,b,c,d,e)=>this.rect(g,a,b,c,d,e),glass=o.glass||'day';
  const wood=o.shutters>=2?['#4f6346','#6d8461']:['#7a6a4c','#9c8a64'];if(o.shutters&&!o.wide)for(const sx of [x-8,x+w+2]){if(o.hanging&&sx===x-8)continue;R(sx,y-2,6,h+4,wood[0]);R(sx+1,y-1,1,h+2,wood[1]);R(sx,y+h/2-1,6,2,'#3c4b36');if(o.shutters>=3){R(sx,y+3,6,2,'#4a4f4f');R(sx,y+h-4,6,2,'#4a4f4f');R(sx+3,y+3,1,1,'#9aa29c');}}
  R(x-3,y-3,w+6,h+6,'#e0cfa2');R(x-1,y-1,w+2,h+2,'#5a4a33');
  R(x,y,w,h,glass==='warm'?'#e8b45f':glass==='dark'?'#26323c':'#8aa39d');R(x,y,w,Math.ceil(h*.45),glass==='warm'?'#f6d58c':glass==='dark'?'#2e3a44':'#c4d4cb');
  if(glass==='day')R(x+2,y+2,3,Math.max(3,h/2-3),'#eef3ea88');
  if(o.cafe){R(x,y+h/2,w,h/2,curtain);for(let xx=x;xx<x+w;xx+=4)R(xx,y+h/2+((xx-x)/4%2?2:0),2,2,'#efe4c4');}
  else{const side=o.wide?8:5;R(x,y,w,3,curtain);R(x,y,side,h,curtain);R(x+w-side,y,side,h,curtain);R(x+side-2,y+h*.6,3,2,'#e8d7a4');R(x+w-side-1,y+h*.6,3,2,'#e8d7a4');}
  R(x+w/2-1,y,2,h,'#6b5a3c');R(x,y+h/2-1,w,2,'#6b5a3c');if(o.wide){R(x+w/4-1,y,2,h,'#6b5a3c');R(x+w*3/4-1,y,2,h,'#6b5a3c');}
  R(x-4,y+h+3,w+8,3,'#d7bc83');R(x-3,y+h+6,w+6,1,'#7a6646');
  if(o.hanging&&o.shutters){g.save();g.translate(x-6,y+2);g.rotate(.5);R(0,0,6,h,wood[0]);R(1,1,1,h-2,wood[1]);g.restore();}
  if(o.boarded){this.poly(g,[[x-4,y+2],[x+w+4,y+h-6],[x+w+4,y+h-1],[x-4,y+7]],'#9c7a4c');this.poly(g,[[x-4,y+h-6],[x+w+4,y+1],[x+w+4,y+6],[x-4,y+h-1]],'#8b6c40');for(const [nx,ny] of [[x-2,y+3],[x+w+1,y+h-4],[x-2,y+h-4],[x+w+1,y+3]])R(nx,ny,2,2,'#3b3f40');}
 }

 landmarkItems(g,s,t){return [
  {y:FARMHOUSE.y+FARMHOUSE.h,draw:()=>this.house(g,true,s,t)},
  {y:240,draw:()=>{this.building(g,125,110,160,130,'#a85843','#6b3a30',false);this.rect(g,173,170,62,70,'#59432e');this.rect(g,177,176,54,57,'#302b22');this.rect(g,181,214,46,19,'#8c7440');this.rect(g,185,206,22,9,'#b89955');this.rect(g,174,171,60,5,'#ccb58a');this.rect(g,188,126,25,24,'#293d30');this.rect(g,199,126,4,24,'#c0ab7c');this.rect(g,188,137,25,3,'#c0ab7c');this.barnDoors(g,s.barnOpen||0);if(s.buildings.barn)this.drawBuilding(g,'barn',s,t);}}
 ];}

 tree(g,x,y,size=1){
  const r=random(seedAt(x,y));g.save();g.translate(Math.round(x),Math.round(y));g.scale(size,size);
  this.poly(g,[[-20,11],[20,6],[43,24],[15,31],[-14,23]],'#1a35293d');this.rect(g,-5,-7,10,28,'#594832');this.rect(g,-3,-5,3,25,'#a1834d');
  for(let layer=0;layer<5;layer++){
   const yy=5-layer*13,ww=31-layer*5,hh=24;
   this.poly(g,[[-ww,yy],[-ww+5,yy-8],[-ww+10,yy-8],[-ww/2,yy-hh+8],[0,yy-hh],[ww/2,yy-hh+8],[ww-6,yy-8],[ww-3,yy-5],[ww,yy],[ww-11,yy+3],[4,yy],[-6,yy+4]],'#263f30');
   this.poly(g,[[-ww+5,yy-3],[-ww/2+2,yy-15],[0,yy-hh+2],[1,yy-6],[-10,yy-2]],'#47653d');
   this.poly(g,[[1,yy-hh+3],[ww/2,yy-14],[ww-4,yy-2],[9,yy+1],[1,yy-5]],'#36563a');
   for(let j=0;j<6;j++){const px=-ww+6+r()*(ww*2-12),py=yy-3-r()*9;this.rect(g,px,py,3+Math.floor(r()*5),2,r()>.5?'#65804b':'#527344');}
   this.rect(g,-ww+9,yy-3,7,2,'#78905a');this.rect(g,ww-9,yy,5,2,'#1f372b');
  }g.restore();
 }

 forest(g,rng){
  // Everything in this method is baked once into the existing terrain canvas.
  g.save();const r=random(35281),b=FARM_BOUNDARY,lots=[...Object.values(BUILDINGS),FARMHOUSE,{x:80,y:375,w:180,h:135},{x:306,y:215,w:340,h:235}];
  const free=(x,y)=>!lots.some(o=>x>o.x-20&&x<o.x+o.w+24&&y>o.y-65&&y<o.y+o.h+28)&&!(x>440&&x<580&&y>420);
  for(let i=0;i<650;i++){const x=b.left+20+r()*(b.right-b.left-40),y=b.top+20+r()*(b.bottom-b.top-40);if(!free(x,y))continue;
   const bright=i%6===0;this.rect(g,x,y,9+r()*12,3,bright?'#81905c55':'#3b58393d');this.rect(g,x+3,y-3,8,3,bright?'#90965e66':'#48664066');this.rect(g,x+5,y-5,3,5,'#71874f77');
   if(i%11===0){this.rect(g,x+4,y-4,2,2,'#d0b76a');this.rect(g,x+9,y-2,2,2,'#bbbf79');}
   if(i%19===0){this.rect(g,x+2,y+2,8,4,'#757c62');this.rect(g,x+3,y+2,5,1,'#b0ad84');}
  }
  // Wheel ruts, pale gravel and broken edges on the road beyond the market.
  g.save();g.beginPath();g.moveTo(478,600);g.lineTo(548,600);g.lineTo(545,820);g.lineTo(568,950);g.lineTo(553,1100);g.lineTo(565,1250);g.lineTo(478,1250);g.lineTo(462,1100);g.lineTo(483,950);g.lineTo(458,820);g.closePath();g.clip();
  for(let y=610;y<1240;y+=6){const bend=Math.sin((y-610)/110)*10;this.rect(g,492+bend,y,3,5,'#685c3a4d');this.rect(g,529+bend,y,3,5,'#685c3a4d');if(y%4===0)this.rect(g,501+bend,y,4,2,'#bdad7c88');}
  for(let i=0;i<130;i++){const x=465+r()*100,y=610+r()*630;this.rect(g,x,y,2+r()*3,1,i%3?'#bead7977':'#685f4166');}g.restore();g.restore();super.forest(g,rng);
 }

 bed(g,x,y,wet){
  this.rect(g,x-26,y-18,52,44,'#3d4c2e');this.rect(g,x-25,y-17,50,42,'#413a29');this.rect(g,x-23,y-15,46,38,wet?'#60503a':'#765b3d');
  for(let row=0;row<5;row++){const yy=y-11+row*7;this.rect(g,x-21,yy,42,2,'#493c2b');this.rect(g,x-20,yy+2,40,1,wet?'#8b735044':'#b18b5366');for(let j=0;j<4;j++)this.rect(g,x-18+j*11+(row%2)*2,yy+3,2,1,'#d0a36655');}
  this.rect(g,x-24,y-17,48,1,'#bea46d');this.rect(g,x-24,y+24,48,2,'#263a2866');
 }
 crop(g,p,t,type){
  const kind=p.crop&&p.crop!=='auto'?p.crop:type;if(p.growth<0||kind==='potato')return super.crop(g,p,t,type);
  const growth=clamp(p.growth,0,1),mature=growth>=1,sway=this.reducedMotion?0:Math.sin(t*1.5+p.x*.1)*.018;g.save();g.translate(p.x,p.y);g.transform(1,0,sway,1,0,0);
  if(kind==='pumpkin'){
   for(let i=0;i<4;i++){const x=-17+(i%2)*23,y=-3+Math.floor(i/2)*15;this.rect(g,x-4,y,19,3,'#486b39');this.rect(g,x+4,y-5,9,7,'#769449');this.rect(g,x-5,y-2,7,5,'#65883f');if(growth>.35){const w=Math.round(7+growth*8),h=Math.round(5+growth*6);this.rect(g,x+2,y-h,w-4,h,'#b97635');this.rect(g,x,y-h+2,w,h-4,'#c78c3d');this.rect(g,x+2,y-h+1,w-5,2,'#e3ae59');this.rect(g,x+3,y-h+2,2,h-4,'#e3a44c');this.rect(g,x+w-4,y-h+3,2,h-5,'#956334');this.rect(g,x+w/2,y-h-3,2,4,'#7d934b');}}
  }else for(let row=0;row<2;row++)for(let col=0;col<5;col++){
   const x=-18+col*9+(row%2)*2,y=5+row*12,h=8+growth*(kind==='corn'?32:25)+(col%2)*3,stem=kind==='corn'?'#628647':mature?'#bda557':'#7b9250';
   this.rect(g,x,y-h,2,h,stem);this.rect(g,x-4,y-h*.6,5,2,kind==='corn'?'#83a251':mature?'#d5bb6a':'#93a963');this.rect(g,x+1,y-h*.42,5,2,stem);
   if(kind==='corn'){this.poly(g,[[x,y-h*.75],[x-7,y-h*.85],[x-4,y-h*.6],[x,y-h*.52]],'#84a452');this.poly(g,[[x+1,y-h*.55],[x+9,y-h*.73],[x+6,y-h*.49],[x+1,y-h*.4]],'#54783f');if(growth>.55){this.rect(g,x+2,y-h*.6,4,8,'#d1b859');this.rect(g,x+3,y-h*.6,1,7,'#f0d37e');}}
   else{const head=4+growth*5;this.rect(g,x-2,y-h-head,5,head,mature?'#dfc16e':'#9ca965');this.rect(g,x-2,y-h-head,2,head,mature?'#f3d78a':'#b6bd79');this.rect(g,x+2,y-h-head+3,2,2,'#9b8a4a');}
  }
  if(mature&&Math.sin(t*2+p.x)>.85){this.rect(g,17,-34,2,8,'#f4dfa1');this.rect(g,14,-31,8,2,'#f4dfa1');}g.restore();
 }

 person(g,a,t,opts={}){
  const look=LOOKS[a.look%LOOKS.length],x=Math.round(a.x),y=Math.round(a.y),back=Math.sin(a.angle||0)<-.5,side=Math.abs(Math.cos(a.angle||0))>.75;
  const step=a.moving?Math.sin((a.walk||0)+a.id)*2:0,bob=a.moving?Math.abs(step)*.4:0;
  if(opts.selected||opts.hover){g.strokeStyle=opts.selected?'#f0cf75':'#e9e2b099';g.lineWidth=opts.selected?2:1;g.beginPath();g.ellipse(x,y+6,15,6,0,0,Math.PI*2);g.stroke();}
  g.save();g.translate(x,y);if(a.hurt>0&&Math.floor(t*20)%2===0)g.globalAlpha=.5;
  this.rect(g,-11,6,21,5,'#203d2a50');
  for(const [px,move] of [[-6,step],[2,-step]]){this.rect(g,px,-3+move,5,10,'#3d4034');this.rect(g,px+1,-2+move,2,7,'#646754');this.rect(g,px-1,6+move,7,3,'#282d27');this.rect(g,px,6+move,4,1,'#77745b');}
  g.translate(0,-bob);this.rect(g,-8,-15,16,16,'#29392c');this.rect(g,-7,-14,14,14,look.shirt);this.rect(g,-6,-13,3,10,'#f0e4c22a');this.rect(g,5,-12,2,12,'#142b2c55');this.rect(g,-7,-2,14,3,'#484534');this.rect(g,0,-2,2,2,'#c4b47a');
  const arm= a.hammering?Math.sin(t*15+a.id)*3:step*.65;
  this.rect(g,-11,-12+arm,4,9,look.shirt);this.rect(g,-10,-4+arm,3,5,look.skin);this.rect(g,8,-12-arm,4,9,look.shirt);this.rect(g,8,-4-arm,3,5,look.skin);
  this.rect(g,-5,-27,10,14,'#493e2c');this.rect(g,-6,-25,12,10,look.skin);this.rect(g,-4,-27,9,3,look.hair);this.rect(g,-6,-26,3,5,look.hair);this.rect(g,4,-25,2,5,'#7e604144');this.rect(g,-4,-15,8,2,'#96704c');
  if(back){this.rect(g,-5,-26,10,9,look.hair);this.rect(g,-3,-16,7,1,'#bd9c6b');}else{this.rect(g,side?2:1,-22,2,2,'#302f27');if(!side)this.rect(g,-4,-22,2,2,'#302f27');this.rect(g,0,-18,3,1,'#8e674d');this.rect(g,-4,-24,3,1,'#ecd0a166');}
  if(a.job==='farmer'){this.rect(g,-11,-28,22,3,'#e4c571');this.rect(g,-6,-33,12,6,'#b69b55');this.rect(g,-5,-33,10,2,'#f2d482');this.rect(g,-5,-29,10,2,'#8d7544');}
  if(a.job==='builder'){this.rect(g,-8,-31,16,5,'#d7aa42');this.rect(g,-5,-33,10,3,'#f0cb64');this.rect(g,-10,-27,20,2,'#a37b2d');this.rect(g,-5,-9,4,3,'#d5ba70');}
  if(a.job==='defender'){this.rect(g,-7,-31,14,6,'#596a43');this.rect(g,-4,-33,8,3,'#7d8a57');this.rect(g,-9,-27,18,2,'#3b4d33');this.rect(g,-6,-13,12,8,'#51633f');for(const px of [-5,2])this.rect(g,px,-11,4,4,'#7a8554');}
  if(a.job==='scout'){this.rect(g,-11,-14,5,13,'#675c3c');this.rect(g,-12,-12,3,7,'#9d8b58');this.rect(g,-7,-30,14,4,'#637345');this.rect(g,4,-28,6,2,'#4e5d39');}
  if(a.job==='medic'){this.rect(g,-7,-29,14,3,'#e1e3cd');this.rect(g,-1,-30,2,5,'#b85e49');this.rect(g,-3,-29,6,2,'#b85e49');this.rect(g,-5,-11,4,5,'#e3e4ce');this.rect(g,-4,-10,2,3,'#b85e49');}
  if(a.hammering){this.rect(g,10,-17+arm,2,11,'#ad8951');this.rect(g,7,-19+arm,9,4,'#707b73');this.rect(g,7,-19+arm,9,1,'#b3b6a0');}
  g.restore();
  if(a.tool==='gun'){g.save();g.translate(x-(a.flash>0?2:0),y-9-bob);g.rotate(a.angle||0);this.rect(g,1,-2,21,4,'#29352e');this.rect(g,2,0,9,3,'#9a744a');this.rect(g,11,-3,12,2,'#a2b0a0');this.rect(g,15,-1,8,1,'#d4d9b6');if(a.flash>0){this.poly(g,[[23,-5],[31,-2],[25,-1],[31,3],[23,2]],'#f9d36f');this.rect(g,23,-1,5,2,'#fff4c9');}g.restore();}
  else if(a.tool==='scythe'){if(a.swing>0){g.strokeStyle='#eadd9b88';g.lineWidth=2;g.beginPath();g.arc(x,y-10,25,(a.angle||0)-1,(a.angle||0)+1);g.stroke();}g.save();g.translate(x+8,y-5-bob);g.rotate(a.swing>0?(a.angle||0):-.4);this.rect(g,-1,-23,2,29,'#c5a66a');this.poly(g,[[-1,-23],[9,-25],[14,-21],[14,-18],[10,-21],[-1,-20]],'#d3d6ba');this.rect(g,7,-24,3,1,'#eef0d0');g.restore();}
  if(a.hp<a.maxHp||opts.selected){this.rect(g,x-11,y-39,22,4,'#283d2b');this.rect(g,x-10,y-38,20*clamp(a.hp/a.maxHp,0,1),2,a.hp<a.maxHp*.35?'#df7958':'#adc178');}
  if(opts.noLabel)return;
  if(a.bubble)this.bubble(g,x,y-45,a.bubble,a.panic||a.bubble==='No shells!');else{g.font='bold 8px monospace';g.textAlign='center';g.fillStyle='#1c2a20';g.fillText(a.name,x+1,y-44);g.fillStyle=opts.selected?'#ffe1a0':'#eee9cb';g.fillText(a.name,x,y-45);g.textAlign='left';}
 }

 fencePiece(g,f,alpha=1,tint=''){
  if(f.kind==='gate'){
   const {x,y,w,h}=f;g.save();g.globalAlpha=alpha;
   if(f.vertical){super.fencePiece(g,f,alpha,tint);g.restore();return;}
   for(const px of [x-2,x+w-3]){this.rect(g,px,y-18,6,29,tint||'#967a4e');this.rect(g,px,y-18,6,2,tint||'#debd82');this.rect(g,px+1,y-14,2,23,tint||'#b89d69');}
   if(!f.open){for(const px of [x+5,x+w/2-2,x+w-10])this.rect(g,px,y-12,4,22,tint||'#9e8150');for(const yy of [y-10,y+3]){this.rect(g,x+4,yy,w-8,4,tint||'#b69761');this.rect(g,x+4,yy,w-8,1,tint||'#e0bd7d');}this.poly(g,[[x+6,y+5],[x+9,y+5],[x+w-7,y-10],[x+w-10,y-10]],tint||'#8d754b');this.rect(g,x+w/2-2,y-5,4,8,tint||'#697269');this.rect(g,x+w/2-1,y-4,2,2,'#d0d1ad');}
   else{this.rect(g,x+3,y-10,6,18,tint||'#9c8557');this.rect(g,x+w-9,y-10,6,18,tint||'#9c8557');}
   if(f.hurt>0){g.globalAlpha=.3;this.rect(g,x,y-18,w,29,'#ffebc2');}g.restore();return;
  }
  super.fencePiece(g,f,alpha,tint);
 }

 actor(g,a,farmer,t,tool){
  if(farmer||a.kind==='crawler')return super.actor(g,a,farmer,t,tool);
  const x=Math.round(a.x),y=Math.round(a.y),step=Math.sin((a.walk||t*5)+(a.id||0))*2,shirt=a.kind==='runner'?'#94714e':a.kind==='spitter'?'#7e8552':a.kind==='screamer'?'#926457':a.kind==='brute'?'#566b4c':'#657552';
  g.save();g.translate(x,y);if(a.boss)g.scale(1.5,1.5);if(a.hurt>0&&Math.floor(t*20)%2===0)g.globalAlpha=.5;
  this.rect(g,-13,6,26,5,'#203b2b66');
  for(const [px,move] of [[-7,step],[3,-step]]){this.rect(g,px,-3+move,5,12,'#394c40');this.rect(g,px+1,-1+move,2,6,'#637254');this.rect(g,px-1,7+move,7,3,'#2a382f');}
  this.rect(g,-9,-16,18,17,'#304631');this.rect(g,-8,-15,16,14,shirt);this.rect(g,-5,-14,3,13,'#c0bf7944');this.rect(g,5,-13,3,13,'#253d2f66');
  this.rect(g,-6,-5,3,5,'#a3ac78');this.rect(g,0,-3,3,4,'#879965');this.rect(g,2,-12,2,7,'#3c4f35');
  const reach=Math.sin(t*3+(a.id||0))*2;this.rect(g,-12,-13,4,10+reach,'#93a16d');this.rect(g,9,-14,4,11-reach,'#819660');this.rect(g,-12,-13,4,4,shirt);this.rect(g,9,-14,4,4,shirt);
  this.rect(g,-6,-29,12,15,'#7d925f');this.rect(g,-7,-27,14,10,'#a1af7c');this.rect(g,-6,-29,10,4,'#3e5035');this.rect(g,-5,-26,2,3,'#b8c48b');this.rect(g,4,-23,2,5,'#526b47');this.rect(g,-3,-18,7,2,'#4b603d');
  this.rect(g,-4,-23,2,2,'#333f2f');this.rect(g,2,-23,2,2,a.kind==='spitter'?'#dde892':'#d1c481');this.rect(g,-1,-17,4,1,'#c1c18c');
  if(a.kind==='spitter'){this.rect(g,7,-22,7,4,'#9fae63');this.rect(g,10,-21,4,2,'#d8df87');}
  if(a.kind==='screamer'){this.rect(g,-5,-19,10,7,'#a86f57');this.rect(g,-3,-18,6,4,'#443d2f');}
  if(a.kind==='brute'){this.rect(g,-12,-17,6,8,'#536b45');this.rect(g,7,-17,6,8,'#536b45');this.rect(g,-11,-17,5,2,'#7c8c58');}
  g.restore();
  if(a.hp<a.maxHp){this.rect(g,x-12,y-(a.boss?57:38),24,3,'#243d2b');this.rect(g,x-12,y-(a.boss?57:38),24*clamp(a.hp/a.maxHp,0,1),3,'#b7c480');}
  if(a.boss){g.font='bold 10px monospace';g.fillStyle='#f2c18a';g.textAlign='center';g.fillText('COLOSSUS',x,y-64);g.textAlign='left';}
  if(a.kind==='screamer'&&a.screamed){g.strokeStyle='#d9ad7855';g.beginPath();g.arc(x,y,24+Math.sin(t*4)*3,0,Math.PI*2);g.stroke();}
 }

 cow(g,a,t){
  const x=Math.round(a.x),y=Math.round(a.y),flip=Math.cos(a.angle)<0?-1:1,step=a.moving?Math.sin((a.walk||0)+a.id)*2:0;g.save();g.translate(x,y);g.scale(flip,1);if(a.hurt>0&&Math.floor(t*20)%2===0)g.globalAlpha=.5;
  this.rect(g,-18,7,36,5,'#27432b55');for(const [px,d] of [[-12,step],[7,-step]]){this.rect(g,px,1,4,12+d,'#c3c6a4');this.rect(g,px,10+d,5,3,'#3b4335');}
  this.rect(g,-16,-12,30,20,'#bdc2a1');this.rect(g,-17,-11,32,15,'#e0e2c1');this.rect(g,-13,-13,22,3,'#f2edd1');this.rect(g,-9,-10,9,8,'#687356');this.rect(g,-11,-8,7,8,'#687356');this.rect(g,4,-6,8,7,'#606c51');this.rect(g,-15,3,28,3,'#b3b99b');
  this.rect(g,11,-16,14,15,'#eee9ca');this.rect(g,15,-13,10,9,'#d4d4b0');this.rect(g,16,-6,12,6,'#b69779');this.rect(g,17,-6,10,2,'#dbb99a');this.rect(g,21,-13,2,2,'#2e3b2e');this.rect(g,11,-18,5,4,'#818a66');this.rect(g,22,-19,3,5,'#d1c79e');this.rect(g,13,-19,2,4,'#ded4af');this.rect(g,25,-5,1,1,'#6e5b46');this.rect(g,19,-5,1,1,'#6e5b46');
  this.rect(g,-20,-10,3,13,'#c4c8a4');this.rect(g,-21,1,4,4,'#666e51');g.restore();
 }
 hen(g,x,y){
  this.rect(g,x-4,y+8,13,3,'#2d492d55');this.rect(g,x-5,y,12,7,'#c9d0ac');this.rect(g,x-4,y-2,10,7,'#e5e4c3');this.rect(g,x-6,y-3,4,4,'#f3edcf');this.rect(g,x+3,y-6,6,8,'#efebcc');this.rect(g,x+4,y-8,3,3,'#ba6546');this.rect(g,x+9,y-2,4,2,'#d7a44e');this.rect(g,x+7,y-4,1,1,'#3c3d2b');this.rect(g,x-2,y+7,1,3,'#c49a49');this.rect(g,x+4,y+7,1,3,'#c49a49');this.rect(g,x-2,y+1,5,2,'#aebc95');
 }

 drawBuilding(g,id,s,t,level=s.buildings[id]){
  super.drawBuilding(g,id,s,t,level);const b=BUILDINGS[id];
  if(level>=2&&!['field','pasture','silo','watchtower','waterTank','well','generator'].includes(id)){
   for(const px of [b.x+4,b.x+b.w-8]){this.rect(g,px,b.y+b.h-33,3,20,'#727d6b');this.rect(g,px,b.y+b.h-33,3,2,'#b0b696');this.rect(g,px+1,b.y+b.h-28,1,2,'#263c30');}
  }
  if(id==='barn'){const count=Math.min(4,Math.ceil(s.hay/5));for(let i=0;i<count;i++){const px=b.x-22+(i%2)*16,py=b.y+b.h+14-Math.floor(i/2)*12;this.rect(g,px,py,15,11,'#b59a51');this.rect(g,px,py,15,2,'#e2c878');this.rect(g,px+4,py,2,11,'#7f7041');this.rect(g,px+11,py,1,11,'#7f7041');}}
  if(id==='clinic'){this.rect(g,b.x+b.w-31,b.y+24,18,18,'#dfddc0');this.rect(g,b.x+b.w-24,b.y+25,4,16,'#ba614b');this.rect(g,b.x+b.w-30,b.y+31,16,4,'#ba614b');}
  if(id==='market'&&level>=2){const wave=this.reducedMotion?0:Math.sin(t*3)*2;this.rect(g,b.x+b.w+11,b.y-39,2,37,'#81714d');this.poly(g,[[b.x+b.w+13,b.y-39],[b.x+b.w+30,b.y-36+wave],[b.x+b.w+27,b.y-28+wave],[b.x+b.w+13,b.y-31]],'#c8ad65');}
 }

 drawGroundEffects(g,s,t){
  super.drawGroundEffects(g,s,t);
  if(this.quality==='balanced'||this.reducedMotion||this.ambient===false)return;
  this.footprints??=[];this.lastFootstep??=new Map();
  if(s.mode==='playing'&&!s.phaseReady)for(const p of s.people){if(!p.moving||p.inside||p.away>0)continue;const old=this.lastFootstep.get(p.id);if(!old||Math.hypot(old.x-p.x,old.y-p.y)>15){this.lastFootstep.set(p.id,{x:p.x,y:p.y});this.footprints.push({x:p.x,y:p.y,time:t,side:p.id%2});}}
  this.footprints=this.footprints.filter(f=>t-f.time<1.6).slice(-64);
  g.save();for(const f of this.footprints){const age=clamp((t-f.time)/1.6,0,1);g.globalAlpha=(1-age)*.22;this.rect(g,f.x-3+f.side*5,f.y+5,3,2,s.weather==='rain'?'#263c30':'#c8ba86');}g.restore();
 }

}
