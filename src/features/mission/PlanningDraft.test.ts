import {expect,it} from 'vitest';
import {parsePlanningDraft,planningKey,planningReference,type PlanningDraft} from './PlanningDraft';
const draft=():PlanningDraft=>({schema:'operational-twin-planning-v1',mapId:'tabajaras',reference:planningReference('tabajaras'),savedAt:100,mission:{id:'m',mapId:'tabajaras',waypoints:[{id:'a',mapId:'tabajaras',ground:{x:1,y:2,z:3},altitude:20}],speed:10,returnToBase:false},resources:[{id:'r',mapId:'tabajaras',name:'Simulado',kind:'team',position:{x:1,y:2,z:3},available:true,simulatedSpeed:2}],vision:true,yaw:10,pitch:-45});
it('round trips planning data and separates keys by owner and locality',()=>{
 const d=draft();expect(parsePlanningDraft(JSON.stringify(d),'tabajaras')).toEqual(d);
 expect(planningKey('a','tabajaras')).not.toBe(planningKey('b','tabajaras'));
 expect(planningKey('a','tabajaras')).not.toBe(planningKey('a','cantagalo'));
});
it.each(['map','reference','waypoint','resource','speed','gimbal','duplicate'])('rejects incompatible draft %s',kind=>{
 const d=draft();
 if(kind==='map')d.mapId='cantagalo';
 if(kind==='reference')d.reference='old-transform';
 if(kind==='waypoint')d.mission.waypoints[0].mapId='cantagalo';
 if(kind==='resource')d.resources[0].position.x=Infinity;
 if(kind==='speed')d.mission.speed=0;
 if(kind==='gimbal')d.yaw=200;
 if(kind==='duplicate')d.mission.waypoints.push({...d.mission.waypoints[0]});
 expect(()=>parsePlanningDraft(JSON.stringify(d),'tabajaras')).toThrow();
});
