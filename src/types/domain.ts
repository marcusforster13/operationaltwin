import type {Vec3} from './maps';
export type DataMode='simulation'|'recorded'|'live';
export type DroneTelemetry={mapId:string;droneId:string;timestamp:number;position:Vec3;latitude?:number;longitude?:number;altitude:number|null;speed:number|null;heading:number|null;battery:number|null;connection:'online'|'stale'|'offline';gimbal?:{yaw?:number;pitch?:number;roll?:number};state?:'idle'|'flying'|'paused'|'completed';};
export type Waypoint={id:string;mapId:string;ground:Vec3;altitude:number};
export type Mission={id:string;mapId:string;waypoints:Waypoint[];speed:number;returnToBase:boolean};
export type Incident={id:string;mapId:string;priority:'alta'|'média'|'baixa';timestamp:number;position:Vec3};
export type Resource={id:string;mapId:string;name:string;kind:'drone'|'team'|'vehicle';position:Vec3;available:boolean;simulatedSpeed:number};
export type SessionEvent={timestamp:number;mapId:string;type:'Start'|'Pause'|'Resume'|'Stop'|'Incident';incident?:Incident};
export type RecordedSession={id:string;mapId:string;droneId:string;mode:'simulation';mission:Mission;resources?:Resource[];vision?:boolean;frames:DroneTelemetry[];events:SessionEvent[];startedAt:number;endedAt:number|null};
