const finite=v=>typeof v==='number'&&Number.isFinite(v);
const text=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const point=v=>v&&[v.x,v.y,v.z].every(finite);
export function validatePlanning(d,mapId){
 const m=d?.mission;
 if(!d||d.schema!=='operational-twin-planning-v1'||d.mapId!==mapId||typeof d.reference!=='string'||d.reference.length>10000||!finite(d.savedAt)||!finite(d.yaw)||Math.abs(d.yaw)>180||!finite(d.pitch)||Math.abs(d.pitch)>90||typeof d.vision!=='boolean'||!m||m.mapId!==mapId||!text(m.id)||!finite(m.speed)||m.speed<=0||m.speed>500||typeof m.returnToBase!=='boolean'||!Array.isArray(m.waypoints)||m.waypoints.length>100||m.waypoints.some(w=>!w||w.mapId!==mapId||!text(w.id)||!point(w.ground)||!finite(w.altitude)||w.altitude<0||w.altitude>1000)||!Array.isArray(d.resources)||d.resources.length>1000||d.resources.some(r=>!r||r.mapId!==mapId||!text(r.id)||!text(r.name)||!point(r.position)||!['drone','team','vehicle'].includes(r.kind)||typeof r.available!=='boolean'||!finite(r.simulatedSpeed)||r.simulatedSpeed<=0))throw new Error('Planejamento inválido ou de outra localidade.');
 if(new Set(m.waypoints.map(w=>w.id)).size!==m.waypoints.length)throw new Error('Waypoints duplicados.');
 return d;
}
