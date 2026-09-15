import {DEMO_SCENARIO_01 as config} from '../../config/demo';
import type {Vec3} from '../../types/maps';
import type {Mission,Resource} from '../../types/domain';
import {missionRoute} from '../mission/mission';
import {distance} from '../../services/telemetry/MockTelemetryProvider';
export interface ScenarioWorld{surface(u:number,v:number):Vec3|null;readonly maxY:number;readonly extent:number;}
export function prepareScenario(mapId:string,world:ScenarioWorld){
 const ground=config.waypoints.map(([u,v])=>world.surface(u,v));if(ground.some(p=>!p))throw new Error('Cenário pendente: um waypoint não encontrou superfície. Ajuste config/demo.ts.');
 const mission:Mission={id:crypto.randomUUID(),mapId,returnToBase:false,speed:1,waypoints:ground.map((p,i)=>({id:`demo-wp-${i+1}`,mapId,ground:p!,altitude:world.maxY+config.clearance-p!.y}))};
 const route=missionRoute(mission);const length=route.slice(1).reduce((sum,p,i)=>sum+distance(route[i],p),0);if(length<=0)throw new Error('Cenário sem deslocamento.');mission.speed=length/config.flightSeconds;
 const incident=ground.at(-1)!;const candidates:Vec3[]=[];for(const u of [.2,.3,.7,.8])for(const v of [.2,.3,.7,.8]){const p=world.surface(u,v);if(p)candidates.push(p);}candidates.sort((a,b)=>distance(b,incident)-distance(a,incident));if(candidates.length<2)throw new Error('Cenário pendente: superfícies insuficientes para recursos.');
 const resources:Resource[]=[{id:'drone-02',mapId,name:'Drone 02',kind:'drone',position:route[0],available:true,simulatedSpeed:mission.speed},{id:'team-04',mapId,name:'Equipe 04',kind:'team',position:candidates[0],available:true,simulatedSpeed:1.5},{id:'vehicle-07',mapId,name:'Viatura 07',kind:'vehicle',position:candidates[1],available:true,simulatedSpeed:5}];return {mission,incident,resources};
}
