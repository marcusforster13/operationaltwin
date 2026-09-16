import type {OperationalMap,Vec3} from '../../types/maps';
export type ControlPoint={id:string;local:Vec3;latitude:string;longitude:string;source:string;role:'fit'|'check'};
export type Draft={version:1;mapId:string;frame:string;points:ControlPoint[]};
export const frameKey=(map:OperationalMap)=>JSON.stringify({source:map.sourceFile,origin:map.geo.origin,transform:map.transform});
export const emptyDraft=(map:OperationalMap):Draft=>({version:1,mapId:map.id,frame:frameKey(map),points:[]});
const number=(s:string)=>{if(!s.trim())throw new Error('Preencha latitude e longitude de todos os pontos.');const n=Number(s.replace(',','.'));if(!Number.isFinite(n))throw new Error('Coordenada inválida.');return n;};
// WGS84 ECEF -> local ENU, projected on the ellipsoid (h=0), horizontal only.
// Reference: https://gssc.esa.int/navipedia/index.php/Transformations_between_ECEF_and_ENU_coordinates
export function horizontal(lat:number,lon:number,origin:{lat:number;lon:number}){
 if(![lat,lon,origin.lat,origin.lon].every(Number.isFinite)||Math.abs(lat)>90||Math.abs(lon)>180||Math.abs(origin.lat)>90||Math.abs(origin.lon)>180)throw new Error('Latitude/longitude fora do intervalo.');
 const rad=Math.PI/180,a=6378137,e2=6.6943799901413165e-3;
 const ecef=(latitude:number,longitude:number)=>{const p=latitude*rad,l=longitude*rad,n=a/Math.sqrt(1-e2*Math.sin(p)**2);return[n*Math.cos(p)*Math.cos(l),n*Math.cos(p)*Math.sin(l),n*(1-e2)*Math.sin(p)];};
 const p=ecef(lat,lon),o=ecef(origin.lat,origin.lon),[x,y,z]=p.map((v,i)=>v-o[i]),l=origin.lon*rad,f=origin.lat*rad;
 const east=-Math.sin(l)*x+Math.cos(l)*y,north=-Math.sin(f)*Math.cos(l)*x-Math.sin(f)*Math.sin(l)*y+Math.cos(f)*z;
 if(Math.hypot(...p.map((v,i)=>v-o[i]))>20000)throw new Error('Ponto a mais de 20 km da origem. Confira coordenadas e localidade.');
 return{east,north};
}
export type Pair={id:string;x:number;z:number;east:number;north:number;role:'fit'|'check'};
export function fitHorizontal(pairs:Pair[]){
 const fit=pairs.filter(p=>p.role==='fit');if(fit.length<3)throw new Error('Use pelo menos 3 pontos de ajuste, distribuídos pelo mapa.');
 if(pairs.some(p=>![p.x,p.z,p.east,p.north].every(Number.isFinite)))throw new Error('Ponto inválido.');
 for(let i=0;i<fit.length;i++)for(let j=0;j<i;j++)if(Math.hypot(fit[i].x-fit[j].x,fit[i].z-fit[j].z)<1e-8||Math.hypot(fit[i].east-fit[j].east,fit[i].north-fit[j].north)<1e-8)throw new Error('Pontos repetidos: use referências distintas.');
 const mean=(key:'x'|'z'|'east'|'north')=>fit.reduce((s,p)=>s+p[key],0)/fit.length;
 const x=mean('x'),z=mean('z'),e=mean('east'),n=mean('north');let xx=0,zz=0,xz=0,ee=0,nn=0,en=0,ac=0,bc=0;
 for(const p of fit){const dx=p.x-x,dz=p.z-z,de=p.east-e,dn=p.north-n;xx+=dx*dx;zz+=dz*dz;xz+=dx*dz;ee+=de*de;nn+=dn*dn;en+=de*dn;ac+=dx*de+dz*dn;bc+=dx*dn-dz*de;}
 if(xx+zz<1e-12||ee+nn<1e-12||(xx*zz-xz*xz)/(xx+zz)**2<1e-6||(ee*nn-en*en)/(ee+nn)**2<1e-6)throw new Error('Pontos repetidos, alinhados ou pouco distribuídos. Escolha pontos espalhados.');
 const a=ac/(xx+zz),b=bc/(xx+zz),scale=Math.hypot(a,b);if(!Number.isFinite(scale)||scale<1e-12)throw new Error('Ajuste degenerado: confira os pares de pontos e os eixos.');
 const eastOffset=e-a*x+b*z,northOffset=n-b*x-a*z;
 const residuals=pairs.map(p=>{const eastError=a*p.x-b*p.z+eastOffset-p.east,northError=b*p.x+a*p.z+northOffset-p.north;return{id:p.id,role:p.role,eastError,northError,error:Math.hypot(eastError,northError)};});
 const errors=residuals.filter(p=>p.role==='fit'),checks=residuals.filter(p=>p.role==='check');
 return{a,b,eastOffset,northOffset,metersPerUnit:scale,rotationDegrees:Math.atan2(b,a)*180/Math.PI,rmse:Math.sqrt(errors.reduce((s,p)=>s+p.error**2,0)/errors.length),maxError:Math.max(...errors.map(p=>p.error)),checkRmse:checks.length?Math.sqrt(checks.reduce((s,p)=>s+p.error**2,0)/checks.length):null,residuals};
}
export function calculate(draft:Draft,map:OperationalMap){
 if(draft.mapId!==map.id||draft.frame!==frameKey(map))throw new Error('Referencial incompatível com a localidade.');
 const pairs=draft.points.map(p=>{if(!p.source.trim())throw new Error('Informe a fonte real de cada ponto.');return{id:p.id,x:p.local.x,z:p.local.z,...horizontal(number(p.latitude),number(p.longitude),map.geo.origin),role:p.role};});
 const candidates=[];let failure:unknown;
 for(const zSign of [1,-1]){try{candidates.push({...fitHorizontal(pairs.map(p=>({...p,z:zSign*p.z}))),zSign});}catch(e){failure=e;}}
 if(!candidates.length)throw failure;
 return candidates.reduce((best,c)=>c.rmse+1e-9<best.rmse?c:best);
}
export function parseDraft(text:string,map:OperationalMap):Draft{
 if(text.length>100000)throw new Error('Arquivo muito grande.');const raw=JSON.parse(text);if(!raw||typeof raw!=='object')throw new Error('Rascunho inválido.');const d=raw.draft??raw;
 if(d.version!==1||d.mapId!==map.id||d.frame!==frameKey(map)||!Array.isArray(d.points)||d.points.length>20)throw new Error('Rascunho incompatível: confira mapa, versão e referencial.');
 const ids=new Set<string>();
 const points=d.points.map((p:ControlPoint)=>{if(!p||typeof p.id!=='string'||p.id.length>100||ids.has(p.id)||!p.local||![p.local.x,p.local.y,p.local.z].every(v=>typeof v==='number'&&Number.isFinite(v))||!['fit','check'].includes(p.role)||![p.latitude,p.longitude,p.source].every(v=>typeof v==='string'&&v.length<=500))throw new Error('Ponto de controle inválido.');ids.add(p.id);return{id:p.id,local:{x:p.local.x,y:p.local.y,z:p.local.z},latitude:p.latitude,longitude:p.longitude,source:p.source,role:p.role};});
 return{version:1,mapId:map.id,frame:frameKey(map),points};
}
export function exportDraft(draft:Draft,map:OperationalMap){let candidate:ReturnType<typeof calculate>|null=null;try{candidate=calculate(draft,map);}catch{/* Incomplete drafts are exportable; never represented as calibrated. */}
 return{schema:'operational-twin-calibration-draft-v1',draft,origin:map.geo.origin,fieldCalibrated:false,altitudeReferenceValidated:false,altitudeDatum:null,candidate,convention:'E=a*X-b*(zSign*Z)+eastOffset; N=b*X+a*(zSign*Z)+northOffset. WGS84 tangent plane, ellipsoidal h=0 projection. No vertical fit.',status:'PENDING_FIELD_VALIDATION'};
}
