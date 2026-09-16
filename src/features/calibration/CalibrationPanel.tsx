import {useRef,useState} from 'react';
import type {OperationalMap} from '../../types/maps';
import {calculate,emptyDraft,exportDraft,parseDraft,type Draft} from './calibration';
export const storageKey=(map:OperationalMap)=>`operational-twin:calibration:v1:${map.id}`;
export function CalibrationPanel({map,draft,onChange,onPick,picking,disabled}:{map:OperationalMap;draft:Draft;onChange:(d:Draft)=>void;onPick:()=>void;picking:boolean;disabled:boolean}){
 const [message,setMessage]=useState(''),file=useRef<HTMLInputElement>(null);
 let result:ReturnType<typeof calculate>|null=null,problem='';
 try{result=calculate(draft,map);}catch(e){problem=(e as Error).message;}
 const update=(id:string,patch:Partial<Draft['points'][number]>)=>onChange({...draft,points:draft.points.map(p=>p.id===id?{...p,...patch}:p)});
 const act=(fn:()=>void)=>{try{fn();}catch(e){setMessage((e as Error).message);}};
 return <section className="calibration-panel"><h2>Calibração · {map.name}</h2>
  <p className="notice">RASCUNHO · Validação de campo pendente. Selecione pelo menos 3 pontos espalhados no modelo e informe suas coordenadas WGS84 e fontes reais. Salve antes de sair; use Carregar salvo ao retornar. Pontos de verificação medem o erro sem participar do ajuste.</p>
  <fieldset disabled={disabled}>
   <button disabled={draft.points.length>=20} aria-pressed={picking} onClick={onPick}>{picking?'Clique na superfície do mapa…':'+ Ponto de controle'}</button>
   {draft.points.map((p,i)=><fieldset className="control-point" key={p.id}><legend>PC{String(i+1).padStart(2,'0')}</legend>
    <small>Modelo: X {p.local.x.toFixed(2)} · Y {p.local.y.toFixed(2)} · Z {p.local.z.toFixed(2)}</small>
    <label>Latitude<input aria-label={`Latitude PC${i+1}`} value={p.latitude} placeholder="Coordenada real" onChange={e=>update(p.id,{latitude:e.target.value})}/></label>
    <label>Longitude<input aria-label={`Longitude PC${i+1}`} value={p.longitude} placeholder="Coordenada real" onChange={e=>update(p.id,{longitude:e.target.value})}/></label>
    <label>Fonte do ponto<input aria-label={`Fonte PC${i+1}`} value={p.source} placeholder="Levantamento, identificação, data…" maxLength={500} onChange={e=>update(p.id,{source:e.target.value})}/></label>
    <label>Uso<select aria-label={`Uso PC${i+1}`} value={p.role} onChange={e=>update(p.id,{role:e.target.value as 'fit'|'check'})}><option value="fit">Ajuste</option><option value="check">Verificação independente</option></select></label>
    {result&&<p>Erro horizontal: {result.residuals[i].error.toFixed(3)} m</p>}
    <button onClick={()=>onChange({...draft,points:draft.points.filter(q=>q.id!==p.id)})}>Remover PC{i+1}</button>
   </fieldset>)}
   <div className="controls"><button onClick={()=>act(()=>{localStorage.setItem(storageKey(map),JSON.stringify(draft));setMessage('Rascunho salvo neste navegador.');})}>Salvar rascunho</button>
    <button onClick={()=>act(()=>{const data=localStorage.getItem(storageKey(map));if(!data)throw new Error('Nenhum rascunho salvo nesta localidade.');onChange(parseDraft(data,map));setMessage('Rascunho carregado.');})}>Carregar salvo</button>
    <button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(exportDraft(draft,map),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${map.id}-calibration-draft.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Exportar JSON</button>
    <button onClick={()=>file.current?.click()}>Importar JSON</button>
    <button onClick={()=>{onChange(emptyDraft(map));setMessage('Rascunho limpo. A cópia salva permanece disponível.');}}>Limpar tela</button></div>
   <input ref={file} type="file" accept="application/json,.json" hidden onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;try{if(f.size>100000)throw new Error('Arquivo muito grande.');onChange(parseDraft(await f.text(),map));setMessage('Rascunho importado, ainda não validado.');}catch(err){setMessage((err as Error).message);}}}/>
  </fieldset>
  {message&&<p role="status">{message}</p>}
  {result?<div className="notice"><h3>Ajuste horizontal calculado</h3><p>RMSE do ajuste: {result.rmse.toFixed(3)} m<br/>Erro máximo: {result.maxError.toFixed(3)} m<br/>RMSE independente: {result.checkRmse===null?'PENDENTE':`${result.checkRmse.toFixed(3)} m`}<br/>Escala candidata: {result.metersPerUnit.toFixed(6)} m/unidade<br/>Sinal Z estimado: {result.zSign}<br/>Ângulo X/(sinal·Z) → E/N: {result.rotationDegrees.toFixed(4)}°</p></div>:<p role="status">{problem}</p>}
  <p className="notice">O resultado não altera o mapa nem habilita telemetria real. Erro baixo no ajuste não comprova precisão em campo. Altitude e datum vertical permanecem pendentes. Projeção horizontal no elipsoide WGS84; limite de 20 km da origem documentada.</p>
 </section>;
}
