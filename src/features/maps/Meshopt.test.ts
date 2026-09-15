import {it,expect,vi} from 'vitest';
import {MeshoptEncoder} from 'meshoptimizer';
import {MapLoader} from './MapLoader';
import {MAPS} from '../../config/maps';

it('loads an EXT_meshopt_compression GLB through the real map loader and disposes it',async()=>{
 await MeshoptEncoder.ready;
 const positions=new Float32Array([0,0,0,1,0,0,0,1,0]);
 const encoded=MeshoptEncoder.encodeGltfBuffer(new Uint8Array(positions.buffer),3,12,'ATTRIBUTES');
 const doc={asset:{version:'2.0'},extensionsUsed:['EXT_meshopt_compression'],extensionsRequired:['EXT_meshopt_compression'],scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,1,0]}],buffers:[{byteLength:encoded.length},{byteLength:36,extensions:{EXT_meshopt_compression:{fallback:true}}}],bufferViews:[{buffer:1,byteOffset:0,byteLength:36,extensions:{EXT_meshopt_compression:{buffer:0,byteOffset:0,byteLength:encoded.length,byteStride:12,count:3,mode:'ATTRIBUTES',filter:'NONE'}}}]};
 const json=new TextEncoder().encode(JSON.stringify(doc)),jsonLength=Math.ceil(json.length/4)*4,binLength=Math.ceil(encoded.length/4)*4;
 const bytes=new Uint8Array(28+jsonLength+binLength),header=new DataView(bytes.buffer);
 header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,bytes.length,true);header.setUint32(12,jsonLength,true);header.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+jsonLength);bytes.set(json,20);header.setUint32(20+jsonLength,binLength,true);header.setUint32(24+jsonLength,0x004e4942,true);bytes.set(encoded,28+jsonLength);
 const mock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(bytes));const loader=new MapLoader();
 try{const result=await loader.load({...MAPS[0],transform:{scale:1,rotationY:0,position:{x:0,y:0,z:0}}},()=>{});expect(result?.metrics.triangles).toBe(1);expect(result?.metrics.min).toEqual([0,0,0]);expect(result?.metrics.max).toEqual([1,1,0]);expect(loader.lifecycle.activeMaps).toBe(1);loader.clear();expect(loader.lifecycle.activeMaps).toBe(0);expect(loader.lifecycle.disposals).toBe(1);}finally{loader.clear();mock.mockRestore();}
});
