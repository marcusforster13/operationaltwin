import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import type {OperationalMap} from '../../types/maps';
import {disposeObject} from '../../utils/three/dispose';
export type MapMetrics={min:number[];max:number[];size:number[];triangles:number;materials:number;textures:number;objects:number;geometryMiB:number;estimatedTextureMiB:number;loadMs:number};
export class MapLoader{
 private queue:Promise<unknown>=Promise.resolve();private active:THREE.Group|null=null;private controller:AbortController|null=null;private version=0;
 readonly lifecycle={activeMaps:0,loads:0,disposals:0,lastDisposedTextures:0};
 clear(){this.version++;this.controller?.abort();this.controller=null;if(this.active){const d=disposeObject(this.active);this.lifecycle.lastDisposedTextures=d.textures;this.lifecycle.disposals++;this.active=null;this.lifecycle.activeMaps=0;}}
 load(map:OperationalMap,onProgress:(message:string)=>void):Promise<{root:THREE.Group;metrics:MapMetrics}|null>{
  this.clear();const version=this.version;
  const job=async()=>{if(version!==this.version)return null;const controller=new AbortController();this.controller=controller;const start=performance.now();const timeout=setTimeout(()=>controller.abort(new Error('Tempo de download excedido. Tente novamente.')),120000);
   let bytes:ArrayBuffer;try{onProgress('Baixando GLB…');const response=await fetch(map.modelUrl,{signal:controller.signal});if(!response.ok)throw new Error(response.status===404?'ASSET PENDING: GLB não encontrado.':'Falha HTTP '+response.status);bytes=await response.arrayBuffer();}finally{clearTimeout(timeout);}
   if(version!==this.version)return null;if(bytes.byteLength<12||new DataView(bytes).getUint32(0,true)!==0x46546c67)throw new Error('Asset inválido: a resposta não é um GLB. Verifique o caminho do mapa.');
   onProgress('Decodificando geometria e texturas…');const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes,map.modelUrl.slice(0,map.modelUrl.lastIndexOf('/')+1));
   if(version!==this.version){disposeObject(gltf.scene);return null;}
   const root=gltf.scene;root.scale.setScalar(map.transform.scale);root.rotation.y=map.transform.rotationY;root.position.copy(map.transform.position);root.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(root);if(box.isEmpty()){disposeObject(root);throw new Error('GLB sem geometria visível.');}
   const materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();let triangles=0,objects=0;root.traverse(o=>{if(o instanceof THREE.Mesh){objects++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;o.castShadow=false;o.receiveShadow=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v instanceof THREE.Texture)textures.add(v);}}});
   const arrays=new Set<ArrayBufferLike>();root.traverse(o=>{if(o instanceof THREE.Mesh){for(const a of Object.values(o.geometry.attributes))if(a instanceof THREE.BufferAttribute)arrays.add(a.array.buffer);else if(a instanceof THREE.InterleavedBufferAttribute)arrays.add(a.data.array.buffer);if(o.geometry.index)arrays.add(o.geometry.index.array.buffer);}});const geometryMiB=[...arrays].reduce((sum,a)=>sum+a.byteLength,0)/1048576;const estimatedTextureMiB=[...textures].reduce((sum,t)=>{const img=t.source?.data;return sum+(img?.width??0)*(img?.height??0)*4*(t.generateMipmaps?4/3:1);},0)/1048576;this.active=root;this.lifecycle.activeMaps=1;this.lifecycle.loads++;
   return {root,metrics:{min:box.min.toArray(),max:box.max.toArray(),size:box.getSize(new THREE.Vector3()).toArray(),triangles,materials:materials.size,textures:textures.size,objects,geometryMiB,estimatedTextureMiB,loadMs:performance.now()-start}};
  };
  const pending=this.queue.then(job);
  // Only the caller handles failures; the queue must remain usable after an error/cancel.
  this.queue=pending.then(()=>undefined,()=>undefined);return pending;
 }
}
export const mapLoader=new MapLoader();

