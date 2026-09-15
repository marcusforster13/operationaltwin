import type {RecordedSession} from '../../types/domain';
export interface SessionRepository{save(session:RecordedSession):void;list(mapId:string):RecordedSession[];}
export class MemorySessionRepository implements SessionRepository{
 private sessions:RecordedSession[]=[];
 save(session:RecordedSession){this.sessions=[...this.sessions.filter(s=>s.id!==session.id),structuredClone(session)].slice(-10);}
 list(mapId:string){return this.sessions.filter(s=>s.mapId===mapId).map(s=>structuredClone(s));}
}
export const sessionRepository=new MemorySessionRepository();
