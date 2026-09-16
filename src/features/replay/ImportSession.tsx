import {useState} from 'react';
import type {OperationController} from '../../app/OperationController';
import {MAX_BACKUP_BYTES,parseSessionBackup} from './sessionBackup';

export function ImportSession({controller,disabled}:{controller:OperationController;disabled:boolean}){
 const [draft,setDraft]=useState<{raw:string;frames:number;seconds:number}|null>(null);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 return <section aria-label="Restaurar backup">
  <label>Importar sessão JSON<input aria-label="Importar sessão JSON" type="file" accept=".json,application/json" disabled={disabled||busy} onChange={async e=>{
   const file=e.target.files?.[0];e.target.value='';setDraft(null);setMessage('');if(!file)return;
   setBusy(true);
   try{if(file.size>MAX_BACKUP_BYTES)throw new Error('Arquivo excede 15 MiB.');const raw=await file.text();const s=parseSessionBackup(raw,controller.mapId);setDraft({raw,frames:s.frames.length,seconds:(s.endedAt!-s.startedAt)/1000});}
   catch(error){setMessage(error instanceof Error?error.message:'Falha ao ler arquivo.');}finally{setBusy(false);}
  }}/></label>
  {draft&&<><p>Restaurar em {controller.mapId}: {draft.frames} frames · {draft.seconds.toFixed(1)} s · dados simulados. A sessão será salva no histórico desta conta ou navegador.</p><button disabled={disabled||busy} onClick={async()=>{setBusy(true);setMessage('');try{await controller.importBackup(draft.raw);setDraft(null);setMessage('Sessão restaurada no histórico.');}catch(error){setMessage(error instanceof Error?error.message:'Falha ao importar.');}finally{setBusy(false);}}}>Confirmar restauração</button><button disabled={busy} onClick={()=>setDraft(null)}>Cancelar importação</button></>}
  {busy&&<p role="status">Processando backup…</p>}{message&&<p role="status">{message}</p>}
 </section>;
}
