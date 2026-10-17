import {LOOKS} from './renderer.js';
import {houseLevel,batteryCapacity,HOUSE_REQUESTS} from './house-systems.js';
const rect=(g,x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const label=(g,value,x,y,size=7,color='#f1e1b4')=>{g.font=`bold ${size}px monospace`;g.textAlign='center';g.fillStyle='#263d2c';g.fillText(value,x+1,y+1);g.fillStyle=color;g.fillText(value,x,y);g.textAlign='left';};

export function drawHouseFurnishings(g,s,beds){
 if(!s.house)return;
 const h=s.house,stove=houseLevel(s,'stove'),sink=houseLevel(s,'sink'),shutters=houseLevel(s,'shutters'),doors=houseLevel(s,'doors');
 if(stove>1){rect(g,119,530,69,5,'#a4ad8b');rect(g,129,550,46,3,'#c3bd8f');rect(g,163,499,16,11,'#b2874a');rect(g,160,498,22,3,'#dbc18a');for(let i=0;i<stove;i++)rect(g,123+i*20,526,5,3,'#e1cc89');label(g,stove===3?'EFFICIENT':'IMPROVED',153,614,6);}
 if(sink>1){rect(g,240,473,5,17,'#d0d7bd');rect(g,237,471,18,4,'#c2cdb4');rect(g,283,495,25,10,'#a7b7a0');rect(g,286,497,19,6,'#668a7e');if(sink===3){rect(g,320,474,16,13,'#d6d3b1');rect(g,323,471,10,4,'#7b9685');}}
 if(houseLevel(s,'pantry')>1){for(let i=0;i<houseLevel(s,'pantry')-1;i++){rect(g,466+i*40,427,32,7,'#70533b');rect(g,468+i*40,427,28,2,'#d4bb80');rect(g,478+i*40,430,5,2,'#a28b5b');}label(g,'RESERVES',503,580,6);}
 for(const [i,b] of beds.entries()){
  const owner=s.people.find(p=>p.id===h.beds[i]);if(owner){rect(g,b.x+2,b.y+b.h+11,b.w-4,10,'#604c34');label(g,owner.name,b.x+b.w/2,b.y+b.h+18,6);}
  if(houseLevel(s,'beds')>1){rect(g,b.x+8,b.y+11,b.w-16,3,'#fff4d6');rect(g,b.x+4,b.y+39,b.w-8,2,'#dfd3a777');for(let j=0;j<houseLevel(s,'beds');j++)rect(g,b.x+12+j*13,b.y+58,6,6,'#d0bf9155');}
  const item=h.possessions.findLast(p=>p.personId===owner?.id);if(item){const x=b.x+b.w-9,y=b.y+b.h+4;if(item.type==='blanket'){rect(g,x-10,y-7,16,6,'#c29f6c');rect(g,x-10,y-5,16,1,'#ead6a4');}else if(item.type==='meal'){rect(g,x,y-6,6,6,'#e3cf9d');rect(g,x+5,y-5,3,3,'#d3bc88');}else{rect(g,x-5,y-13,13,14,'#5a4e38');rect(g,x-3,y-11,9,9,'#cfbc85');rect(g,x,y-9,4,5,'#6b8864');}}
 }
 if(houseLevel(s,'common')>1){rect(g,751,585,18,17,'#bca16f');rect(g,907,583,18,18,'#74866b');if(houseLevel(s,'common')===3){rect(g,982,596,21,7,'#c1a273');rect(g,982,598,21,1,'#ece0b1');}}
 if(houseLevel(s,'medicine')>1){rect(g,894,213,27,7,'#dbd5b5');rect(g,905,213,4,7,'#ac6651');rect(g,899,215,16,2,'#ac6651');}
 if(shutters>1)for(const [x,y,w,hh] of [[193,172,48,50],[433,172,48,50],[799,172,48,50],[1039,172,48,50],[621,179,41,48],[752,435,77,62]]){
  for(const xx of [x-18,x+w+10]){rect(g,xx,y,8,hh,'#746341');for(let yy=y+3;yy<y+hh;yy+=7)rect(g,xx+1,yy,6,2,'#b39d6c');rect(g,xx,y+13,8,3,'#515d4b');if(shutters===3)rect(g,xx,y+hh-15,8,4,'#a5aa8b');}
 }
 if(doors>1){for(const x of [585,695]){rect(g,x,405,5,264,'#9b7a4d');for(const y of [425,501,580,654]){rect(g,x-1,y,7,9,'#8b9780');rect(g,x+1,y+2,2,2,'#d5d9b0');}}rect(g,621,660,62,5,doors===3?'#a8b29a':'#947d55');label(g,'BRACED ENTRY',651,675,6);}
 // A working bookshelf and the family's small pinboard fit the existing furniture.
 rect(g,997,433,58,61,'#655039');rect(g,1000,436,52,54,'#3e4230');
 for(let row=0;row<3;row++){for(let i=0;i<Math.min(9,2+h.manuals.length+houseLevel(s,'library'));i++){const x=1004+i*5,y=439+row*16;rect(g,x,y+(i%2)*2,4,11-(i%2)*2,['#b58a59','#8e9f75','#a76f59','#b4b28a'][(row+i)%4]);rect(g,x,y+2,4,1,'#e7d5a355');}rect(g,999,452+row*16,54,3,'#b39762');}
 const cap=batteryCapacity(s);rect(g,1033,538,30,43,'#485a46');rect(g,1035,540,26,37,cap?'#8d9a79':'#566550');rect(g,1043,535,10,4,'#b9bc96');rect(g,1042,546,13,23,'#304f3b');if(cap)rect(g,1044,567-19*h.charge/cap,9,19*h.charge/cap,'#c5c67f');rect(g,1038,573,20,2,cap?'#d6c891':'#74806a');
 rect(g,599,307,51,52,'#5f4732');rect(g,602,310,45,46,'#a78657');label(g,'OUR STORY',625,317,5);
 for(let i=0;i<Math.min(6,h.memories.length);i++){const x=606+(i%3)*13,y=323+Math.floor(i/3)*16,m=h.memories[i];rect(g,x,y,11,13,'#e2d1a8');rect(g,x+1,y+1,9,7,m.kind==='loss'?'#65746b':'#8ba280');rect(g,x+4,y+4,5,4,'#5c7456');rect(g,x+4,y-1,2,2,'#b56c51');}
 if(h.project){label(g,HOUSE_REQUESTS[h.project.key]?.name||'HOUSE IMPROVEMENT PLANNED',640,132,7);}
}

function route(points,fraction){
 const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0);let d=Math.max(0,Math.min(1,fraction))*total;
 for(let i=0;i<lengths.length;i++){if(d<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],f=lengths[i]?d/lengths[i]:1;return {x:a[0]+(b[0]-a[0])*f,y:a[1]+(b[1]-a[1])*f,angle:Math.atan2(b[1]-a[1],b[0]-a[0])};}d-=lengths[i];}
 return {x:points[0][0],y:points[0][1],angle:0};
}

export function houseScenePlan(s,occupants,elapsed,motion,beds,activityAge=Infinity){
 const commonSeat=p=>occupants.home.findIndex(q=>q.id===p.id);
 const plan={dining:[],waiting:occupants.waiting.map(p=>({...p,houseCommonSeat:commonSeat(p)})),resting:[...occupants.resting],reading:[],walking:[],cooking:[]};
 occupants.dining.forEach((p,i)=>{
  const person={...p,houseSeat:i,houseCommonSeat:commonSeat(p)},seat=[272+i%4*66,i<4?584:654];
  if(!motion||!s.house){plan.dining.push(person);return;}
  const activity=s.house.activity;if(activityAge<9&&activity?.personId===p.id){(activity.kind==='cooking'?plan.cooking:plan.reading).push(person);return;}
  const age=elapsed-14-i*6;if(age<0){plan.dining.push(person);return;}
  const slot=person.houseCommonSeat,phase=age%76,chat=slot<4?[767+slot*47,607]:[757+(slot-4)*63,655],read=i%2?[1043,657]:[994,607],index=s.house.beds.indexOf(p.id),b=beds[index>=0?index:i],bed=[b.x+b.w/2,370];
  let points,f;
  if(phase<6){points=[seat,[seat[0],662],[chat[0],662],chat];f=phase/6;}
  else if(phase<18){plan.waiting.push(person);return;}
  else if(phase<24){points=[chat,[chat[0],662],[read[0],662],read];f=(phase-18)/6;}
  else if(phase<36){plan.reading.push(person);return;}
  else if(phase<46){points=[read,[read[0],662],[650,662],[636,380],bed];f=(phase-36)/10;}
  else if(phase<60){plan.resting.push({...person,houseNap:true});return;}
  else{points=[bed,[636,380],[650,662],[seat[0],662],seat];f=(phase-60)/16;}
  plan.walking.push({...person,...route(points,f)});
 });
 return plan;
}

export function drawHouseActivities(renderer,g,plan,t,motion){
 const draw=(p,x,y,angle,moving=false)=>{g.save();g.translate(x,y);g.scale(moving?1.45:1.7,moving?1.45:1.7);renderer.person(g,{...p,x:0,y:0,angle,moving,walk:t*9,panic:false,hurt:0,hammering:false,swing:0,flash:0,bubble:'',tool:null,job:'rest'},t,{noLabel:true});g.restore();};
 plan.reading.forEach((p,i)=>{const second=(p.houseSeat??i)%2,x=second?1043:994,y=second?657:607;if(second){rect(g,x-14,y+3,28,5,'#a58b5b');rect(g,x-10,y+8,4,10,'#6c5639');rect(g,x+7,y+8,4,10,'#6c5639');}draw(p,x,y,Math.PI/2);rect(g,x-12,y-18,13,12,'#d6cba0');rect(g,x+1,y-18,13,12,'#eadbb1');rect(g,x,y-18,2,12,'#8f7850');label(g,p.name,x,y-56,8);});
 plan.cooking.forEach(p=>{draw(p,175,559,-Math.PI/2);const offset=motion?Math.sin(t*3)*3:0;rect(g,158,535+offset,4,11,LOOKS[p.look%LOOKS.length].skin);rect(g,159,529+offset,2,9,'#d6be87');label(g,p.name+' · cooking',172,505,7);});
 plan.walking.slice().sort((a,b)=>a.y-b.y).forEach(p=>{draw(p,p.x,p.y,p.angle,true);label(g,p.name,p.x,p.y-44,7);});
}
