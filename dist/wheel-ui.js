// One owner for the morning wheel, including loaded results and interrupted spins.
export function installMorningWheel({game,sync,focusGame,unlockAudio,beep,document:doc=document,window:win=window}) {
 const $=id=>doc.getElementById(id),dialog=$('wheel-dialog'),wheel=$('wheel');
 let angle=0,spinning=false,timer=null,frame=null,transition=null;
 function stop(){
  spinning=false;
  if(timer!==null)win.clearTimeout(timer);
  if(frame!==null)win.cancelAnimationFrame(frame);
  if(transition){wheel.removeEventListener('transitionend',transition);wheel.removeEventListener('transitioncancel',transition);}
  timer=frame=transition=null;
 }
 function showResult(result){
  $('wheel-result').textContent=result.text;
  $('wheel-result').classList.toggle('win',result.id==='upgrade');
  $('wheel-spin').hidden=true;
  $('wheel-continue').hidden=false;
  $('wheel-continue').focus();
 }
 function open(){
  if(dialog.open)return;
  stop();
  $('wheel-day').textContent=`DAY ${game.s.day+1}`;
  $('wheel-result').textContent='';$('wheel-result').classList.remove('win');
  $('wheel-spin').hidden=false;$('wheel-spin').disabled=false;$('wheel-continue').hidden=true;
  dialog.showModal();
  if(game.s.wheel?.result)showResult(game.s.wheel.result);
  else $('wheel-spin').focus();
 }
 $('wheel-spin').addEventListener('click',()=>{
  if(spinning)return;
  unlockAudio();
  const result=game.spinWheel();if(!result)return;
  spinning=true;$('wheel-spin').disabled=true;
  const land=()=>{
   if(!spinning)return;
   stop();
   if(!dialog.open||game.s.mode!=='wheel'||game.s.wheel?.result!==result)return;
   showResult(result);beep(result.id==='upgrade'?'jackpot':'buy');sync();
  };
  transition=e=>{if(e.target===wheel&&e.propertyName==='transform')land();};
  wheel.addEventListener('transitionend',transition);wheel.addEventListener('transitioncancel',transition);
  const center=result.index*90+45,jitter=(Math.random()-.5)*50;
  angle+=360*6+((360-center-angle%360)+720)%360+jitter;
  wheel.style.transform=`rotate(${angle}deg)`;
  const style=win.getComputedStyle(wheel),seconds=s=>s.trim().endsWith('ms')?parseFloat(s)/1000:parseFloat(s);
  const durations=style.transitionDuration.split(',').map(seconds),delays=style.transitionDelay.split(',').map(seconds);
  const duration=Math.max(0,...style.transitionProperty.split(',').map((p,i)=>['all','transform'].includes(p.trim())?(durations[i%durations.length]||0)+(delays[i%delays.length]||0):0));
  if(win.matchMedia('(prefers-reduced-motion: reduce)').matches||duration===0){land();return;}
  // A hidden tab, cancelled transition or missing browser event must never block breakfast.
  timer=win.setTimeout(land,duration*1000+250);
  let lastSlice=-1;
  const tick=()=>{
   if(!spinning)return;
   const m=win.getComputedStyle(wheel).transform,values=m==='none'?[]:m.slice(m.indexOf('(')+1,-1).split(',').map(Number);
   const slice=Math.floor(((Math.atan2(values[1]||0,values[0]??1)*180/Math.PI+360)%360)/45);
   if(slice!==lastSlice){lastSlice=slice;beep('tick');}
   frame=win.requestAnimationFrame(tick);
  };
  frame=win.requestAnimationFrame(tick);
 });
 $('wheel-continue').addEventListener('click',()=>{if(!spinning&&game.s.wheel?.result)dialog.close();});
 dialog.addEventListener('cancel',e=>{if(!game.s.wheel?.result||spinning)e.preventDefault();});
 dialog.addEventListener('close',()=>{
  stop();
  if(game.s.mode==='wheel'&&game.s.wheel?.result)game.openHouse();
  focusGame();sync();
 });
 return {open};
}
