import {defineConfig,loadEnv} from 'vite';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'VITE_MAPS_BASE_URL');
 const remote=Boolean(process.env.VITE_MAPS_BASE_URL||env.VITE_MAPS_BASE_URL);
 return {publicDir:remote?false:'public',server:{watch:{usePolling:process.platform==='win32',interval:500,ignored:['**/public/maps/**']}},optimizeDeps:{esbuildOptions:{preserveSymlinks:true}},resolve:{preserveSymlinks:true}};
});
