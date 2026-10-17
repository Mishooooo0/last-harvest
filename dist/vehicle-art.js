// Pixel-art vehicles face right in the same raised side view as the survivors.
// Drawing stays inside the supplied footprint, except for the existing soft ground shadow.
const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
const shape=(g,points,c)=>{g.fillStyle=c;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
const CAR_PAINTS=[{body:'#657e86',top:'#8fa3a2',side:'#465c64',edge:'#bec6b1'},{body:'#7f8763',top:'#a2a982',side:'#576345',edge:'#c4c6a3'},{body:'#9c6a52',top:'#c19170',side:'#70503e',edge:'#d0b58b'}];
const RUST={body:'#8b634d',top:'#b38b65',side:'#624a3c',edge:'#c1aa84'};
function tire(g,x,y,w=14,h=15){
 shape(g,[[x+3,y],[x+w-3,y],[x+w,y+3],[x+w,y+h-3],[x+w-3,y+h],[x+3,y+h],[x,y+h-3],[x,y+3]],'#202923');
 rect(g,x+2,y+3,2,h-6,'#4a5145');rect(g,x+4,y+3,w-8,h-6,'#788275');rect(g,x+5,y+4,w-10,h-8,'#adb09a');rect(g,x+w/2-1,y+h/2-1,3,3,'#4b594e');rect(g,x+w-3,y+4,2,h-8,'#141f1b');
}
function car(g,v){
 const paint=v.paint==='rust'?RUST:CAR_PAINTS[Math.abs(Math.floor(v.id||0))%CAR_PAINTS.length];
 // The far tires peek past the body. The near wheels carry its weight.
 rect(g,11,17,13,7,'#253029');rect(g,70,17,13,7,'#253029');
 shape(g,[[1,23],[5,19],[21,18],[29,6],[33,3],[59,3],[64,6],[73,18],[86,19],[91,23],[92,32],[87,38],[7,38],[1,33]],paint.body);
 shape(g,[[3,27],[89,27],[91,32],[86,38],[7,38],[2,33]],paint.side);
 shape(g,[[29,7],[33,3],[59,3],[64,7],[66,11],[27,11]],paint.top);
 rect(g,34,4,23,2,paint.edge);rect(g,8,20,15,2,paint.top);
 // Sloped rear glass, two side windows and a windscreen pillar make a cabin.
 shape(g,[[30,10],[42,10],[42,22],[24,22]],'#263e42');
 shape(g,[[46,10],[59,10],[68,22],[46,22]],'#2b484d');
 shape(g,[[31,11],[40,11],[40,15],[28,18]],'#a3c0ba');
 shape(g,[[47,11],[58,11],[61,15],[47,19]],'#93b9b6');
 rect(g,44,9,3,15,paint.body);rect(g,24,23,46,2,paint.edge);rect(g,28,25,1,10,'#304d4c66');rect(g,47,25,1,10,'#304d4c66');
 rect(g,37,26,5,2,'#c0c3a8');rect(g,59,26,5,2,'#c0c3a8');rect(g,31,34,33,2,paint.body);
 // Hood and trunk have their own top planes and seams.
 shape(g,[[71,19],[85,20],[89,23],[89,26],[73,25]],paint.top);rect(g,74,21,11,1,paint.edge);rect(g,71,26,1,7,'#314940');
 rect(g,3,24,4,5,'#ba6b4d');rect(g,1,30,5,3,'#aaa994');rect(g,87,24,4,5,'#e6d7a5');rect(g,87,30,5,3,'#b1b5a0');rect(g,85,29,4,2,'#293b34');
 // Arch highlights sit just above the rubber, rather than four rectangular corner blocks.
 for(const x of [11,68]){shape(g,[[x-2,33],[x,29],[x+4,27],[x+12,27],[x+16,31],[x+16,35],[x+13,31],[x+3,31],[x+1,35]],paint.top);tire(g,x,30,15,14);}
 rect(g,8,28,5,2,'#b0967066');rect(g,52,31,10,1,'#cbb78955');
 if(v.wrecked){shape(g,[[51,11],[54,15],[51,18],[56,22]],'#d5d9bc');rect(g,37,30,9,2,'#b07a47');rect(g,32,32,8,2,'#604a34');rect(g,78,22,7,2,'#82613e');}
 if(v.searched){
  rect(g,74,22,13,7,'#23342c');rect(g,77,23,6,3,'#63715a');rect(g,74,29,10,2,'#a49166');
  shape(g,[[72,21],[75,10],[89,14],[87,24],[86,19],[76,16],[75,22]],paint.side);rect(g,77,12,9,2,paint.top);
 }
}
function pickup(g){
 rect(g,12,23,14,8,'#253029');rect(g,70,23,13,8,'#253029');
 shape(g,[[1,20],[46,20],[51,7],[55,3],[72,3],[78,8],[80,21],[87,22],[92,27],[92,39],[86,44],[7,44],[1,38]],'#8b6547');
 shape(g,[[2,32],[90,32],[92,39],[86,44],[7,44],[2,39]],'#5d4937');
 // A recessed cargo bed with planks and tied supplies.
 rect(g,4,19,42,5,'#c2a06a');rect(g,5,24,38,11,'#344438');rect(g,7,25,34,2,'#736347');rect(g,10,28,29,1,'#92774f');rect(g,8,32,30,1,'#6f5c41');
 rect(g,4,34,41,4,'#9e7a51');rect(g,5,34,39,1,'#ccb184');rect(g,7,25,10,8,'#92764f');rect(g,10,25,2,8,'#cfb786');rect(g,24,27,14,5,'#697951');rect(g,30,26,2,8,'#bdb18b');
 shape(g,[[51,8],[55,3],[71,3],[76,8],[78,14],[49,14]],'#b18b61');rect(g,56,5,15,2,'#d0b17e');
 shape(g,[[53,11],[69,11],[74,24],[50,24]],'#253f41');shape(g,[[54,12],[67,12],[69,16],[53,21]],'#a4c0b4');rect(g,70,13,3,14,'#967452');
 rect(g,49,26,26,3,'#be9e6e');rect(g,49,30,1,10,'#413f2f');rect(g,58,30,5,2,'#ccc2a0');rect(g,43,23,4,17,'#634b35');
 shape(g,[[79,22],[87,23],[91,27],[91,30],[80,29]],'#b39464');rect(g,81,24,7,2,'#d8bc89');rect(g,88,29,4,4,'#f2d8a0');rect(g,88,35,4,4,'#a7ad95');rect(g,2,30,3,5,'#be7050');rect(g,1,38,5,3,'#b7b39b');
 for(const x of [11,68]){rect(g,x-1,34,18,4,'#ac885a');tire(g,x,36,16,16);}rect(g,28,40,33,2,'#a08055');
}
function ambulance(g,v){
 rect(g,11,20,14,7,'#263128');rect(g,69,22,13,7,'#263128');
 shape(g,[[2,5],[6,2],[50,2],[54,6],[54,12],[68,12],[75,18],[79,23],[89,24],[92,29],[91,37],[86,40],[7,40],[2,35]],'#c1c0a8');
 rect(g,6,4,43,3,'#efead4');rect(g,5,8,45,27,'#e1deca');rect(g,3,34,85,5,'#999f8d');rect(g,4,27,86,4,'#a14f40');
 rect(g,9,10,12,15,'#78908a');rect(g,11,11,8,5,'#b1c6b9');rect(g,7,9,1,24,'#b5b49e');rect(g,22,9,1,24,'#b5b49e');rect(g,17,28,3,2,'#c9c9b0');
 rect(g,32,11,5,15,'#b45545');rect(g,27,16,15,5,'#b45545');
 shape(g,[[56,15],[66,15],[74,25],[55,25]],'#2b4849');shape(g,[[57,16],[65,16],[67,20],[56,23]],'#a2bdb2');rect(g,53,27,1,10,'#929b88');rect(g,61,28,5,2,'#c7c9b0');
 rect(g,57,9,16,4,'#495e57');rect(g,58,7,6,4,'#ba5a49');rect(g,65,7,6,4,'#7899a0');rect(g,58,7,5,1,'#e7aa78');rect(g,65,7,5,1,'#b2cacc');
 rect(g,85,26,5,5,'#ede0b7');rect(g,88,33,4,4,'#b8c0aa');rect(g,3,23,3,5,'#ba6049');
 for(const x of [11,68]){rect(g,x-1,30,18,4,'#d6d4ba');tire(g,x,31,15,13);}
 if(v.searched){rect(g,7,11,12,20,'#3e5043');shape(g,[[5,10],[11,7],[11,31],[5,34]],'#babda7');rect(g,7,14,3,6,'#789b95');}
}
function tractor(g,v){
 // Large rear wheels, small front wheels, a glass cab and an exposed engine hood.
 tire(g,5,12,17,24);tire(g,69,20,12,14);
 rect(g,23,27,62,8,'#563f2b');rect(g,35,20,43,11,'#a04e39');rect(g,45,18,35,5,'#bd7650');rect(g,47,18,29,2,'#dfa577');rect(g,80,20,7,14,'#535d4c');for(let y=22;y<32;y+=3)rect(g,81,y,5,1,'#a0a58c');rect(g,82,21,3,3,'#e1d4a3');
 rect(g,59,6,4,13,'#3d4c3e');rect(g,58,5,7,3,'#87947b');rect(g,60,9,1,6,'#b4b698');
 shape(g,[[20,4],[24,1],[40,1],[44,5],[44,26],[19,26]],'#5b4c34');rect(g,18,1,28,4,'#bd7853');rect(g,20,1,24,1,'#dda879');
 rect(g,24,7,15,15,'#2a4544');shape(g,[[25,8],[38,8],[38,13],[25,20]],'#9fbbb0');rect(g,30,6,3,20,'#9b6645');rect(g,23,24,18,5,'#a75c3d');rect(g,38,25,3,8,'#be9561');rect(g,38,31,9,3,'#9e9c79');
 rect(g,9,18,24,5,'#ab613f');rect(g,10,18,22,2,'#dc9b67');tire(g,8,20,24,24);for(const [x,y] of [[10,25],[12,21],[24,22],[28,28],[25,38],[12,38]])rect(g,x,y,3,3,'#5b6650');
 tire(g,71,29,15,15);rect(g,87,32,5,3,'#8b8b69');
 if(v.searched){rect(g,47,23,25,7,'#39483a');for(let x=49;x<69;x+=5)rect(g,x,24,2,5,'#8d936c');shape(g,[[46,21],[52,12],[76,16],[73,22],[54,18],[50,23]],'#a76543');}
}

export function drawVehicle(g,v){
 const pickupBody=v.kind==='pickup',width=v.w??92,height=v.h??(pickupBody?52:44);
 g.save();g.translate(Math.round(v.x),Math.round(v.y));g.scale(width/92,height/(pickupBody?52:44));g.imageSmoothingEnabled=false;
 shape(g,[[1,30],[84,30],[98,pickupBody?45:39],[88,pickupBody?53:47],[9,pickupBody?53:47],[-1,39]],'#172c2450');
 if(pickupBody)pickup(g);else if(v.kind==='ambulance')ambulance(g,v);else if(v.kind==='tractor')tractor(g,v);else car(g,v);
 g.restore();
}
