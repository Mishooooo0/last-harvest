import assert from 'node:assert/strict';
import {installMorningWheel} from './dist/wheel-ui.js';
import {ColonyEngine} from './dist/colony.js';

class Element extends EventTarget {
 constructor(id){super();this.id=id;this.style={};this.hidden=false;this.open=false;this.classList={toggle(){},remove(){}};}
 focus(){} showModal(){this.open=true;} close(){this.open=false;this.dispatchEvent(new Event('close'));}
 click(){this.dispatchEvent(new Event('click'));}
}
function setup({reduced=false,duration='4.2s',delay='0s'}={}){
 const ids=['wheel-dialog','wheel','wheel-day','wheel-result','wheel-spin','wheel-continue'],els=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
 const timers=new Map(),frames=new Map();let serial=0;
 const win={setTimeout(fn,ms){timers.set(++serial,{fn,ms});return serial;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(fn){frames.set(++serial,fn);return serial;},cancelAnimationFrame(id){frames.delete(id);},matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({transform:'none',transitionProperty:'transform',transitionDuration:duration,transitionDelay:delay})};
 const game=new ColonyEngine();game.start(true);game.s.mode='journal';game.closeJournal();let payments=0;const spin=game.spinWheel.bind(game);game.spinWheel=()=>{const result=spin();if(result)payments++;return result;};
 const ui=installMorningWheel({game,sync(){},focusGame(){},unlockAudio(){},beep(){},document:{getElementById:id=>els[id]},window:win});
 const next=()=>{game.s.mode='journal';game.s.day++;game.closeJournal();ui.open();};
 ui.open();return {game,els,ui,timers,frames,next,payments:()=>payments};
}
function transition(el,type='transitionend',propertyName='transform'){const e=new Event(type);e.propertyName=propertyName;el.dispatchEvent(e);}
{
 const t=setup();t.els['wheel-spin'].click();assert(t.els['wheel-continue'].hidden);t.els['wheel-continue'].click();assert(t.els['wheel-dialog'].open);
 transition(t.els.wheel,'transitionend','opacity');assert(t.els['wheel-continue'].hidden);
 transition(t.els.wheel);assert(!t.els['wheel-continue'].hidden);assert.equal(t.timers.size,0);assert.equal(t.frames.size,0);
 t.els['wheel-continue'].click();assert(['house','prompt'].includes(t.game.s.mode));
 for(let i=0;i<3;i++){t.next();t.els['wheel-spin'].click();transition(t.els.wheel);t.els['wheel-continue'].click();}
 assert.equal(t.payments(),4);console.log('PASS consecutive morning spins, early Continue blocked, transform completion and cleanup');
}
for(const kind of ['transitioncancel','timeout','closed']){
 const t=setup();t.els['wheel-spin'].click();
 if(kind==='timeout'){const pending=[...t.timers.values()][0];assert.equal(pending.ms,4450);pending.fn();}
 else if(kind==='closed')t.els['wheel-dialog'].close();else transition(t.els.wheel,kind);
 if(kind!=='closed'){assert(!t.els['wheel-continue'].hidden);t.els['wheel-continue'].click();}
 t.next();t.els['wheel-spin'].click();transition(t.els.wheel);assert(!t.els['wheel-continue'].hidden);assert.equal(t.payments(),2);
 console.log(`PASS ${kind} cannot lock the next wheel or duplicate its reward`);
}
for(const options of [{reduced:true},{duration:'0s'}]){
 const t=setup(options);t.els['wheel-spin'].click();assert(!t.els['wheel-continue'].hidden);assert.equal(t.timers.size+t.frames.size,0);console.log('PASS immediate landing for '+JSON.stringify(options));
}
{
 const t=setup();const result=t.game.spinWheel(),scrap=t.game.s.scrap;t.els['wheel-dialog'].open=false;t.ui.open();assert.equal(t.els['wheel-result'].textContent,result.text);assert(t.els['wheel-spin'].hidden);assert(!t.els['wheel-continue'].hidden);assert.equal(t.game.s.scrap,scrap);assert.equal(t.payments(),1);console.log('PASS a restored wheel result continues without a second reward');
}
