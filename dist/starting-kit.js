// The starting kit (Update 33): what every new farm begins with, from starting-kit.json, which is edited by hand.
// The amounts in engine.js (STARTING_PACK) stay as the built-in kit: a missing or mistaken entry keeps it.
import {STARTING_PACK,PANTRY_SIZE,WATER_CAP,BUILDINGS} from './engine.js';
import {jsonErrorWhere} from './prices.js';

const FIRST_PLOTS=BUILDINGS.field.levels[0].plots;
// Each entry in the file, the starting-pack amount it sets, and the most a new farm can hold.
export const KIT=Object.freeze({
 scrap:{field:'scrap',max:100000},
 shells:{field:'ammo',max:100000},
 seeds:{field:'seeds',max:100000},
 food:{field:'food',max:PANTRY_SIZE,limit:`the farmhouse pantry holds ${PANTRY_SIZE}`},
 water:{field:'water',max:WATER_CAP,limit:`the farmhouse barrels hold ${WATER_CAP}`},
 meds:{field:'meds',max:100000},
 gasoline:{field:'gas',max:100000},
 ripeCrops:{field:'ripe',max:FIRST_PLOTS,limit:`the field starts with ${FIRST_PLOTS} plots`},
 extraShotguns:{field:'guns',max:20},
 extraScythes:{field:'scythes',max:20},
});

// The kit as it is now, in the file's layout. Used by the tests.
export function currentKit(){return Object.fromEntries(Object.entries(KIT).map(([key,spec])=>[key,STARTING_PACK[spec.field]]));}

// Applies a parsed starting-kit.json. Returns how many amounts were set and a list of problems, in plain words.
export function applyStartingKit(data){
 const warnings=[];let applied=0;
 if(!data||typeof data!=='object'||Array.isArray(data))return {applied,warnings:['The file must be one { … } object.']};
 for(const [key,value] of Object.entries(data)){
  if(key.startsWith('_'))continue;
  const spec=KIT[key];
  if(!spec){warnings.push(`"${key}" is not part of the kit. Known: ${Object.keys(KIT).join(', ')}.`);continue;}
  if(!Number.isInteger(value)||value<0){warnings.push(`${key}: "${JSON.stringify(value)}" is not an amount. Use a whole number like 10.`);continue;}
  if(value>spec.max)warnings.push(`${key}: ${value} is more than ${spec.limit||`the most allowed (${spec.max})`}, so ${spec.max} is used.`);
  STARTING_PACK[spec.field]=Math.min(value,spec.max);applied++;
 }
 return {applied,warnings};
}

export function readStartingKit(text){
 let data;
 try{data=JSON.parse(text);}
 catch(error){const where=jsonErrorWhere(text,error);return {applied:0,warnings:[`starting-kit.json has a typing mistake${where?` near ${where}`:''}, so the built-in kit is used. Check that line and the end of the line before it: usually a comma is missing or extra.`]};}
 return applyStartingKit(data);
}

// Browser: loads starting-kit.json next to the page. Never throws; problems come back as warnings.
export async function loadStartingKit(url='starting-kit.json'){
 let text;
 try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)return {applied:0,warnings:['starting-kit.json was not found, so the built-in kit is used.']};text=await res.text();}
 catch{return {applied:0,warnings:['starting-kit.json could not be read, so the built-in kit is used.']};}
 return readStartingKit(text);
}
