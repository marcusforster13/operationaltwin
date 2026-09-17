import {useEffect,useRef,useState} from 'react';
import type {OperationController} from '../../app/OperationController';
import {backendRequest,backendUrl} from '../../services/telemetry/RemoteSimulationProvider';
import {authOwner} from '../auth/auth';
import {getMap} from '../../config/maps';
import type {Mission,Resource} from '../../types/domain';

export type PlanningDraft={schema:'operational-twin-planning-v1';mapId:string;reference:string;savedAt:number;mission:Mission;resources:Resource[];vision:boolean;yaw:number;pitch:number};
export const planningKey=(owner:string|undefined,mapId:string)=>`operational-twin-planning-v1:${owner||'local'}:${mapId}`;
export function planningReference(mapId:string){const m=getMap(mapId);return JSON.stringify({source:m.sourceFile,transform:m.transform,geo:m.geo});}
export function parsePlanningDraft(raw:string,mapId:string):PlanningDraft{
 if(new TextEncoder().encode(raw).byteLength>1024*1024)throw new Error('Rascunho excede 1 MiB.');
 const d=JSON.parse(raw) as PlanningDraft;
 if(!d||d.schema!=='operational-twin-planning-v1'||d.mapId!==mapId||d.reference!==planningReference(mapId)||!Number.isFinite(d.savedAt)||!Number.isFinite(d.yaw)||Math.abs(d.yaw)>180||!Number.isFinite(d.pitch)||d.pitch< -90||d.pitch>90||typeof d.vision!=='boolean'||!Array.isArray(d.resources))throw new Error('Rascunho incompatível com a localidade ou seu referencial.');
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 const point=(v:any)=>v&&[v.x,v.y,v.z].every(finite);
 const id=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=200;
 const m=d.mission;
 if(!m||m.mapId!==mapId||!id(m.id)||!finite(m.speed)||m.speed<=0||m.speed>500||typeof m.returnToBase!=='boolean'||!Array.isArray(m.waypoints)||m.waypoints.length>100||m.waypoints.some(w=>!w||w.mapId!==mapId||!id(w.id)||!point(w.ground)||!finite(w.altitude)||w.altitude<0||w.altitude>1000)||new Set(m.waypoints.map(w=>w.id)).size!==m.waypoints.length)throw new Error('Missão inválida.');
 if(d.resources.length>1000||d.resources.some(r=>!r||r.mapId!==mapId||!id(r.id)||!id(r.name)||!point(r.position)||!['drone','team','vehicle'].includes(r.kind)||typeof r.available!=='boolean'||!finite(r.simulatedSpeed)||r.simulatedSpeed<=0))throw new Error('Recursos inválidos.');
 return d;
}

export function PlanningDraftPanel({controller,disabled}:{controller:OperationController;disabled:boolean}){
 const [pending,setPending]=useState<PlanningDraft|null>(null),[message,setMessage]=useState('');
 const owner=authOwner(),key=planningKey(owner,controller.mapId);
 const [busy,setBusy]=useState(false);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const valid=()=>alive.current&&authOwner()===owner;
 const path=`/maps/${encodeURIComponent(controller.mapId)}/planning`;
 async function readDraft(local=false){
  if(blocked())return;setBusy(true);setPending(null);setMessage('');
  try{
   const data=backendUrl&&!local?await backendRequest(backendUrl,path,undefined,'GET',undefined,owner):null;
   const raw=backendUrl&&!local?(data===null?null:JSON.stringify(data)):localStorage.getItem(key);
   if(!valid())return;
   if(raw)setPending(parsePlanningDraft(raw,controller.mapId));else setMessage('Nenhum rascunho salvo para esta conta e localidade.');
  }catch{if(valid())setMessage('Não foi possível carregar o rascunho. Verifique a conexão e a compatibilidade com esta localidade.');}
  finally{if(valid())setBusy(false);}
 }
 const blocked=()=>disabled||busy||controller.state.recording||controller.state.mode==='recorded'||['flying','paused'].includes(controller.state.status);
 return <section aria-label="Rascunho do planejamento"><h3>Rascunho do planejamento</h3><p>Um rascunho por conta e localidade, {backendUrl?'salvo na nuvem':'somente neste navegador'}. Inclui rota, recursos simulados e configuração de visão.</p>
 <button disabled={blocked()} onClick={async()=>{if(blocked())return;setBusy(true);try{const s=controller.state;const draft:PlanningDraft={schema:'operational-twin-planning-v1',mapId:controller.mapId,reference:planningReference(controller.mapId),savedAt:Date.now(),mission:s.mission,resources:s.resources,vision:s.vision,yaw:s.yaw,pitch:s.pitch};const raw=JSON.stringify(draft);parsePlanningDraft(raw,controller.mapId);if(backendUrl)await backendRequest(backendUrl,path,draft,'PUT',undefined,owner);else localStorage.setItem(key,raw);if(!valid())return;setPending(null);setMessage('Rascunho salvo '+(backendUrl?'na nuvem':'neste navegador')+'. O rascunho anterior desta localidade foi substituído.');}catch{if(valid())setMessage('Não foi possível salvar o rascunho. Verifique a conexão e o armazenamento.');}finally{if(valid())setBusy(false);}}}>Salvar rascunho</button>
 <button disabled={blocked()} onClick={()=>void readDraft()}>Carregar rascunho</button>
 {backendUrl&&<button disabled={blocked()} onClick={()=>void readDraft(true)}>Carregar rascunho deste navegador</button>}
 {busy&&<p role="status">Acessando rascunho…</p>}
 {pending&&<><p>{new Date(pending.savedAt).toLocaleString('pt-BR')} · {pending.mission.waypoints.length} waypoints · {pending.resources.length} recursos. Substituir rota, recursos e visão atuais? Ocorrências e gravações não fazem parte do rascunho.</p><button disabled={blocked()} onClick={()=>{if(blocked()||!valid())return;controller.reset();controller.setMission(structuredClone(pending.mission));controller.setResources(structuredClone(pending.resources));controller.setVision(pending.vision,pending.yaw,pending.pitch);setPending(null);setMessage('Planejamento restaurado. A missão não foi iniciada.');}}>Substituir planejamento</button><button onClick={()=>setPending(null)}>Cancelar</button></>}
 {message&&<p role="status">{message}</p>}
 </section>;
}
