import {backendUrl} from '../services/telemetry/RemoteSimulationProvider';
import {CalibrationPanel} from '../features/calibration/CalibrationPanel';
import {emptyDraft} from '../features/calibration/calibration';
import {useEffect,useState,useSyncExternalStore,useRef} from 'react';
import type {OperationalMap,Vec3} from '../types/maps';
import {Viewport} from '../features/twin/Viewport';
import {TwinWorld} from '../features/twin/TwinWorld';
import {drawMission,label} from '../features/twin/graphics';
import {disposeObject} from '../utils/three/dispose';
import {MissionPanel} from '../features/mission/MissionPanel';
import {OperationController} from './OperationController';
import {DroneVisual} from '../features/drone/DroneVisual';
import {IncidentPanel} from '../features/incident/IncidentPanel';
import {VisionVisual} from '../features/droneVision/VisionVisual';
import {TelemetryPanel} from '../features/drone/TelemetryPanel';
import {ReplayPanel} from '../features/replay/ReplayPanel';
import {DemoRunner} from '../features/demo/DemoRunner';
import {DemoPanel} from '../features/demo/DemoPanel';

export function Workbench({map,onExit,autoDemo=false}:{map:OperationalMap;onExit:()=>void;autoDemo?:boolean}){
 const [world,setWorld]=useState<TwinWorld|null>(null);
 const [controller]=useState(()=>new OperationController(map.id));
 const [demo]=useState(()=>new DemoRunner(controller));
 const demoState=useSyncExternalStore(demo.subscribe,demo.getSnapshot);
 const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
 const {mission,telemetry,trail,status,incidents,resources,recording,sessions,mode,replay,vision,yaw,pitch,error}=state;
 const [tool,setTool]=useState('navigate'),[panel,setPanel]=useState('mission'),[priority,setPriority]=useState<'alta'|'média'|'baixa'>('alta');
 const [draft,setDraft]=useState(()=>emptyDraft(map));
 const visual=useRef<DroneVisual|null>(null),visionVisual=useRef<VisionVisual|null>(null);
 const demoRunning=!['idle','complete','error'].includes(demoState.stage);
 const flying=status==='flying'||status==='paused';
 const locked=flying||mode==='recorded'||demoRunning;
 useEffect(()=>()=>{demo.dispose();controller.dispose();},[controller,demo]);
 useEffect(()=>{if(autoDemo)demo.start();return()=>demo.dispose();},[autoDemo,demo]);
 useEffect(()=>demo.attach(world),[world,demo]);
 useEffect(()=>{if(demoState.stage==='incident')setPanel('incident');if(demoState.stage==='replay'||mode==='recorded')setPanel('replay');},[demoState.stage,mode]);
 useEffect(()=>{if(!world)return;const group=drawMission(mission,world.extent*.012);world.overlays.add(group);return()=>{disposeObject(group);};},[world,mission]);
 useEffect(()=>{if(!world)return;const v=new DroneVisual(world.extent*.016);visual.current=v;world.overlays.add(v.group);return()=>{v.dispose();visual.current=null;};},[world]);
 useEffect(()=>visual.current?.update(telemetry,trail),[telemetry,trail,world]);
 useEffect(()=>{if(!world)return;const v=new VisionVisual(world.extent*.18);visionVisual.current=v;world.overlays.add(v.group);return()=>{v.dispose();visionVisual.current=null;};},[world]);
 useEffect(()=>{visionVisual.current?.update(telemetry,vision,mode==='recorded'?(telemetry?.gimbal?.yaw??0):yaw,mode==='recorded'?(telemetry?.gimbal?.pitch??-45):pitch);},[telemetry,vision,yaw,pitch,world,mode]);
 useEffect(()=>{if(!world||demoRunning)return;const positions=[[.35,.4],[.65,.55],[.4,.7]].map(([u,v])=>world.surface(u,v));controller.setResources(positions.flatMap((p,i)=>p?[{id:['drone-02','team-04','vehicle-07'][i],name:['Drone 02','Equipe 04','Viatura 07'][i],kind:(['drone','team','vehicle'] as const)[i],mapId:map.id,position:i===0?{...p,y:p.y+30}:p,available:true,simulatedSpeed:[10,1.5,5][i]}]:[]));},[world,controller,map.id]);
 useEffect(()=>{if(!world)return;const objects=[...incidents.map(i=>label(i.id,{...i.position,y:i.position.y+8},world.extent*.013,'#ffab86')),...resources.filter(r=>r.kind!=='drone').map(r=>label(r.name,{...r.position,y:r.position.y+8},world.extent*.013))];objects.forEach(o=>world.overlays.add(o));return()=>objects.forEach(disposeObject);},[world,incidents,resources]);
 useEffect(()=>{if(!world||panel!=='calibration')return;const markers=draft.points.map((p,i)=>label(`PC${String(i+1).padStart(2,'0')}`,{...p.local,y:p.local.y+world.extent*.005},world.extent*.016,'#ffe28a'));markers.forEach(o=>world.overlays.add(o));return()=>markers.forEach(disposeObject);},[world,draft,panel]);
 const pick=(p:Vec3)=>{
  if(tool==='calibration'&&panel==='calibration'&&!locked&&draft.points.length<20){setDraft({...draft,points:[...draft.points,{id:crypto.randomUUID(),local:p,latitude:'',longitude:'',source:'',role:'fit'}]});setTool('navigate');}
  if(tool==='incident'&&!demoRunning&&mode!=='recorded'){controller.addIncident(p,priority);setTool('navigate');setPanel('incident');}
  if(tool==='waypoint'&&!locked)controller.setMission({...mission,waypoints:[...mission.waypoints,{id:crypto.randomUUID(),mapId:map.id,ground:p,altitude:30}]});
 };
 const loadError=(message:string)=>{controller.stop();controller.reportError(message);if(demoRunning)demo.fail(message);};
 return <>
  <nav><button onClick={onExit}>← Localidades</button><strong>{map.name}</strong><span>mapId: {map.id}</span><button aria-pressed={tool==='navigate'} onClick={()=>setTool('navigate')}>Navegar</button><button disabled={!world||locked} aria-pressed={tool==='waypoint'} onClick={()=>{setTool('waypoint');setPanel('mission');}}>+ Waypoint</button><button disabled={!world||mode==='recorded'||demoRunning} aria-pressed={tool==='incident'} onClick={()=>{setTool('incident');setPanel('incident');}}>+ Incidente</button><span className="mode-label">{mode==='recorded'?'RECORDED / REPLAY':backendUrl?'REMOTE SIMULATION / DADOS SIMULADOS':'SIMULATION / MOCK DATA'}</span></nav>
  {(autoDemo||demoState.stage!=='idle')&&<DemoPanel runner={demo} state={demoState}/>}
  <div className="workspace"><Viewport map={map} onReady={setWorld} onError={loadError} onPick={pick}/>
   <aside>
    <div className="eyebrow">{mode==='recorded'?'REPLAY':flying?'OPERATE':'SIMULATE'}</div>
    {error&&<p role="alert" className="notice">{error}</p>}
    {panel!=='calibration'&&<><TelemetryPanel data={telemetry} recorded={mode==='recorded'}/>
    <fieldset disabled={demoRunning}>
     <div className="controls"><button disabled={!world||mission.waypoints.length<2||locked} onClick={()=>{setTool('navigate');void controller.start().catch(e=>controller.reportError(e));}}>Iniciar missão</button><button disabled={!flying||mode==='recorded'} onClick={()=>status==='paused'?controller.resume():controller.pause()}>{status==='paused'?'Retomar':'Pausar'}</button><button disabled={mode==='recorded'} onClick={()=>controller.reset()}>Reset</button></div>
     <div className="record-strip"><strong>{recording?'● GRAVANDO':'○ REC'}</strong><span>{sessions.length} sessões</span><button disabled={!recording} onClick={()=>controller.stop()}>Encerrar sessão</button></div>
    </fieldset>
    </>}
    <div className="panel-tabs" role="tablist" aria-label="Módulos">{[['mission','Missão'],['incident','Ocorrências'],['replay','Replay'],['calibration','Calibração']].map(([id,title])=><button role="tab" key={id} aria-selected={panel===id} onClick={()=>{setPanel(id);setTool('navigate');}}>{title}</button>)}</div>
    <fieldset disabled={demoRunning}>
     {panel==='calibration'&&<CalibrationPanel map={map} draft={draft} onChange={setDraft} onPick={()=>setTool(tool==='calibration'?'navigate':'calibration')} picking={tool==='calibration'} disabled={!world||locked}/>}
     {panel==='mission'&&<MissionPanel mission={mission} onChange={controller.setMission} disabled={locked}/>}
     {panel==='incident'&&<><label>Prioridade<select aria-label="Prioridade do incidente" value={priority} onChange={e=>setPriority(e.target.value as typeof priority)}><option>alta</option><option>média</option><option>baixa</option></select></label><IncidentPanel incidents={incidents} resources={resources} telemetry={telemetry}/></>}
     {panel==='replay'&&<ReplayPanel controller={controller} replay={replay} sessions={sessions} disabled={recording}/>}
     <details className="vision-panel"><summary>DRONE VISION · {vision?'ATIVO':'INATIVO'} · FOV SIMULADO</summary><label className="check"><input type="checkbox" checked={vision} onChange={e=>controller.setVision(e.target.checked)}/>Ativar Drone Vision</label><label>Gimbal yaw: {yaw}°<input disabled={mode==='recorded'} aria-label="Gimbal yaw" type="range" min="-180" max="180" value={yaw} onChange={e=>controller.setVision(vision,Number(e.target.value),pitch)}/></label><label>Gimbal pitch: {pitch}°<input disabled={mode==='recorded'} aria-label="Gimbal pitch" type="range" min="-90" max="0" value={pitch} onChange={e=>controller.setVision(vision,yaw,Number(e.target.value))}/></label></details>
    </fieldset>
    <details className="geo-panel"><summary>Georreferenciamento · PENDENTE</summary><p className="notice">Origem BLOSM: {map.geo.origin.lat}, {map.geo.origin.lon}. Calibração de campo: não validada. Escala métrica, norte e datum vertical: PENDENTES. Posições, alturas e velocidades em unidades do GLB.</p></details>
   </aside>
  </div>
 </>;
}
