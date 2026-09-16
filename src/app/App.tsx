import {canAccessMap} from '../features/auth/auth';
import {useState,lazy,Suspense} from 'react';
import {Catalog} from '../features/maps/Catalog';
const Workbench=lazy(()=>import('./Workbench').then(m=>({default:m.Workbench})));
import {getMap} from '../config/maps';
import {DEMO_SCENARIO_01} from '../config/demo';
export function App(){const [mapId,setMapId]=useState<string|null>(null),[autoDemo,setAutoDemo]=useState(false);const select=(id:string)=>{setAutoDemo(false);setMapId(id);};return <><header><strong>◈ OPERATIONAL TWIN <em>3D</em></strong><span className="badge">V1 · DADOS SIMULADOS</span></header>{mapId?<Suspense fallback={<main role="status">Preparando ambiente 3D…</main>}><Workbench key={mapId} map={getMap(mapId)} autoDemo={autoDemo} onExit={()=>{setMapId(null);setAutoDemo(false);}}/></Suspense>:<><Catalog onSelect={select}/><div className="demo-launch"><button disabled={!canAccessMap(DEMO_SCENARIO_01.mapId)} onClick={()=>{setAutoDemo(true);setMapId(DEMO_SCENARIO_01.mapId);}}>EXECUTAR DEMONSTRAÇÃO</button><p>Demo Scenario 01 · fluxo completo com dados simulados</p></div></>}<footer>SIMULATE → OPERATE → REPLAY <span>Georreferenciamento de campo pendente</span></footer></>}
