import type {RecordedSession} from '../../types/domain';

export const MAX_BACKUP_BYTES = 15 * 1024 * 1024;
const object = (v: any): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const text = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 200;
const point = (v: any) => object(v) && [v.x,v.y,v.z].every(number);
const optionalNumber = (v: unknown) => v === undefined || number(v);
const nullableNumber = (v: unknown) => v === null || number(v);

export function parseSessionBackup(raw: string, mapId: string): RecordedSession {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new Error('Arquivo excede 15 MiB.');
  let envelope: any;
  try { envelope = JSON.parse(raw); } catch { throw new Error('JSON inválido.'); }
  const s = envelope?.session;
  const fail = () => { throw new Error('Backup inválido, incompleto ou incompatível com esta localidade.'); };
  if (envelope?.schema !== 'operational-twin-session-v1' || !object(s)) return fail();
  if (s.mapId !== mapId || s.mode !== 'simulation' || !text(s.id) || !text(s.droneId) ||
      !number(s.startedAt) || !number(s.endedAt) || s.startedAt < 0 || s.endedAt < s.startedAt) return fail();
  const m = s.mission;
  if (!object(m) || m.mapId !== mapId || !text(m.id) || !number(m.speed) || m.speed <= 0 || m.speed > 500 ||
      typeof m.returnToBase !== 'boolean' || !Array.isArray(m.waypoints) || m.waypoints.length > 100 ||
      m.waypoints.some((w:any) => !object(w) || w.mapId !== mapId || !text(w.id) || !point(w.ground) || !number(w.altitude) || w.altitude < 0 || w.altitude > 1000)) return fail();
  const time = (v:any) => number(v) && v >= s.startedAt && v <= s.endedAt;
  if (!Array.isArray(s.frames) || !s.frames.length || s.frames.length > 18000) return fail();
  let previous = s.startedAt;
  for (const f of s.frames) {
    if (!object(f) || f.mapId !== mapId || f.droneId !== s.droneId || !point(f.position) || !time(f.timestamp) || f.timestamp < previous ||
        ![f.altitude,f.speed,f.heading,f.battery].every(nullableNumber) || ![f.latitude,f.longitude].every(optionalNumber) ||
        !['online','stale','offline'].includes(f.connection) || (f.state !== undefined && !['idle','flying','paused','completed'].includes(f.state)) ||
        (f.gimbal !== undefined && (!object(f.gimbal) || ![f.gimbal.yaw,f.gimbal.pitch,f.gimbal.roll].every(optionalNumber)))) return fail();
    previous = f.timestamp;
  }
  if (!Array.isArray(s.events) || s.events.length > 18000) return fail();
  previous = s.startedAt;
  for (const e of s.events) {
    if (!object(e) || e.mapId !== mapId || !time(e.timestamp) || e.timestamp < previous || !['Start','Pause','Resume','Stop','Incident'].includes(e.type)) return fail();
    const i=e.incident;
    if ((e.type === 'Incident' && !i) || (i !== undefined && (!object(i) || i.mapId !== mapId || !text(i.id) || !number(i.timestamp) || !point(i.position) || !['alta','média','baixa'].includes(i.priority)))) return fail();
    previous=e.timestamp;
  }
  if (s.vision !== undefined && typeof s.vision !== 'boolean') return fail();
  if (s.resources !== undefined && (!Array.isArray(s.resources) || s.resources.length > 1000 || s.resources.some((r:any) =>
      !object(r) || r.mapId !== mapId || !text(r.id) || !text(r.name) || !point(r.position) || !['drone','team','vehicle'].includes(r.kind) || typeof r.available !== 'boolean' || !number(r.simulatedSpeed) || r.simulatedSpeed <= 0))) return fail();
  return s as RecordedSession;
}
