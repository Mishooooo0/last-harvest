// Prices come from prices.json (Update 23), so they can be tuned by hand without touching the code.
// The numbers in engine.js and colony.js stay as the built-in fallback: a missing price, or a file
// with a mistake, simply leaves the built-in value in place.
import {BUILDINGS,UPGRADES,GADGETS,FENCE,SHOP} from './engine.js';
import './colony.js'; // adds the barn, clinic, radio, weapon blueprints and gate to the same tables

const SHOP_ITEMS=['ammo','seeds','heal','repair','cow'];
// Levels a farm starts with are never bought, so they have no price in the file.
const firstLevel=b=>(b.starts||0)+1;
const isPrice=v=>Number.isInteger(v)&&v>=0&&v<=100000;

// The current prices, in the file's layout. Used to write prices.json and by the tests.
export function currentPrices(){
 const levels=b=>Object.fromEntries(b.levels.map((l,i)=>[`level ${i+1}`,l.cost]).slice(firstLevel(b)-1));
 return {
  shop:Object.fromEntries(SHOP_ITEMS.map(k=>[k,SHOP[k]])),
  buildings:Object.fromEntries(Object.entries(BUILDINGS).map(([id,b])=>[id,levels(b)])),
  upgrades:Object.fromEntries(Object.entries(UPGRADES).map(([id,u])=>[id,levels(u)])),
  defenses:{...Object.fromEntries(Object.entries(GADGETS).map(([id,g])=>[id,g.cost])),fenceRepair:FENCE.repairCost},
 };
}

// Applies a parsed prices.json. Returns how many prices were set and a list of problems, each in plain words.
export function applyPrices(data){
 const warnings=[];let applied=0;
 if(!data||typeof data!=='object'||Array.isArray(data))return {applied,warnings:['The file must be one { … } object.']};
 const set=(where,value,write)=>{if(!isPrice(value)){warnings.push(`${where}: "${JSON.stringify(value)}" is not a price. Use a whole number like 25.`);return;}write(value);applied++;};
 const section=(name,fn)=>{const part=data[name];if(part===undefined)return;if(!part||typeof part!=='object'||Array.isArray(part)){warnings.push(`"${name}" must be a { … } group.`);return;}for(const [key,value] of Object.entries(part))if(!key.startsWith('_'))fn(key,value);};
 const levelled=(table,kind)=>(id,value)=>{
  const item=table[id];if(!item){warnings.push(`${kind} "${id}" does not exist. Known: ${Object.keys(table).join(', ')}.`);return;}
  if(!value||typeof value!=='object'||Array.isArray(value)){warnings.push(`${kind} "${id}" needs levels, like { "level 1": 15, "level 2": 40 }.`);return;}
  for(const [key,cost] of Object.entries(value)){
   const n=Number(/^level (\d+)$/.exec(key)?.[1]),first=firstLevel(item);
   if(!n||n<first||n>item.levels.length){warnings.push(`${kind} "${id}": "${key}" is not a level you can buy (use level ${first}${item.levels.length>first?` to ${item.levels.length}`:''}).`);continue;}
   set(`${id} ${key}`,cost,v=>{item.levels[n-1].cost=v;});
  }
 };
 for(const key of Object.keys(data))if(!key.startsWith('_')&&!['shop','buildings','upgrades','defenses'].includes(key))warnings.push(`Unknown group "${key}". Use shop, buildings, upgrades or defenses.`);
 section('shop',(id,value)=>{if(!SHOP_ITEMS.includes(id)){warnings.push(`Shop item "${id}" does not exist. Known: ${SHOP_ITEMS.join(', ')}.`);return;}set(`shop ${id}`,value,v=>{SHOP[id]=v;});});
 section('buildings',levelled(BUILDINGS,'Building'));
 section('upgrades',levelled(UPGRADES,'Upgrade'));
 section('defenses',(id,value)=>{
  if(id==='fenceRepair'){set('fenceRepair',value,v=>{FENCE.repairCost=v;});return;}
  if(!GADGETS[id]){warnings.push(`Defense "${id}" does not exist. Known: ${Object.keys(GADGETS).join(', ')}, fenceRepair.`);return;}
  set(id,value,v=>{GADGETS[id].cost=v;if(id==='fence')FENCE.cost=v;});
 });
 return {applied,warnings};
}

// Where a JSON syntax error is, as "line 12, column 5", from the browser's message or its character position.
export function jsonErrorWhere(text,error){
 const msg=String(error?.message||error);const lc=/line (\d+) column (\d+)/.exec(msg);if(lc)return `line ${lc[1]}, column ${lc[2]}`;
 const pos=Number(/position (\d+)/.exec(msg)?.[1]);if(!Number.isFinite(pos))return '';
 const before=text.slice(0,pos).split('\n');return `line ${before.length}, column ${before.at(-1).length+1}`;
}

// Browser: loads prices.json next to the page. Never throws; problems come back as warnings.
export async function loadPrices(url='prices.json'){
 let text;
 try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)return {applied:0,warnings:[`prices.json was not found, so the built-in prices are used.`]};text=await res.text();}
 catch{return {applied:0,warnings:['prices.json could not be read, so the built-in prices are used.']};}
 let data;
 try{data=JSON.parse(text);}
 catch(error){const where=jsonErrorWhere(text,error);return {applied:0,warnings:[`prices.json has a typing mistake${where?` near ${where}`:''}, so the built-in prices are used. Check that line and the end of the line before it: usually a comma is missing or extra.`]};}
 return applyPrices(data);
}
