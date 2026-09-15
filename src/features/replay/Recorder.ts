import type {RecordedSession,Mission,DroneTelemetry,SessionEvent,Incident,Resource} from '../../types/domain';
export class Recorder{
 session:RecordedSession|null=null;
 start(mission:Mission,incidents:Incident[],now=Date.now(),resources:Resource[]=[],vision=false){this.session={id:crypto.randomUUID(),mapId:mission.mapId,droneId:'drone-02',mode:'simulation',mission:structuredClone(mission),resources:structuredClone(resources),vision,frames:[],events:[{timestamp:now,mapId:mission.mapId,type:'Start'},...incidents.map(incident=>({timestamp:now,mapId:mission.mapId,type:'Incident' as const,incident:structuredClone(incident)}))],startedAt:now,endedAt:null};}
 frame(frame:DroneTelemetry,now=Date.now()){if(!this.session||this.session.endedAt!==null)return;if(frame.mapId!==this.session.mapId)throw new Error('Telemetria pertence a outro mapa.');this.session.frames.push(structuredClone({...frame,timestamp:now}));}
 event(type:SessionEvent['type'],incident?:Incident,now=Date.now()){if(!this.session||this.session.endedAt!==null)return;if(incident&&incident.mapId!==this.session.mapId)throw new Error('Incidente pertence a outro mapa.');this.session.events.push({timestamp:now,mapId:this.session.mapId,type,incident:incident?structuredClone(incident):undefined});}
 stop(now=Date.now()){if(!this.session)return null;if(this.session.endedAt===null){this.event('Stop',undefined,now);this.session.endedAt=now;}return structuredClone(this.session);}
}
