import {open,stat} from 'node:fs/promises';
import {loadEnv} from 'vite';
const base=process.env.VITE_MAPS_BASE_URL||loadEnv('production',process.cwd(),'VITE_MAPS_BASE_URL').VITE_MAPS_BASE_URL;
if(base){const url=new URL(base);if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('VITE_MAPS_BASE_URL deve ser uma URL pública, sem credenciais, query ou fragmento.');console.log('Mapas externos configurados; GLBs não serão incluídos no build.');}
else{
 if(process.argv.includes('--require-remote'))throw new Error('Defina VITE_MAPS_BASE_URL antes de gerar o build remoto.');
 for(const id of ['tabajaras','cantagalo']){const path=`public/maps/${id}/map.glb`;const file=await open(path,'r');try{const header=Buffer.alloc(12);await file.read(header,0,12,0);const {size}=await stat(path);if(header.readUInt32LE(0)!==0x46546c67||header.readUInt32LE(4)!==2||header.readUInt32LE(8)!==size)throw new Error(`GLB inválido: ${id}`);console.log(`${id}: GLB 2.0 válido, ${(size/1048576).toFixed(1)} MiB`);}finally{await file.close();}}
}
