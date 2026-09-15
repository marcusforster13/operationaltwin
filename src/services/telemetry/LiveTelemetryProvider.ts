import type {DroneTelemetry} from '../../types/domain';
import type {OperationalMap} from '../../types/maps';
import type {TelemetryProvider} from './TelemetryProvider';

/** Internal backend contract, deliberately not a DJI payload or SDK. */
export interface NormalizedTelemetryTransport {
 connect():Promise<void>;
 disconnect():Promise<void>;
 subscribe(onPayload:(payload:unknown)=>void):()=>void;
}

const object=(value:unknown):Record<string,unknown>=>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Payload normalizado inválido.');
 return value as Record<string,unknown>;
};
const finite=(value:unknown):number=>{
 if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Campo numérico inválido.');
 return value;
};
const nullable=(value:unknown)=>value==null?null:finite(value);

export function normalizeBackendTelemetry(payload:unknown,mapId:string):DroneTelemetry {
 const data=object(payload),position=object(data.position);
 if(data.mapId!==mapId)throw new Error('Telemetria pertence a outro mapa.');
 if(typeof data.droneId!=='string'||!data.droneId.trim())throw new Error('droneId ausente.');
 if(!['online','stale','offline'].includes(String(data.connection)))throw new Error('Conexão inválida.');
 const frame:DroneTelemetry={mapId,droneId:data.droneId,timestamp:finite(data.timestamp),position:{x:finite(position.x),y:finite(position.y),z:finite(position.z)},altitude:nullable(data.altitude),speed:nullable(data.speed),heading:nullable(data.heading),battery:nullable(data.battery),connection:data.connection as DroneTelemetry['connection']};
 if(frame.timestamp<0||frame.speed!==null&&frame.speed<0||frame.battery!==null&&(frame.battery<0||frame.battery>100))throw new Error('Telemetria fora dos limites do contrato.');
 if(data.latitude!=null){frame.latitude=finite(data.latitude);if(Math.abs(frame.latitude)>90)throw new Error('Latitude inválida.');}
 if(data.longitude!=null){frame.longitude=finite(data.longitude);if(Math.abs(frame.longitude)>180)throw new Error('Longitude inválida.');}
 if(data.state!=null){if(!['idle','flying','paused','completed'].includes(String(data.state)))throw new Error('Estado inválido.');frame.state=data.state as DroneTelemetry['state'];}
 if(data.gimbal!=null){const gimbal=object(data.gimbal);frame.gimbal={};for(const key of ['yaw','pitch','roll'] as const)if(gimbal[key]!=null)frame.gimbal[key]=finite(gimbal[key]);}
 return frame;
}

/** V1 stub: no network implementation; fails closed until transport AND calibration exist. */
export class LiveTelemetryProvider implements TelemetryProvider {
 readonly mode='live' as const;
 private listeners=new Set<(frame:DroneTelemetry)=>void>();
 private unsubscribe:(()=>void)|null=null;
 private epoch=0;
 private active=false;
 private connecting=false;
 private lastTimestamp=-1;
 constructor(private map:OperationalMap,private transport?:NormalizedTelemetryTransport,private onError:(error:Error)=>void=(error)=>{console.error(error);}){}
 subscribe(cb:(frame:DroneTelemetry)=>void){this.listeners.add(cb);return()=>{this.listeners.delete(cb);};}
 async connect(){
  if(this.connecting)throw new Error('Conexão anterior ainda pendente.');
  if(this.active)return;
  if(!this.transport)throw new Error('LIVE PENDING: backend normalizado não configurado.');
  const geo=this.map.geo;
  if(!geo.fieldCalibrated||!geo.altitudeReferenceValidated||geo.metersPerUnit===null||!Number.isFinite(geo.metersPerUnit)||geo.metersPerUnit<=0||geo.northRotationY===null||!Number.isFinite(geo.northRotationY)||!geo.altitudeDatum)throw new Error('LIVE PENDING: calibração e referência vertical do mapa não validadas.');
  const epoch=++this.epoch;
  this.active=true;this.connecting=true;this.lastTimestamp=-1;
  try{
  this.unsubscribe=this.transport.subscribe(payload=>{
   if(!this.active||epoch!==this.epoch)return;
   let frame:DroneTelemetry;
   try{frame=normalizeBackendTelemetry(payload,this.map.id);if(frame.timestamp<this.lastTimestamp)throw new Error('Frame fora de ordem.');}
   catch(error){this.onError(error instanceof Error?error:new Error(String(error)));return;}
   this.lastTimestamp=frame.timestamp;
   this.listeners.forEach(cb=>cb(frame));
  });
  await this.transport.connect();if(epoch!==this.epoch)await this.transport.disconnect();}
  catch(error){if(epoch===this.epoch){this.active=false;this.unsubscribe?.();this.unsubscribe=null;}throw error;}
  finally{this.connecting=false;}
 }
 async disconnect(){this.epoch++;this.active=false;this.unsubscribe?.();this.unsubscribe=null;await this.transport?.disconnect();}
}
