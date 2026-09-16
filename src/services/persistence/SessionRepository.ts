import type {RecordedSession} from '../../types/domain';
export interface SessionStore{load():Promise<RecordedSession[]>;save(session:RecordedSession):Promise<void>;}
export type StorageStatus='memory'|'loading'|'saving'|'saved'|'error';
export interface SessionRepository{save(session:RecordedSession):void;list(mapId:string):RecordedSession[];}
export class MemorySessionRepository implements SessionRepository{
 protected sessions:RecordedSession[]=[];
 save(session:RecordedSession){const other=this.sessions.filter(s=>s.mapId!==session.mapId);const local=[...this.sessions.filter(s=>s.mapId===session.mapId&&s.id!==session.id),structuredClone(session)].sort((a,b)=>a.startedAt-b.startedAt).slice(-10);this.sessions=[...other,...local];}
 list(mapId:string){return this.sessions.filter(s=>s.mapId===mapId).map(s=>structuredClone(s));}
}
export class PersistentSessionRepository extends MemorySessionRepository{
 status:StorageStatus;private listeners=new Set<()=>void>();private queue:Promise<void>;private pending=0;private failed=false;
 constructor(private store?:SessionStore){super();this.status=store?'loading':'memory';this.queue=store?store.load().then(saved=>{const current=this.sessions;this.sessions=[];for(const s of saved)super.save(s);for(const s of current)super.save(s);this.status=this.pending?'saving':'saved';this.emit();}).catch(()=>{this.failed=true;this.status='error';this.emit();}):Promise.resolve();}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private emit(){this.listeners.forEach(fn=>fn());}
 whenSettled(){return this.queue;}
 override save(session:RecordedSession){super.save(session);if(!this.store){this.emit();return;}const copy=structuredClone(session);this.pending++;if(!this.failed)this.status='saving';this.emit();this.queue=this.queue.then(()=>this.store!.save(copy)).catch(()=>{this.failed=true;}).then(()=>{this.pending--;this.status=this.failed?'error':this.pending?'saving':'saved';this.emit();});}
}
export class IndexedDbSessionStore implements SessionStore{
 private db:Promise<IDBDatabase>;
 constructor(factory:IDBFactory,name='operational-twin-sessions-v1'){
  this.db=new Promise((resolve,reject)=>{const request=factory.open(name,1);request.onupgradeneeded=()=>{request.result.createObjectStore('sessions',{keyPath:['mapId','id']});};request.onerror=()=>reject(request.error);request.onblocked=()=>reject(new Error('Banco ocupado por outra versão.'));request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db);};});
 }
 async load(){const db=await this.db;return new Promise<RecordedSession[]>((resolve,reject)=>{const tx=db.transaction('sessions','readonly'),request=tx.objectStore('sessions').getAll();tx.oncomplete=()=>resolve(request.result);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}
 async save(session:RecordedSession){const db=await this.db;return new Promise<void>((resolve,reject)=>{const tx=db.transaction('sessions','readwrite'),store=tx.objectStore('sessions');store.put(session);const all=store.getAll();all.onsuccess=()=>{const local=(all.result as RecordedSession[]).filter(s=>s.mapId===session.mapId).sort((a,b)=>a.startedAt-b.startedAt);for(const old of local.slice(0,Math.max(0,local.length-10)))store.delete([old.mapId,old.id]);};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);});}
}
function createRepository(){try{return new PersistentSessionRepository(typeof indexedDB==='undefined'?undefined:new IndexedDbSessionStore(indexedDB));}catch{return new PersistentSessionRepository({load:()=>Promise.reject(new Error('Armazenamento indisponível')),save:()=>Promise.reject(new Error('Armazenamento indisponível'))});}}
export const sessionRepository=createRepository();
