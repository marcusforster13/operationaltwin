import type {OperationalMap} from '../types/maps';
const mapAssetsBase=(import.meta.env.VITE_MAPS_BASE_URL||'/maps').replace(/\/$/,'');
const common = {city:'Rio de Janeiro',state:'RJ',status:'source_georef_detected' as const,initialCamera:null};
// Identity preserves the exported GLB. It does not assert metric scale or north.
export const MAPS:OperationalMap[] = [
 {...common,id:'tabajaras',name:'Ladeira dos Tabajaras',description:'Primeira localidade · modelo 3D real',sourceFile:'copa.blend',modelUrl:`${mapAssetsBase}/tabajaras/map.glb`,transform:{scale:1,rotationY:0,position:{x:0,y:0,z:0}},geo:{sourceGeorefDetected:true,fieldCalibrated:false,origin:{lat:-22.968280792236328,lon:-43.18097496032715},bounds:{minLat:-22.970460891723633,maxLat:-22.966100692749023,minLon:-43.18505096435547,maxLon:-43.17689895629883},sourceHeightOffset:-2.63309645652771,altitudeReferenceValidated:false,metersPerUnit:null,northRotationY:null,altitudeDatum:null}},
 {...common,id:'cantagalo',name:'Cantagalo',description:'Segunda localidade · modelo 3D real',sourceFile:'cantagalo.blend',modelUrl:`${mapAssetsBase}/cantagalo/map.glb`,transform:{scale:1,rotationY:0,position:{x:0,y:0,z:0}},geo:{sourceGeorefDetected:true,fieldCalibrated:false,origin:{lat:-22.98066997528076,lon:-43.19454002380371},bounds:{minLat:-22.98348045349121,maxLat:-22.977859497070312,minLon:-43.19989013671875,maxLon:-43.18918991088867},sourceHeightOffset:-2.6398608684539795,altitudeReferenceValidated:false,metersPerUnit:null,northRotationY:null,altitudeDatum:null}}
];
export function getMap(id:string){const map=MAPS.find(m=>m.id===id);if(!map)throw new Error('Localidade desconhecida: '+id);return map;}
