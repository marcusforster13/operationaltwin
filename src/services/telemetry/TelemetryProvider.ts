import type {DataMode,DroneTelemetry} from '../../types/domain';
export interface TelemetryProvider{readonly mode:DataMode;connect():Promise<void>;disconnect():Promise<void>;subscribe(cb:(data:DroneTelemetry)=>void):()=>void;}
