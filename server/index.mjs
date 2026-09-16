import http from 'node:http';
import {mkdir,readFile,readdir,writeFile,rename,unlink} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const maps=new Set((process.env.MAP_IDS||'tabajaras,cantagalo').split(','));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const point=p=>p&&[p.x,p.y,p.z].every(finite);
export function validateSession(s,mapId){if(!s||s.mapId!==mapId||typeof s.id!=='string'||!s.id||s.id.length>200||s.mode!=='simulation'||!finite(s.startedAt)||!finite(s.endedAt)||!s.mission||s.mission.mapId!==mapId||!Array.isArray(s.mission.waypoints)||s.mission.waypoints.length>100||s.mission.waypoints.some(w=>w.mapId!==mapId||!point(w.ground)||!finite(w.altitude))||!Array.isArray(s.frames)||s.frames.length>18000||s.frames.some(f=>f.mapId!==mapId||!point(f.position)||!finite(f.timestamp))||!Array.isArray(s.events)||s.events.some(e=>e.mapId!==mapId||!finite(e.timestamp)||e.incident&&(e.incident.mapId!==mapId||!point(e.incident.position))))throw new Error('Sessão inválida ou pertencente a outro mapa.');if(s.resources&&(!Array.isArray(s.resources)||s.resources.some(r=>r.mapId!==mapId||!point(r.position))))throw new Error('Recursos incompatíveis.');return s;}
export function sample(route,travel){for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);if(length>0&&travel<length){const t=travel/length;return{position:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},heading:(Math.atan2(b.x-a.x,-(b.z-a.z))*180/Math.PI+360)%360,completed:false};}travel-=length;}return{position:route.at(-1),heading:0,completed:true};}
export function createBackend({directory=resolve('server-data'),origins=['http://127.0.0.1:5177','http://127.0.0.1:5176','http://127.0.0.1:4173','http://127.0.0.1:5173']}={}){
 const simulations=new Map();let writes=Promise.resolve();
 const list=async map=>{const dir=join(directory,map);await mkdir(dir,{recursive:true});return(await Promise.all((await readdir(dir)).filter(n=>n.endsWith('.json')).map(async n=>JSON.parse(await readFile(join(dir,n),'utf8'))))).sort((a,b)=>a.startedAt-b.startedAt);};
 const filename=s=>createHash('sha256').update(s.id).digest('hex')+'.json';
 const server=http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const origin=req.headers.origin;
  if(!/^localhost(?::\d+)?$|^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host??''))return send(403,{error:'Host não autorizado.'});
  if(origin&&!origins.includes(origin))return send(403,{error:'Origem não autorizada.'});
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');return send(204,{});}
  try{
   const url=new URL(req.url,'http://127.0.0.1'),parts=url.pathname.split('/').filter(Boolean);
   if(req.method==='GET'&&url.pathname==='/health')return send(200,{mode:'REMOTE_SIMULATION',storage:'filesystem',version:1});
   const body=async()=>{if(!req.headers['content-type']?.startsWith('application/json'))throw new Error('Use application/json.');let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16*1024*1024)throw new Error('Payload excede 16 MiB.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());};
   const mapId=parts[1];if(parts[0]!=='maps'||!maps.has(mapId))return send(404,{error:'Localidade desconhecida.'});
   if(parts[2]==='sessions'&&parts.length===3){
    if(req.method==='GET'){await writes;return send(200,await list(mapId));}
    if(req.method==='PUT'){const s=validateSession(await body(),mapId);const operation=writes.then(async()=>{const dir=join(directory,mapId);await mkdir(dir,{recursive:true});const target=join(dir,filename(s)),temp=target+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(s));await rename(temp,target);const sessions=await list(mapId);for(const old of sessions.slice(0,Math.max(0,sessions.length-10)))await unlink(join(dir,filename(old)));});writes=operation.catch(()=>{});await operation;return send(200,{saved:true,id:s.id});}
   }
   if(parts[2]==='simulations'){
    for(const [id,s] of simulations)if(Date.now()-s.lastAccess>120000)simulations.delete(id);
    if(req.method==='POST'&&parts.length===3){if(simulations.size>=20)return send(429,{error:'Limite de simulações ativas.'});const data=await body();if(!Array.isArray(data.route)||data.route.length<2||data.route.length>101||!data.route.every(point)||!finite(data.speed)||data.speed<=0||data.speed>500)throw new Error('Rota simulada inválida.');const id=randomUUID();simulations.set(id,{mapId,route:data.route,speed:data.speed,travel:0,elapsed:0,last:Date.now(),lastAccess:Date.now(),started:Date.now(),paused:false,stopped:false,yaw:0,pitch:-45});return send(201,{id,mode:'REMOTE_SIMULATION'});}
    const s=simulations.get(parts[3]);if(!s||s.mapId!==mapId)return send(404,{error:'Simulação ausente nesta localidade.'});
    const now=Date.now(),dt=(now-s.last)/1000;s.last=now;s.lastAccess=now;if(!s.paused&&!s.stopped){s.travel+=dt*s.speed;s.elapsed+=dt;}
    if(req.method==='POST'&&parts[4]==='command'){const data=await body();if(data.command==='pause')s.paused=true;else if(data.command==='resume')s.paused=false;else if(data.command==='stop')s.stopped=true;else if(data.command==='gimbal'&&finite(data.yaw)&&finite(data.pitch)){s.yaw=data.yaw;s.pitch=data.pitch;}else throw new Error('Comando de simulação inválido.');return send(200,{ok:true});}
    if(req.method==='GET'&&parts.length===4){const value=sample(s.route,s.travel),completed=value.completed||s.stopped;if(completed)s.stopped=true;return send(200,{mapId,droneId:'drone-02',timestamp:now,position:value.position,altitude:value.position.y,speed:completed||s.paused?0:s.speed,heading:value.heading,battery:Math.max(0,100-s.elapsed*.03),connection:'online',gimbal:{yaw:s.yaw,pitch:s.pitch,roll:0},state:completed?'completed':s.paused?'paused':'flying'});}
   }
   send(404,{error:'Endpoint desconhecido.'});
  }catch(error){send(400,{error:error instanceof SyntaxError?'JSON inválido.':error.message});}
 });return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const port=Number(process.env.BACKEND_PORT||8787);createBackend({directory:resolve(process.env.SESSION_DATA_DIR||'server-data'),origins:(process.env.FRONTEND_ORIGINS||'http://127.0.0.1:5177,http://127.0.0.1:5176,http://127.0.0.1:4173,http://127.0.0.1:5173').split(',')}).listen(port,'127.0.0.1',()=>console.log(`Backend REMOTE_SIMULATION em http://127.0.0.1:${port}`));}
