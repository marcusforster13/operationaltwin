type Health = {mode:'REMOTE_SIMULATION';authRequired:boolean};

/** Retry transient startup/network failures only; never bypass authentication. */
export async function waitForBackend(base:string,signal:AbortSignal):Promise<Health>{
 const deadline=Date.now()+90000;
 let delay=2000;
 while(!signal.aborted && Date.now()<deadline){
  try{
   const response=await fetch(base+'/health',{cache:'no-store',signal:AbortSignal.any([signal,AbortSignal.timeout(Math.min(15000,deadline-Date.now()))])});
   if(response.ok){
    const data=await response.json();
    if(data.mode==='REMOTE_SIMULATION'&&typeof data.authRequired==='boolean')return data;
   }
  }catch{if(signal.aborted)throw new DOMException('Cancelled','AbortError');}
  const remaining=deadline-Date.now();
  if(remaining<=0)break;
  await new Promise<void>((resolve,reject)=>{
   const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};
   const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},Math.min(delay,remaining));
   signal.addEventListener('abort',abort,{once:true});
   if(signal.aborted)abort();
  });
  delay=Math.min(delay*2,8000);
 }
 if(signal.aborted)throw new DOMException('Cancelled','AbortError');
 throw new Error('Não foi possível conectar após 90 segundos. Verifique sua conexão e tente novamente.');
}
