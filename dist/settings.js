// Settings window (Update 22): graphics, sound and interface choices, kept in this browser.
// The graphics quality picker is Codex's control from graphics.js; it is placed in #settings-graphics.
const KEY='last-harvest-settings';
export const DEFAULT_SETTINGS=Object.freeze({shake:true,ambient:true,sound:true,volume:60,hudOpen:false,cheats:false});

export function loadSettings(){
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return {...DEFAULT_SETTINGS,...(saved&&typeof saved==='object'?saved:{})};}
 catch{return {...DEFAULT_SETTINGS};}
}
export function saveSettings(settings){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}}

export function installSettings({settings,renderer,setSound,setVolume,setHudOpen,fullscreen,onOpen,onClose}){
 const $=id=>document.getElementById(id),dialog=$('settings-dialog');if(!dialog)return null;
 const shake=$('set-shake'),ambient=$('set-ambient'),sound=$('set-sound'),volume=$('set-volume'),out=$('set-volume-out'),hudOpen=$('set-hud-open');
 const save=()=>saveSettings(settings);
 const applyRenderer=()=>{renderer.shakeOn=settings.shake;renderer.ambient=settings.ambient;};
 // Ambient effects only draw on High quality, so the switch is greyed out on Balanced.
 const syncAmbient=()=>{const off=renderer.quality==='balanced';ambient.disabled=off;ambient.closest('label').classList.toggle('disabled',off);};
 const show=()=>{shake.checked=settings.shake;ambient.checked=settings.ambient;sound.checked=settings.sound;volume.value=settings.volume;out.textContent=`${settings.volume}%`;hudOpen.checked=settings.hudOpen;syncAmbient();};
 applyRenderer();
 shake.addEventListener('change',()=>{settings.shake=shake.checked;applyRenderer();save();});
 ambient.addEventListener('change',()=>{settings.ambient=ambient.checked;applyRenderer();save();});
 sound.addEventListener('change',()=>setSound(sound.checked));
 volume.addEventListener('input',()=>{settings.volume=Number(volume.value);out.textContent=`${settings.volume}%`;setVolume(settings.volume);save();});
 hudOpen.addEventListener('change',()=>{settings.hudOpen=hudOpen.checked;setHudOpen(hudOpen.checked);save();});
 dialog.addEventListener('change',e=>{if(e.target.id==='graphics-quality')syncAmbient();});
 $('set-fullscreen').addEventListener('click',fullscreen);
 const close=()=>dialog.close();
 $('settings-close').addEventListener('click',close);
 $('settings-done').addEventListener('click',close);
 dialog.addEventListener('close',()=>onClose?.());
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 const open=()=>{if(dialog.open)return;show();onOpen?.();dialog.showModal();};
 return {open,show,close};
}
