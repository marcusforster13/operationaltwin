import type {Mission,Waypoint} from '../../types/domain';
import type {Vec3} from '../../types/maps';
export const waypointPosition=(w:Waypoint):Vec3=>({...w.ground,y:w.ground.y+w.altitude});
export function missionRoute(m:Mission){const route=m.waypoints.map(waypointPosition);if(m.returnToBase&&route.length>1)route.push({...route[0]});return route;}
export function newMission(mapId:string):Mission{return {id:crypto.randomUUID(),mapId,waypoints:[],speed:10,returnToBase:false};}
