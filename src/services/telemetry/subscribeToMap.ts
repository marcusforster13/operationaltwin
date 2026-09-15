import type {DroneTelemetry} from '../../types/domain';
import type {TelemetryProvider} from './TelemetryProvider';

/** Shared consumption boundary for simulation, recorded and future live sources. */
export function subscribeToMap(provider:TelemetryProvider,mapId:string,receive:(frame:DroneTelemetry)=>void){
 let active=true;
 const unsubscribe=provider.subscribe(frame=>{if(active&&frame.mapId===mapId)receive(frame);});
 return()=>{active=false;unsubscribe();};
}
