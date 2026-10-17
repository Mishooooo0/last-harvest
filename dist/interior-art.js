import {LOOKS,W,H} from './renderer.js';
import {drawHouseFurnishings,houseScenePlan,drawHouseActivities} from './house-art.js';

export const INTERIOR_LAYOUT=Object.freeze({left:86,right:1194,top:140,upperFloor:238,landing:382,groundTop:416,groundFloor:500,bottom:682,stairLeft:582,stairRight:702});
export const INTERIOR_BEDS=Object.freeze([108,348,714,954].flatMap((x,room)=>[0,1].map(i=>Object.freeze({x:x+20+i*100,y:264,w:62,h:91,room}))));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const R=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const P=(g,points,c)=>{g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
const text=(g,str,x,y,color='#e9d7ae',size=8,align='left')=>{g.font=`bold ${size}px monospace`;g.fillStyle=color;g.textAlign=align;g.fillText(str,Math.round(x),Math.round(y));g.textAlign='left';};
const caches=new WeakMap(),roomClocks=new WeakMap();

// The room assignment is a view of existing breakfast state. It never changes a person or save.
export function interiorOccupants(s){
 const breakfast=s.breakfast||{},wounded=new Set(breakfast.wounded||[]),hungry=new Set(breakfast.hungry||[]),fed=new Set(breakfast.fed||[]);
 const home=s.people.filter(p=>!p.expeditionId&&!(p.away>0));
 const resting=home.filter(p=>wounded.has(p.name));
 return {resting,dining:home.filter(p=>!wounded.has(p.name)&&fed.has(p.name)),waiting:home.filter(p=>!wounded.has(p.name)&&!fed.has(p.name)),hungry,home};
}

function shadow(g,x,y,w,h){R(g,x+3,y+3,w,h,'#282d222f');R(g,x,y,w,h,'#33382720');}
function boards(g,x,y,w,h,wall=false){
 R(g,x,y,w,h,wall?'#bca57b':'#8c7150');
 const step=wall?13:12;for(let yy=y;yy<y+h;yy+=step){R(g,x,yy,w,1,wall?'#9e875f':'#624f3c');R(g,x,yy+1,w,1,wall?'#dcc49a':'#b1956a');for(let xx=x+((Math.floor(yy/step)%2)*39);xx<x+w;xx+=78){R(g,xx,yy+2,1,Math.min(step-2,y+h-yy-2),wall?'#7d72523d':'#4a453a77');R(g,xx+3,yy+5,14,1,wall?'#ddc99d33':'#d6b4802e');}}
}
function rug(g,x,y,w,h,base='#7a5144',trim='#c49d66'){
 shadow(g,x,y,w,h);R(g,x,y,w,h,base);R(g,x+3,y+3,w-6,h-6,trim);R(g,x+6,y+6,w-12,h-12,base);
 for(let xx=x+11;xx<x+w-10;xx+=13){R(g,xx,y+8,4,2,trim);R(g,xx,y+h-10,4,2,trim);}
 for(let yy=y+13;yy<y+h-13;yy+=10){R(g,x+8,yy,2,3,trim);R(g,x+w-10,yy,2,3,trim);}
 P(g,[[x+w/2,y+h/2-9],[x+w/2+14,y+h/2],[x+w/2,y+h/2+9],[x+w/2-14,y+h/2]],trim);
 for(let xx=x+3;xx<x+w;xx+=5){R(g,xx,y-2,1,2,'#c7b38c');R(g,xx,y+h,1,2,'#c7b38c');}
}
function frame(g,x,y,w,h,picture='#6a805e'){
 R(g,x+2,y+2,w,h,'#34362a35');R(g,x,y,w,h,'#6b4e35');R(g,x+2,y+2,w-4,h-4,'#d2b988');R(g,x+4,y+4,w-8,h-8,picture);P(g,[[x+4,y+h-5],[x+w*.45,y+h*.4],[x+w*.7,y+h*.7],[x+w-4,y+h*.45],[x+w-4,y+h-4]],'#415942');R(g,x+6,y+6,4,4,'#e2c78c');
}
function windowArt(g,x,y,w,h,curtains='#6e8062'){
 R(g,x-5,y-4,w+10,h+11,'#504934');R(g,x-2,y-1,w+4,h+5,'#d7c298');R(g,x+3,y+4,w-6,h-5,'#c7ad86');R(g,x+4,y+5,w-8,h*.42,'#e4b88e');
 P(g,[[x+4,y+h-3],[x+4,y+h*.57],[x+w*.32,y+h*.45],[x+w*.55,y+h*.63],[x+w-4,y+h*.4],[x+w-4,y+h-3]],'#61765b');
 for(let xx=x+6;xx<x+w-5;xx+=12)P(g,[[xx-4,y+h-4],[xx,y+h*.6],[xx+4,y+h-4]],'#3b5744');
 R(g,x+w/2-1,y,3,h+2,'#876a47');R(g,x,y+h/2,w,3,'#876a47');R(g,x-8,y-7,w+16,3,'#5b4e37');R(g,x-7,y-4,10,h+4,curtains);R(g,x+w-3,y-4,10,h+4,curtains);
 for(const xx of [x-6,x-2,x+w-2,x+w+2])R(g,xx,y-1,2,h, '#e2ddad33');R(g,x-7,y+h-11,9,3,'#b49e64');R(g,x+w-3,y+h-11,9,3,'#b49e64');R(g,x-7,y+h+4,w+14,5,'#cfb382');R(g,x-9,y+h+8,w+18,3,'#806549');
}
function lamp(g,x,y,small=false){
 R(g,x-4,y+13,8,3,'#62513a');R(g,x-1,y+3,2,11,'#8f7850');P(g,[[x-8,y+3],[x-4,y-8],[x+5,y-8],[x+9,y+3]],'#c7b276');R(g,x-7,y+3,15,2,'#e7cf8e');R(g,x-3,y-5,6,6,'#f4d28b');if(!small){const glow=g.createRadialGradient(x,y,1,x,y,44);glow.addColorStop(0,'#ffd99825');glow.addColorStop(1,'#ffd99800');g.fillStyle=glow;g.fillRect(x-44,y-44,88,88);}
}
function plant(g,x,y,flowers=false){
 R(g,x-6,y,13,12,'#785039');R(g,x-8,y-2,17,4,'#b28a5b');R(g,x-4,y+3,2,7,'#bd906048');for(let i=0;i<4;i++){R(g,x-6+i*4,y-11-(i%2)*6,4,12,'#4a6940');R(g,x-8+i*4,y-12-(i%2)*6,7,4,'#758c4a');if(flowers)R(g,x-7+i*4,y-16-(i%2)*6,4,4,i%2?'#d5b66c':'#b87461');}
}
function cabinet(g,x,y,w,h,color='#8e6b43'){
 shadow(g,x,y,w,h);R(g,x,y,w,h,'#504331');R(g,x+2,y+2,w-4,h-5,color);R(g,x+4,y+4,w-8,3,'#c29c67');R(g,x+w/2,y+6,2,h-12,'#624c33');for(const px of [x+8,x+w/2+6]){R(g,px,y+11,w/2-15,h-25,'#513d2b33');R(g,px+2,y+13,w/2-19,1,'#deb77933');}R(g,x+w/2-6,y+h/2,2,4,'#ddc080');R(g,x+w/2+5,y+h/2,2,4,'#ddc080');R(g,x-2,y-2,w+4,4,'#c3a376');R(g,x,y+h-4,w,4,'#654c34');
}
function stool(g,x,y){R(g,x-9,y-4,18,6,'#9a794e');R(g,x-10,y-5,20,3,'#c3a46d');for(const px of [x-7,x+5])R(g,px,y+2,3,15,'#70553a');R(g,x-6,y+11,13,2,'#80633e');}
function bedside(g,x,y){cabinet(g,x,y,30,27,'#9f8055');R(g,x+4,y+7,22,1,'#5c4c34');R(g,x+13,y+10,4,2,'#d7bf8c');R(g,x+5,y-5,8,3,'#ded6b8');R(g,x+7,y-9,6,5,'#a9854e');lamp(g,x+22,y-14,true);}
function bed(g,b,index){
 const {x,y,w,h}=b,c=['#946653','#587a89','#6b7d50','#89718c'][index%4];shadow(g,x-2,y+5,w+6,h);
 R(g,x-4,y-12,w+8,24,'#705036');R(g,x-2,y-12,w+4,4,'#b58c5c');R(g,x+2,y-6,w-4,15,'#8c6743');for(let xx=x+8;xx<x+w-6;xx+=11)R(g,xx,y-4,1,10,'#c4a16b44');
 R(g,x,y,w,h,'#5c4732');R(g,x+3,y+4,w-6,h-8,'#d1ccb2');R(g,x+4,y+5,w-8,19,'#e8e3ce');R(g,x+9,y+8,w-18,12,'#f5eed8');R(g,x+12,y+11,w-25,2,'#fff5dc');
 R(g,x+3,y+28,w-6,h-34,c);R(g,x+3,y+28,w-6,5,'#ded6b9');R(g,x+4,y+34,w-8,2,'#f0e3bf77');for(let yy=y+42;yy<y+h-6;yy+=11){R(g,x+4,yy,w-8,1,'#f0e3bf33');R(g,x+13,yy-6,2,4,'#f0e3bf22');R(g,x+w-16,yy-6,2,4,'#302f2633');}
 R(g,x-4,y+h-5,w+8,11,'#7e5b3b');R(g,x-4,y+h-5,w+8,3,'#bb9260');R(g,x,y+h+6,5,5,'#573f2c');R(g,x+w-5,y+h+6,5,5,'#573f2c');
}

function bedroom(g,x,w,index){
 const y=151;R(g,x,y,w,228,'#3c3d2c');boards(g,x+4,y+3,w-8,82,true);boards(g,x+4,234,w-8,140);
 R(g,x+5,231,w-10,7,'#72583c');R(g,x+6,231,w-12,2,'#d4b785');R(g,x+4,372,w-8,6,'#634d37');
 for(let xx=x+16;xx<x+w-5;xx+=18)R(g,xx,164,1,61,'#d5be8f33');
 const curtains=['#8c6f5c','#617d73','#78815b','#8a7080'][index];windowArt(g,x+w/2-24,172,48,50,curtains);
 frame(g,x+15,182,29,31,['#7a8660','#668681','#7d8d5e','#80846a'][index]);
 if(index===0){R(g,x+w-49,179,34,4,'#795e3f');R(g,x+w-47,183,30,24,'#dfcda0');text(g,'17',x+w-32,198,'#7c5540',10,'center');R(g,x+w-46,179,28,3,'#9b654c');}
 else if(index===1){R(g,x+w-57,209,44,4,'#876443');plant(g,x+w-42,199);R(g,x+w-25,193,9,16,'#b3a273');R(g,x+w-23,195,5,9,'#6f8c4c');}
 else if(index===2){R(g,x+w-49,181,33,31,'#b6b89b');R(g,x+w-47,183,29,27,'#dee0c1');R(g,x+w-35,187,6,18,'#8a9b71');R(g,x+w-41,193,18,6,'#8a9b71');}
 else{R(g,x+w-55,181,42,33,'#6c563b');R(g,x+w-52,184,36,27,'#bcac81');P(g,[[x+w-48,207],[x+w-43,191],[x+w-34,198],[x+w-23,188],[x+w-18,202]],'#7a8a67');R(g,x+w-38,190,2,18,'#b18555');R(g,x+w-51,201,32,1,'#8a764f');}
 cabinet(g,x+w-52,218,36,39,'#80664b');R(g,x+w-46,209,18,7,'#8c6e47');R(g,x+w-45,209,16,2,'#c2a773');
 const bx=INTERIOR_BEDS[index*2];rug(g,x+16,350,w-32,17,'#7e6650','#ba9c6d');bed(g,bx,index*2);bed(g,INTERIOR_BEDS[index*2+1],index*2+1);bedside(g,x+91,310);
 R(g,x+12,243,26,6,'#755b3e');for(let i=0;i<5;i++)R(g,x+14+i*4,233+(i%2)*2,3,10,['#95845d','#6a8175','#bd9a67','#80636c','#b6ad86'][i]);
 // Shoes, a folded blanket and a hanging coat make each room look occupied.
 R(g,x+9,359,10,4,'#514c38');R(g,x+21,359,10,4,'#6b5b3e');R(g,x+w-32,274,9,15,curtains);R(g,x+w-34,273,13,3,'#9b8a61');R(g,x+w-28,267,1,6,'#4d4934');
 text(g,['WEST ROOM','GARDEN ROOM','EAST ROOM','LOFT ROOM'][index],x+12,163,'#695b42',7);
}

function pantryFrame(g){
 cabinet(g,442,439,122,140,'#866944');R(g,448,446,110,121,'#493f2f');R(g,451,449,104,114,'#665338');
 for(let i=0;i<4;i++){R(g,448,470+i*29,110,5,'#ab8757');R(g,448,470+i*29,110,1,'#d8b77b');}
 R(g,444,433,118,5,'#c8a36c');R(g,454,426,23,7,'#938058');R(g,457,423,18,3,'#c6b17a');R(g,521,423,26,10,'#9a7850');R(g,523,423,22,2,'#c9a46d');
 R(g,449,570,109,15,'#6b5238');text(g,'PANTRY',503,581,'#d7bd86',8,'center');
}
function kitchen(g){
 const x=100;boards(g,x,416,474,89,true);R(g,x,504,474,173,'#c0ad84');
 for(let yy=506;yy<678;yy+=16)for(let xx=x;xx<574;xx+=16){R(g,xx,yy,15,15,((xx-x)/16+(yy-506)/16)%2?'#bba67e':'#d1bf96');R(g,xx+1,yy+1,13,1,'#e4d4ae44');}
 R(g,x,497,474,7,'#685239');R(g,x,497,474,2,'#d7bb84');
 for(let yy=442;yy<496;yy+=12)for(let xx=109+(Math.floor(yy/12)%2)*6;xx<432;xx+=20){R(g,xx,yy,18,10,'#d2c5a1');R(g,xx,yy,18,1,'#eee0b8');}
 cabinet(g,117,428,115,43,'#87714d');cabinet(g,246,428,108,43,'#8b7651');
 for(const xx of [129,156,185]){R(g,xx,444,14,13,'#3d483d');R(g,xx+2,446,10,9,'#8da18b');R(g,xx+3,447,3,3,'#cbd1ad');}R(g,264,442,71,2,'#dacda733');
 cabinet(g,204,492,221,43,'#91a085');R(g,200,487,230,7,'#b5b7a0');R(g,202,487,226,2,'#e7dfbd');
 R(g,220,491,49,17,'#4d615c');R(g,224,493,41,12,'#7c9389');R(g,229,495,28,2,'#afbfac');R(g,244,476,4,17,'#8a9d90');R(g,242,475,12,3,'#c0c8b0');R(g,252,478,3,7,'#8a9d90');
 R(g,287,482,38,10,'#b99d67');R(g,290,480,33,3,'#dbc08a');R(g,294,479,14,3,'#d59a50');R(g,307,477,2,5,'#6b8a4c');R(g,317,473,3,15,'#b0b9a1');R(g,315,473,7,3,'#e5debe');
 for(const xx of [346,364,383]){R(g,xx,477,12,13,'#b5bd9a');R(g,xx+2,478,8,9,'#dfdab5');R(g,xx+11,479,3,7,'#b5bd9a');}
 R(g,407,457,4,32,'#8e7652');R(g,395,455,28,3,'#aa9162');for(const xx of [397,407,418]){R(g,xx,458,2,9,'#564a36');R(g,xx-2,466,6,7,'#626b58');}
 // Cast-iron range with an oven, burner rings and a wall pipe.
 shadow(g,118,507,72,132);R(g,115,512,77,118,'#34443b');R(g,115,512,77,8,'#75806a');R(g,119,525,69,7,'#4d5c4a');for(const xx of [127,146,166,181]){R(g,xx,524,5,5,'#b6a77e');R(g,xx+1,525,2,2,'#383f31');}
 R(g,124,545,59,64,'#212f29');R(g,127,548,53,57,'#56614b');R(g,133,557,41,34,'#29392d');R(g,137,561,33,22,'#9d663d');R(g,142,568,23,10,'#d79b52');R(g,130,541,47,4,'#b5b493');R(g,119,617,7,16,'#28372e');R(g,180,617,7,16,'#28372e');
 R(g,134,420,13,83,'#465246');R(g,134,420,3,83,'#79816b');R(g,131,436,19,5,'#899077');R(g,131,473,19,5,'#899077');R(g,129,415,23,5,'#9f9f7d');
 R(g,121,509,22,4,'#202e28');R(g,158,509,24,4,'#202e28');R(g,126,498,28,12,'#7d8872');R(g,128,496,24,4,'#c2c6a7');R(g,124,501,4,5,'#c2c6a7');R(g,152,501,4,5,'#a0a78e');
 pantryFrame(g);rug(g,232,558,298,110,'#8a704b','#c6ab73');
 // Water casks stay in the kitchen, beside the pantry.
 for(const [bx,by] of [[535,610],[541,572]]){R(g,bx,by,28,44,'#5d7159');R(g,bx+2,by,24,4,'#9ca183');R(g,bx+4,by+4,3,35,'#8b9471');R(g,bx-1,by+9,30,3,'#364c3c');R(g,bx-1,by+31,30,3,'#364c3c');}
 plant(g,424,478,true);R(g,203,541,18,7,'#bba87a');R(g,208,536,10,6,'#9d7b51');
 text(g,'KITCHEN & DINING',358,429,'#675740',7);
}

function sofaBack(g){
 shadow(g,745,562,195,68);R(g,745,556,190,56,'#624735');R(g,749,559,182,48,'#7f6047');for(let i=0;i<3;i++){R(g,752+i*59,562,55,36,'#947054');R(g,754+i*59,563,51,2,'#b08c63');R(g,778+i*59,570,2,12,'#604b3a44');}R(g,744,553,192,6,'#a17c55');
}
function sofaFront(g){
 R(g,746,608,188,18,'#7d5b43');R(g,748,608,184,3,'#bb9567');R(g,738,576,13,53,'#76553e');R(g,930,576,13,53,'#76553e');R(g,738,575,13,5,'#b38b5d');R(g,930,575,13,5,'#b38b5d');R(g,750,625,7,9,'#4f4232');R(g,921,625,7,9,'#4f4232');
}
function living(g){
 boards(g,710,416,470,89,true);boards(g,710,505,470,173);R(g,710,498,470,7,'#68543c');R(g,710,498,470,2,'#c3aa7d');
 windowArt(g,752,435,77,62,'#6f826c');P(g,[[760,501],[807,501],[915,651],[798,651]],'#edcc8b17');
 cabinet(g,853,471,135,53,'#88704c');R(g,863,452,61,21,'#544a34');R(g,866,454,55,15,'#987e50');R(g,870,457,32,9,'#2c3c30');for(let xx=872;xx<901;xx+=4)R(g,xx,458,1,7,'#94a27a');R(g,909,459,5,5,'#d3bb7d');R(g,875,438,1,15,'#6f7b65');R(g,873,437,5,2,'#a2aa8c');
 frame(g,946,432,30,31,'#7d8b69');frame(g,863,420,38,27,'#809480');R(g,979,461,13,11,'#d8c7a1');R(g,982,458,7,4,'#baa477');
 rug(g,741,582,288,85,'#756b5c','#c0ad7e');sofaBack(g);
 // Books, maps and a side table give the survivors something to come home to.
 R(g,725,537,25,24,'#5b4c36');R(g,725,537,25,3,'#b49567');lamp(g,737,524);R(g,724,563,25,4,'#6c583e');
 R(g,963,567,62,65,'#4f6250');R(g,968,560,52,26,'#7f8a68');R(g,971,562,46,3,'#b2b18a');R(g,968,591,52,26,'#6c7f5d');R(g,962,586,8,41,'#455a45');R(g,1018,586,8,41,'#455a45');R(g,967,628,6,8,'#4d4835');R(g,1014,628,6,8,'#4d4835');
 const fx=1063;R(g,fx+9,416,91,215,'#766f5c');for(let row=0;row<14;row++)for(let col=0;col<5;col++){const xx=fx+12+col*18+(row%2)*-8,yy=420+row*14;if(xx<fx+10||xx+16>fx+100)continue;R(g,xx,yy,16,12,(row+col)%3?'#928977':'#a0967e');R(g,xx+1,yy,14,1,'#c2b49b55');}
 R(g,fx-4,498,116,12,'#6c4f36');R(g,fx-8,495,124,5,'#b28d61');R(g,fx+8,518,94,133,'#a09279');R(g,fx+15,526,80,120,'#4a4232');R(g,fx+22,533,66,111,'#292e24');P(g,[[fx+12,651],[fx+104,651],[fx+113,665],[fx+1,665]],'#9f967c');R(g,fx+1,665,112,4,'#605f4a');
 R(g,fx+40,477,30,17,'#63533a');R(g,fx+44,480,22,12,'#d2bd8c');R(g,fx+54,482,2,6,'#5c533b');R(g,fx+55,487,6,1,'#5c533b');for(const px of [fx+7,fx+89]){R(g,px,483,10,12,'#bfa986');R(g,px+3,478,4,6,'#e6c47e');}frame(g,fx+36,437,39,30,'#83916b');
 for(let i=0;i<5;i++){const xx=1148+(i%2)*13,yy=636-Math.floor(i/2)*10;R(g,xx,yy,20,9,'#695037');R(g,xx,yy+1,6,7,'#b79865');R(g,xx+2,yy+2,2,3,'#75593a');}
 plant(g,1043,495,true);text(g,'THE COMMON ROOM',721,429,'#675740',8);
}

function stairs(g){
 const l=INTERIOR_LAYOUT;R(g,582,150,120,526,'#4b4532');boards(g,589,154,106,219,true);R(g,589,369,106,14,'#8d7552');R(g,589,369,106,3,'#d4b582');
 windowArt(g,621,179,41,48,'#7e8468');frame(g,601,261,32,33,'#788566');R(g,654,281,21,33,'#68583d');R(g,656,283,17,28,'#d6bf91');for(let i=0;i<4;i++)R(g,659,288+i*5,10+(i%2)*3,1,'#8e7b55');
 P(g,[[602,370],[665,370],[685,654],[618,654]],'#413c2e');
 for(let i=0;i<15;i++){const yy=375+i*18,xx=600+i*1.15;R(g,xx,yy,67,16,'#745a3c');R(g,xx,yy,67,4,'#b29462');R(g,xx+2,yy+4,63,1,'#d4b67c');R(g,xx+4,yy+11,59,1,'#5d4c35');}
 for(let i=0;i<9;i++){const yy=373+i*33;R(g,593+i*1.3,yy,4,36,'#987d50');R(g,593+i*1.3,yy,2,36,'#d1b17a');R(g,671+i*1.2,yy,4,36,'#806b46');}
 P(g,[[589,365],[595,365],[616,654],[610,654]],'#c6a775');P(g,[[669,365],[675,365],[692,654],[686,654]],'#b09260');
 for(const px of [582,696]){R(g,px,146,7,532,'#5f4d35');R(g,px,146,2,532,'#ae9165');}R(g,590,675,105,5,'#b29364');rug(g,620,655,66,14,'#5e6b53','#b5a775');
}

function backdrop(g){
 R(g,0,0,W,H,'#263c30');const sky=g.createLinearGradient(0,90,0,H);sky.addColorStop(0,'#5d7270');sky.addColorStop(.5,'#a58a6b');sky.addColorStop(1,'#354b37');g.fillStyle=sky;g.fillRect(0,0,W,H);
 // A restrained outline of the landscape keeps the cutaway grounded in the farm.
 for(let i=0;i<20;i++){const x=i*71-20,y=430+(i%3)*22;P(g,[[x-30,y],[x,y-110-(i%4)*12],[x+30,y]],'#294b3d55');P(g,[[x-37,y+40],[x,y-40],[x+37,y+40]],'#24433355');}
 shadow(g,80,140,1120,552);R(g,80,137,1120,549,'#574a35');R(g,81,139,1118,6,'#d2b17b');R(g,85,141,1110,541,'#6d573d');
 // Roof ridge, dormer trim and cut timber around the open front.
 P(g,[[74,139],[192,112],[1088,112],[1206,139]],'#4b5d4c');for(let yy=118;yy<139;yy+=6)R(g,130-(yy-118)*2,yy,1020+(yy-118)*4,1,'#263e333d');R(g,73,137,1134,6,'#a77a4e');R(g,73,137,1134,2,'#d1a974');
 for(const [x,index] of [[100,0],[340,1],[706,2],[946,3]])bedroom(g,x,234,index);
 kitchen(g);living(g);stairs(g);
 for(const px of [86,331,572,704,937,1185]){R(g,px,145,8,239,'#645035');R(g,px,145,2,239,'#b59869');R(g,px+1,150,6,3,'#d1b17e');}
 for(const [x,w] of [[86,496],[702,492]]){R(g,x,383,w,15,'#57432e');R(g,x,383,w,3,'#bd9a68');R(g,x,397,w,6,'#3c3e2c');for(let xx=x+8;xx<x+w-6;xx+=37){R(g,xx,387,20,1,'#c3a57533');R(g,xx+5,391,2,2,'#352f25');}}
 for(const px of [87,574,702,1186]){R(g,px,403,8,277,'#70563a');R(g,px,403,2,277,'#b49465');}
 R(g,83,677,1116,10,'#72563a');R(g,83,677,1116,3,'#ba9562');for(let xx=91;xx<1190;xx+=31){R(g,xx,681,1,6,'#443a2c');R(g,xx+6,681,2,1,'#d4b68155');}R(g,88,687,1106,7,'#615d47');R(g,94,694,1094,5,'#454b3b');
}

function jar(g,x,y,color){R(g,x,y,9,12,'#3d453333');R(g,x+1,y+1,7,10,color);R(g,x,y-2,9,3,'#c8b482');R(g,x+2,y+3,2,5,'#f2e9ba44');R(g,x+1,y+10,7,1,'#3b432c44');}
function supplies(g,s){
 const stock=[clamp(Math.ceil(s.food),0,16),clamp(Math.ceil(s.homestead?.pantry||0),0,16),clamp(Math.ceil(s.homestead?.meals||0),0,16)];
 stock.forEach((count,row)=>{for(let i=0;i<count;i++)jar(g,454+(i%8)*12,457+row*29-Math.floor(i/8)*5,['#c89750','#9b6549','#acb064'][(i+row)%3]);});
 text(g,'FOOD  '+s.food,454,556,'#e1c997',7);R(g,541,610,18,3,'#496e69');R(g,542,611,clamp(s.water/Math.max(1,s.waterCap),0,1)*16,1,'#a4c8b1');
}
function sitting(renderer,g,p,x,y,t,back=false){
 g.save();g.translate(x,y);g.scale(1.85,1.85);renderer.person(g,{...p,x:0,y:0,angle:back?-Math.PI/2:Math.PI/2,moving:false,panic:false,hurt:0,hammering:false,swing:0,flash:0,bubble:'',tool:null,job:'rest'},t,{noLabel:true});g.restore();
}
function table(g){
 shadow(g,242,583,287,46);R(g,244,584,284,34,'#927048');for(let yy=587;yy<617;yy+=9){R(g,247,yy,278,1,'#c3a46c');R(g,249,yy+1,272,1,'#6c5338');}R(g,241,582,290,5,'#c6a472');R(g,242,616,288,8,'#6c5034');R(g,242,616,288,2,'#d1ad76');for(const px of [251,511]){R(g,px,624,7,39,'#684e33');R(g,px,624,2,35,'#a07d51');}
 R(g,360,582,39,39,'#d3c49b');for(let yy=585;yy<620;yy+=6)R(g,363,yy,33,1,'#8d956b77');R(g,370,590,19,8,'#b7a87b');R(g,372,588,15,4,'#ded1a7');R(g,376,586,7,3,'#e8cd78');
}
function breakfast(renderer,g,s,people,t,motion){
 people.forEach((p,index)=>{const i=p.houseSeat??index;const x=272+(i%4)*66,y=i<4?584:654;stool(g,x,y+4);if(i<4)sitting(renderer,g,p,x,y,t);});table(g);
 people.forEach((p,index)=>{const i=p.houseSeat??index;const x=272+(i%4)*66,y=i<4?591:609;R(g,x-10,y-2,21,7,'#ddd9be');R(g,x-7,y-3,15,5,'#efead1');R(g,x-4,y-5,9,4,'#d4a15c');R(g,x+15,y-7,7,9,'#c6c9ac');R(g,x+16,y-6,4,5,'#f2e7bd');if(i>=4)sitting(renderer,g,p,x,654,t,true);
  text(g,p.name,x,i<4?525:685,'#f0e2bd',9,'center');
  if(motion&&i<4){const phase=Math.sin(t*1.7+i*1.3),handY=phase>.3?551:577;R(g,x+16,handY,5,7,LOOKS[p.look%LOOKS.length]?.skin||'#c7ac7a');R(g,x+14,handY-2,8,2,'#c5cbb0');}
 });
}
function patients(g,people,t,s){
 people.slice(0,8).forEach((p,i)=>{const assigned=s.house?.beds.indexOf(p.id),bedIndex=assigned>=0?assigned:i,b=INTERIOR_BEDS[bedIndex],look=LOOKS[p.look%LOOKS.length]||LOOKS[0];R(g,b.x+19,b.y+7,24,20,look.skin);R(g,b.x+19,b.y+6,24,6,look.hair);if(!p.houseNap)R(g,b.x+18,b.y+14,26,5,'#f0e8ce');R(g,b.x+22,b.y+21,3,1,'#5e5340');R(g,b.x+35,b.y+21,3,1,'#5e5340');R(g,b.x+10,b.y+29,42,18,look.shirt);R(g,b.x+6,b.y+42,50,38,['#946653','#587a89','#6b7d50','#89718c'][bedIndex%4]);R(g,b.x+6,b.y+42,50,4,'#d8d2b7');
  if(!p.houseNap){R(g,b.x+19,b.y-27,24,7,'#374c36');R(g,b.x+20,b.y-26,22*clamp(p.hp/p.maxHp,0,1),5,'#a4b77d');}text(g,p.name,b.x+31,b.y-32,'#ecdcb4',8,'center');text(g,'RESTING',b.x+31,b.y+76,'#e9ddbd',6,'center');
 });
}
function commonRoom(renderer,g,s,waiting,hungry,t){
 const seat=(p,index)=>{const i=p.houseCommonSeat??index,x=i<4?767+i*47:757+(i-4)*63,y=i<4?607:655;if(i>=4)stool(g,x,y+4);sitting(renderer,g,p,x,y,t);text(g,p.name,x,i<4?548:685,'#f0e2bd',9,'center');};
 waiting.forEach((p,i)=>{if((p.houseCommonSeat??i)<4)seat(p,i);});sofaFront(g);waiting.forEach((p,i)=>{if((p.houseCommonSeat??i)>=4)seat(p,i);});
 R(g,839,635,113,8,'#b39261');R(g,837,633,117,4,'#d0ad75');for(const px of [846,939])R(g,px,643,5,19,'#70543a');R(g,864,626,27,7,'#9c8663');R(g,866,625,23,2,'#d7cca4');R(g,910,625,11,9,'#d1c7a4');R(g,921,627,3,5,'#c2b394');
 if(waiting.length)text(g,waiting.some(p=>hungry.has(p.name))?'WAITING FOR A MEAL':'TAKING A MOMENT',835,530,'#dec590',8,'center');
 s.dogs.forEach((dog,i)=>{const x=1014+i*37,y=658;R(g,x,y-11,30,10,i?'#676150':'#a87548');R(g,x+23,y-15,12,10,i?'#77705b':'#bd8a55');R(g,x+31,y-11,6,4,'#5f4933');R(g,x+26,y-17,5,5,'#5a4933');R(g,x+1,y-4,8,4,'#664d36');});
}
function atmosphere(g,t,motion,quality){
 const flame=motion?Math.sin(t*8)*3:1,fx=1108;R(g,1087,637,52,5,'#705337');R(g,1092,633,42,4,'#a6804e');P(g,[[1089,639],[1092,616-flame],[1101,625],[1108,603+flame],[1116,621],[1129,612-flame],[1138,639]],'#c9803d');P(g,[[1099,639],[1103,623],[1110,614-flame],[1117,629],[1128,639]],'#e7b65a');R(g,1108,630,10,9,'#f4d68c');
 const light=g.createRadialGradient(fx,625,8,fx,625,quality==='balanced'?126:180);light.addColorStop(0,'#f2b85a25');light.addColorStop(1,'#f2b85a00');g.fillStyle=light;g.fillRect(fx-180,445,360,245);
 if(motion){for(let i=0;i<3;i++){const p=(t*.36+i/3)%1;g.globalAlpha=(1-p)*.22;R(g,137+Math.sin(t+i)*4,493-p*31,4+p*7,3+p*5,'#e3debd');}g.globalAlpha=1;}
}

export function drawFarmhouseInterior(renderer,s,t){
 const g=renderer.ctx;renderer.setTransform(g,1,0,0,1,0,0);g.imageSmoothingEnabled=false;let cache=caches.get(renderer);
 if(!cache){cache=renderer.canvas.ownerDocument.createElement('canvas');cache.width=W;cache.height=H;const cg=cache.getContext('2d');cg.imageSmoothingEnabled=false;backdrop(cg);caches.set(renderer,cache);}
 g.clearRect(0,0,W,H);g.drawImage(cache,0,0);const people=interiorOccupants(s),motion=!renderer.reducedMotion&&renderer.ambient!==false;
 let clock=roomClocks.get(renderer);if(!clock||clock.state!==s||clock.day!==s.day){clock={state:s,day:s.day,start:t,serial:s.house?.activity?.serial,actionStart:-Infinity};roomClocks.set(renderer,clock);}if(clock.serial!==s.house?.activity?.serial){clock.serial=s.house?.activity?.serial;clock.actionStart=t;}
 const plan=houseScenePlan(s,people,Math.max(0,t-clock.start),motion,INTERIOR_BEDS,t-clock.actionStart);
 drawHouseFurnishings(g,s,INTERIOR_BEDS);supplies(g,s);patients(g,plan.resting,t,s);breakfast(renderer,g,s,plan.dining,t,motion);commonRoom(renderer,g,s,plan.waiting,people.hungry,t);drawHouseActivities(renderer,g,plan,t,motion);atmosphere(g,t,motion,renderer.quality);
}
