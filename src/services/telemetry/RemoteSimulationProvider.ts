import type {DroneTelemetry} from '../../types/domain';
import type {Vec3} from '../../types/maps';
import {MockTelemetryProvider} from './MockTelemetryProvider';
import {normalizeBackendTelemetry} from './LiveTelemetryProvider';
export const backendUrl=(import.meta.env.VITE_BACKEND_URL||'').replace(/\/$/,'');
export async function backendRequest(base:string,path:string,body?:unknown,method=body===undefined?'GET':'POST',signal?:AbortSignal){const response=await fetch(base+path,{method,signal:signal??AbortSignal.timeout(15000),headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(!response.ok)throw new Error(`Backend ${response.status}: ${await response.text()}`);return response.json();}
/** Commands operate only the remote simulator; never an aircraft. */
export class RemoteSimulationProvider extends MockTelemetryProvider{
 private remoteListeners=new Set<(f:DroneTelemetry)=>void>();private pollTimer:ReturnType<typeof setTimeout>|null=null;private requestAbort:AbortController|null=null;private generation=0;private simulationId='';private latest:DroneTelemetry|null=null;private commands=Promise.resolve();private remoteYaw=0;private remotePitch=-45;
 constructor(mapId:string,private base:string,private onError:(e:unknown)=>void){super(mapId);}
 override subscribe(cb:(f:DroneTelemetry)=>void){this.remoteListeners.add(cb);return()=>{this.remoteListeners.delete(cb);};}
 override async connect(){const health=await backendRequest(this.base,'/health');if(health.mode!=='REMOTE_SIMULATION')throw new Error('Backend não é um simulador compatível.');}
 override async start(route:Vec3[],speed:number){const generation=++this.generation;const result=await backendRequest(this.base,`/maps/${this.mapId}/simulations`,{route,speed});if(generation!==this.generation){void backendRequest(this.base,`/maps/${this.mapId}/simulations/${result.id}/command`,{command:'stop'}).catch(()=>{});return;}if(typeof result.id!=='string'||!/^[a-zA-Z0-9-]+$/.test(result.id))throw new Error('Identificador de simulação inválido.');this.simulationId=result.id;this.latest=null;this.command('gimbal',{yaw:this.remoteYaw,pitch:this.remotePitch});void this.poll(generation);}
 private async poll(generation:number){if(generation!==this.generation||!this.simulationId)return;this.requestAbort=new AbortController();const timeout=setTimeout(()=>this.requestAbort?.abort(),5000);try{const raw=await backendRequest(this.base,`/maps/${this.mapId}/simulations/${this.simulationId}`,undefined,'GET',this.requestAbort.signal);if(generation!==this.generation)return;const frame=normalizeBackendTelemetry(raw,this.mapId);if(this.latest&&frame.timestamp<this.latest.timestamp)throw new Error('Telemetria regressiva.');this.latest=frame;this.remoteListeners.forEach(cb=>cb(frame));if(frame.state==='completed')return;}catch(error){if(generation!==this.generation)return;if(this.latest)this.remoteListeners.forEach(cb=>cb({...this.latest!,connection:'stale'}));this.onError(error);}finally{clearTimeout(timeout);}if(generation===this.generation)this.pollTimer=setTimeout(()=>void this.poll(generation),100);}
 private command(command:string,extra={}){const id=this.simulationId;if(!id)return;this.commands=this.commands.then(()=>backendRequest(this.base,`/maps/${this.mapId}/simulations/${id}/command`,{command,...extra})).then(()=>{}).catch(this.onError);}
 override pause(){this.command('pause');}override resume(){this.command('resume');}override setGimbal(yaw:number,pitch:number){this.remoteYaw=yaw;this.remotePitch=pitch;this.command('gimbal',{yaw,pitch});}
 override stop(){this.command('stop');this.cancelPolling();}
 private cancelPolling(){this.generation++;if(this.pollTimer)clearTimeout(this.pollTimer);this.pollTimer=null;this.requestAbort?.abort();this.requestAbort=null;}
 override async disconnect(){this.cancelPolling();this.simulationId='';}
}
