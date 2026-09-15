import type {Vec3} from '../../types/maps';
import type {DroneTelemetry} from '../../types/domain';
import type {TelemetryProvider} from './TelemetryProvider';
export const distance=(a:Vec3,b:Vec3)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function sampleRoute(route:Vec3[],travel:number){if(route.length<2)throw new Error('A rota exige dois pontos.');let remaining=Math.max(0,travel);for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=distance(a,b);if(length>0&&remaining<length){const t=remaining/length;return {position:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t},heading:(Math.atan2(b.x-a.x,-(b.z-a.z))*180/Math.PI+360)%360,completed:false};}remaining-=length;}const a=route[route.length-2],b=route[route.length-1];return {position:{...b},heading:(Math.atan2(b.x-a.x,-(b.z-a.z))*180/Math.PI+360)%360,completed:true};}
export class MockTelemetryProvider implements TelemetryProvider{
 readonly mode='simulation' as const;private subscribers=new Set<(d:DroneTelemetry)=>void>();private timer:ReturnType<typeof setInterval>|null=null;private last=0;private elapsed=0;private travel=0;private active=false;private paused=false;private route:Vec3[]=[];private speed=10;private startTime=0;private yaw=0;private pitch=-45;
 constructor(readonly mapId:string,readonly droneId='drone-02'){}
 async connect(){if(this.timer)return;this.last=performance.now();this.timer=setInterval(()=>{const now=performance.now();this.advance((now-this.last)/1000);this.last=now;},100);}
 async disconnect(){if(this.timer)clearInterval(this.timer);this.timer=null;this.active=false;}
 subscribe(cb:(d:DroneTelemetry)=>void){this.subscribers.add(cb);return()=>{this.subscribers.delete(cb);};}
 start(route:Vec3[],speed:number,timestamp=Date.now()){if(route.length<2||!route.every(p=>[p.x,p.y,p.z].every(Number.isFinite))||!Number.isFinite(speed)||speed<=0)throw new Error('Rota ou velocidade inválida.');this.route=route.map(p=>({...p}));this.speed=speed;this.elapsed=0;this.travel=0;this.active=true;this.paused=false;this.startTime=timestamp;this.last=performance.now();this.emit();}
 pause(){this.paused=true;this.emit();}resume(){this.paused=false;this.last=performance.now();this.emit();}stop(){this.active=false;}setGimbal(yaw:number,pitch:number){this.yaw=yaw;this.pitch=pitch;}setSpeed(speed:number){if(Number.isFinite(speed)&&speed>0)this.speed=speed;}
 advance(seconds:number){if(!this.active||this.paused||seconds<=0)return;this.elapsed+=seconds;this.travel+=seconds*this.speed;this.emit();}
 private emit(){if(this.route.length<2)return;const sample=sampleRoute(this.route,this.travel);const frame:DroneTelemetry={mapId:this.mapId,droneId:this.droneId,timestamp:this.startTime+this.elapsed*1000,position:sample.position,altitude:sample.position.y,speed:sample.completed||this.paused?0:this.speed,heading:sample.heading,battery:Math.max(0,100-this.elapsed*.03),connection:'online',gimbal:{yaw:this.yaw,pitch:this.pitch,roll:0},state:sample.completed?'completed':this.paused?'paused':'flying'};if(sample.completed)this.active=false;this.subscribers.forEach(cb=>cb(frame));}
}
