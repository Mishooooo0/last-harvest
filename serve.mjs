import http from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// The game server. It serves ./dist, and keeps farm saves as files in ./saves (Update 33).
// Git ignores the saves folder, so farms never go to GitHub.
//   node serve.mjs                     the game at http://localhost:4173, saves in ./saves
//   PORT=4174 LH_SAVES=other node serve.mjs   another port and saves folder (for testing)
export const SAVE_SLOTS=Object.freeze(['manual-1','manual-2','manual-3','auto','previous']);
const MAX_SAVE=5_000_000;
let writes=0;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png'};

export function createGameServer({root=fileURLToPath(new URL('./dist/',import.meta.url)),savesDir=fileURLToPath(new URL('./saves/',import.meta.url))}={}){
 root=path.resolve(root);savesDir=path.resolve(savesDir);
 const file=slot=>path.join(savesDir,slot+'.json');
 const send=(res,status,body='',type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body);};
 // Only the game's own page may read or write saves: another website open in the browser may not.
 const ownPage=req=>{const origin=req.headers.origin;if(!origin)return true;try{const u=new URL(origin);return ['localhost','127.0.0.1'].includes(u.hostname)&&Number(u.port||80)===server.address()?.port;}catch{return false;}};
 const readBody=req=>new Promise((resolve,reject)=>{let size=0;const chunks=[];req.on('data',c=>{size+=c.length;if(size>MAX_SAVE){reject(Object.assign(Error('too large'),{status:413}));req.destroy();}else chunks.push(c);});req.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));req.on('error',reject);});
 async function saves(req,res,url){
  if(!ownPage(req)){send(res,403,'Saves belong to the game page.');return;}
  if(url.pathname==='/api/saves'&&req.method==='GET'){
   const slots={};for(const slot of SAVE_SLOTS){try{slots[slot]=await readFile(file(slot),'utf8');}catch{slots[slot]=null;}}
   send(res,200,JSON.stringify({folder:'saves',slots}),types['.json']);return;
  }
  const slot=/^\/api\/saves\/([a-z0-9-]+)$/.exec(url.pathname)?.[1];
  if(!SAVE_SLOTS.includes(slot)){send(res,404,'No such save slot.');return;}
  if(req.method!=='PUT'){send(res,405,'Use PUT to write a save.');return;}
  const body=await readBody(req);
  try{JSON.parse(body);}catch{send(res,400,'A save must be JSON.');return;}
  // Written beside the old file, then swapped in, so a crash never leaves half a save.
  await mkdir(savesDir,{recursive:true});const target=file(slot),temp=`${target}.${process.pid}-${++writes}.writing`;
  await writeFile(temp,body,'utf8');await rename(temp,target);
  send(res,204);
 }
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')){try{await saves(req,res,url);}catch(error){if(!res.headersSent)send(res,error?.status||500,error?.status?'The save is too large.':'The save could not be written.');}return;}
   const p=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!p.startsWith(root+path.sep)&&p!==root){send(res,403);return;}
   const body=await readFile(p);res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch{if(!res.headersSent)send(res,404,'Not found');}
 });
 return server;
}

// Run directly (the desktop shortcut, npm start): listen on this computer only.
if(process.argv[1]&&path.resolve(process.argv[1]).toLowerCase()===fileURLToPath(import.meta.url).toLowerCase()){
 const port=Number(process.env.PORT)||4173;
 createGameServer({root:process.argv[2]||undefined,savesDir:process.env.LH_SAVES||undefined}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
}
