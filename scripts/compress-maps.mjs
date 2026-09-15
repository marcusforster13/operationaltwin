import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {MeshoptEncoder} from 'meshoptimizer';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Lossless storage only: no simplification, quantization, reordering or image re-encoding.
const extension='EXT_meshopt_compression';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const componentSize={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
const typeSize={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
function parse(bytes){
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('Invalid GLB header');
 const size=bytes.readUInt32LE(12),offset=20+size;
 if(bytes.readUInt32LE(16)!==0x4e4f534a||bytes.readUInt32LE(offset+4)!==0x004e4942)throw new Error('Expected JSON + BIN');
 return {json:JSON.parse(bytes.subarray(20,offset).toString()),bin:bytes.subarray(offset+8,offset+8+bytes.readUInt32LE(offset))};
}
function pack(json,bin){
 const raw=Buffer.from(JSON.stringify(json));const text=Buffer.alloc(Math.ceil(raw.length/4)*4,32);raw.copy(text);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+bin.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
 return Buffer.concat([header,text,binHeader,bin]);
}
function triangles(doc){return doc.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>{if((p.mode??4)!==4)throw new Error('Non-triangle primitive');return n+doc.accessors[p.indices??p.attributes.POSITION].count/3;},0),0);}
await Promise.all([MeshoptEncoder.ready,MeshoptDecoder.ready]);
const [inputArg,outputArg]=process.argv.slice(2);
if(!inputArg||!outputArg||resolve(inputArg)===resolve(outputArg))throw new Error('Usage: node scripts/compress-maps.mjs <input.glb> <separate-output.glb>');
const original=await readFile(inputArg),source=parse(original),doc=structuredClone(source.json);
if(doc.buffers.length!==1||doc.buffers[0].uri||doc.extensionsUsed?.includes(extension))throw new Error('Expected uncompressed self-contained GLB');
let length=0,compressedViews=0;const chunks=[];
function append(data){const offset=length;chunks.push(Buffer.from(data));length+=data.length;const pad=(4-length%4)%4;if(pad){chunks.push(Buffer.alloc(pad));length+=pad;}return offset;}
const indexViews=new Set(doc.meshes.flatMap(m=>m.primitives.filter(p=>p.indices!==undefined).map(p=>doc.accessors[p.indices].bufferView)));
for(let i=0;i<doc.bufferViews.length;i++){
 const view=doc.bufferViews[i],raw=source.bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
 const accessors=doc.accessors.filter(a=>a.bufferView===i);
 let stride=view.byteStride??(accessors.length===1?componentSize[accessors[0].componentType]*typeSize[accessors[0].type]:0);
 const mode=indexViews.has(i)?'INDICES':'ATTRIBUTES';
 const supported=stride>0&&view.byteLength%stride===0&&(mode==='INDICES'?[2,4].includes(stride):stride%4===0&&stride<=256);
 if(accessors.length&&supported){
  const count=view.byteLength/stride,encoded=MeshoptEncoder.encodeGltfBuffer(raw,count,stride,mode);
  const decoded=new Uint8Array(raw.length);MeshoptDecoder.decodeGltfBuffer(decoded,count,stride,encoded,mode,'NONE');
  if(!raw.equals(Buffer.from(decoded)))throw new Error(`Round-trip mismatch: view ${i}`);
  if(encoded.length<raw.length){view.buffer=1;view.extensions={...view.extensions,[extension]:{buffer:0,byteOffset:append(encoded),byteLength:encoded.length,byteStride:stride,count,mode,filter:'NONE'}};compressedViews++;continue;}
 }
 view.buffer=0;view.byteOffset=append(raw);
}
doc.buffers=[{byteLength:length},{byteLength:source.json.buffers[0].byteLength,extensions:{[extension]:{fallback:true}}}];
doc.extensionsUsed=[...new Set([...(doc.extensionsUsed??[]),extension])];doc.extensionsRequired=[...new Set([...(doc.extensionsRequired??[]),extension])];
const result=pack(doc,Buffer.concat(chunks));
await mkdir(dirname(resolve(outputArg)),{recursive:true});await writeFile(outputArg,result);
// Independently reopen output, decode every buffer view with the app's exact decoder,
// and compare bytes, including images and all vertex/index attributes.
const reopened=parse(await readFile(outputArg));
for(let i=0;i<source.json.bufferViews.length;i++){
 const before=source.json.bufferViews[i],after=reopened.json.bufferViews[i],ext=after.extensions?.[extension];
 let decoded;
 if(ext){decoded=Buffer.alloc(after.byteLength);MeshoptDecoder.decodeGltfBuffer(decoded,ext.count,ext.byteStride,reopened.bin.subarray(ext.byteOffset,ext.byteOffset+ext.byteLength),ext.mode,ext.filter);}
 else decoded=reopened.bin.subarray(after.byteOffset??0,(after.byteOffset??0)+after.byteLength);
 if(!decoded.equals(source.bin.subarray(before.byteOffset??0,(before.byteOffset??0)+before.byteLength)))throw new Error(`Saved file differs: view ${i}`);
}
for(const key of ['accessors','meshes','nodes','scenes','scene','materials','textures','images','samplers','animations','skins'])if(JSON.stringify(source.json[key])!==JSON.stringify(reopened.json[key]))throw new Error(`Metadata changed: ${key}`);
const report={input:resolve(inputArg),output:resolve(outputArg),originalBytes:original.length,compressedBytes:result.length,reductionPercent:Number((100*(1-result.length/original.length)).toFixed(2)),triangles:triangles(doc),compressedViews,verifiedViews:doc.bufferViews.length,geometryAndImagesByteExact:true,metadataUnchanged:true,inputSha256:hash(original),outputSha256:hash(result)};
await writeFile(outputArg+'.report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
