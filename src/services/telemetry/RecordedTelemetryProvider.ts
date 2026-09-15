import type {DroneTelemetry,RecordedSession} from '../../types/domain';
import type {TelemetryProvider} from './TelemetryProvider';
export class RecordedTelemetryProvider implements TelemetryProvider {
 readonly mode='recorded' as const;private listeners=new Set<(d:DroneTelemetry)=>void>();private timer:ReturnType<typeof setInterval>|null=null;private last=0;
 offset=0;rate=1;playing=false;onCursor:()=>void=()=>{};
 readonly duration:number;
 constructor(readonly session:RecordedSession){if(!session.frames.length||session.endedAt===null)throw new Error('Sessão sem frames ou ainda aberta.');if(session.frames.some(f=>f.mapId!==session.mapId))throw new Error('Sessão contém mapas diferentes.');this.duration=Math.max(0,session.endedAt-session.startedAt);}
 async connect(){if(this.timer)return;this.last=performance.now();this.timer=setInterval(()=>{const now=performance.now();this.advance(now-this.last);this.last=now;},50);}
 async disconnect(){if(this.timer)clearInterval(this.timer);this.timer=null;this.playing=false;}
 subscribe(cb:(d:DroneTelemetry)=>void){this.listeners.add(cb);return()=>{this.listeners.delete(cb);};}
 play(){if(this.offset>=this.duration)this.offset=0;this.playing=true;this.last=performance.now();this.emit();}
 pause(){this.playing=false;this.onCursor();}
 seek(offset:number){this.offset=Math.max(0,Math.min(this.duration,offset));this.emit();}
 setRate(rate:number){if([.5,1,2].includes(rate))this.rate=rate;this.onCursor();}
 advance(ms:number){if(!this.playing||ms<=0)return;this.offset=Math.min(this.duration,this.offset+ms*this.rate);if(this.offset>=this.duration)this.playing=false;this.emit();}
 get index(){const time=this.session.startedAt+this.offset;let low=0,high=this.session.frames.length-1;while(low<high){const mid=Math.ceil((low+high)/2);if(this.session.frames[mid].timestamp<=time)low=mid;else high=mid-1;}return low;}
 private emit(){const frame=this.session.frames[this.index];this.listeners.forEach(cb=>cb(structuredClone(frame)));this.onCursor();}
}
