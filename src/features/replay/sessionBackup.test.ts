import {expect,it} from 'vitest';
import {Recorder} from './Recorder';
import {MAX_BACKUP_BYTES,parseSessionBackup} from './sessionBackup';
import {OperationController} from '../../app/OperationController';

function backup(mapId='backup-test'){
 const r=new Recorder();
 r.start({id:'mission',mapId,waypoints:[{id:'wp',mapId,ground:{x:0,y:0,z:0},altitude:10}],speed:10,returnToBase:false},[],100);
 r.frame({mapId,droneId:'drone-02',timestamp:110,position:{x:1,y:2,z:3},altitude:null,speed:10,heading:0,battery:99,connection:'online'},110);
 r.frame({mapId,droneId:'drone-02',timestamp:120,position:{x:2,y:2,z:3},altitude:null,speed:0,heading:0,battery:99,connection:'online'},120);
 return {schema:'operational-twin-session-v1',session:r.stop(130)!};
}
it('accepts the existing export format and preserves the recording',()=>{
 const source=backup();expect(parseSessionBackup(JSON.stringify(source),'backup-test')).toEqual(source.session);
});
it.each([
 (b:any)=>{b.schema='unknown';},
 (b:any)=>{b.session.mode='live';},
 (b:any)=>{b.session.mission.waypoints[0].mapId='other';},
 (b:any)=>{b.session.frames[1].mapId='other';},
 (b:any)=>{b.session.frames[1].timestamp=105;},
 (b:any)=>{b.session.frames[1].timestamp=999;},
 (b:any)=>{b.session.frames[1].position.x='2';},
 (b:any)=>{b.session.events[0].type='Execute';},
 (b:any)=>{b.session.endedAt=null;},
 (b:any)=>{b.session.frames=[];},
 (b:any)=>{b.session.resources=[{mapId:'other'}];},
])('rejects malformed or mixed-map backup %#',(mutate)=>{
 const b=backup();mutate(b);expect(()=>parseSessionBackup(JSON.stringify(b),'backup-test')).toThrow();
});
it('rejects foreign maps, invalid JSON and oversized files',()=>{
 expect(()=>parseSessionBackup(JSON.stringify(backup()),'cantagalo')).toThrow();
 expect(()=>parseSessionBackup('{','backup-test')).toThrow('JSON');
 expect(()=>parseSessionBackup(' '.repeat(MAX_BACKUP_BYTES+1),'backup-test')).toThrow('15 MiB');
});
it('restores a session, replays it and prevents duplicates from replacing history',async()=>{
 const b=backup('restore-test'),raw=JSON.stringify(b),c=new OperationController('restore-test');
 try{
  await c.importBackup(raw);expect(c.state.sessions).toHaveLength(1);
  c.openReplay(c.state.sessions[0]);expect(c.state.replay?.duration).toBe(30);
  await expect(c.importBackup(raw)).rejects.toThrow('já existe');
  expect(c.state.sessions).toHaveLength(1);
 }finally{c.dispose();}
});
it('rejects imports after disposal and preserves a full history',async()=>{
 const c=new OperationController('full-backup-test');
 try{
  for(let i=0;i<10;i++)await c.importBackup(JSON.stringify(backup(c.mapId)));
  await expect(c.importBackup(JSON.stringify(backup(c.mapId)))).rejects.toThrow('Histórico completo');
  expect(c.state.sessions).toHaveLength(10);
 }finally{c.dispose();}
 await expect(c.importBackup(JSON.stringify(backup(c.mapId)))).rejects.toThrow();
});
