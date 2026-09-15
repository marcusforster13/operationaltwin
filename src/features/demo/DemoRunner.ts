import type {OperationController} from '../../app/OperationController';
import {DEMO_SCENARIO_01 as config} from '../../config/demo';
import {prepareScenario,type ScenarioWorld} from './scenario';
export type DemoState={stage:'idle'|'loading'|'incident'|'mission'|'flight'|'replay'|'complete'|'error';paused:boolean;message:string;frames:number;duration:number;error:string};
export class DemoRunner{
 state:DemoState={stage:'idle',paused:false,message:'Pronto para iniciar',frames:0,duration:0,error:''};private listeners=new Set<()=>void>();private timer:ReturnType<typeof setInterval>|null=null;private elapsed=0;private last=0;private world:ScenarioWorld|null=null;private generation=0;
 constructor(readonly controller:OperationController){}
 subscribe=(cb:()=>void)=>{this.listeners.add(cb);return()=>{this.listeners.delete(cb);};};getSnapshot=()=>this.state;
 private update(patch:Partial<DemoState>){this.state={...this.state,...patch};this.listeners.forEach(cb=>cb());}
 attach(world:ScenarioWorld|null){this.world=world;}
 start(){this.cancel();this.generation++;this.update({stage:'loading',paused:false,message:'Map Catalog → Map Loader · aguardando READY',frames:0,duration:0,error:''});this.last=performance.now();this.elapsed=0;this.timer=setInterval(()=>{const now=performance.now();const dt=now-this.last;this.last=now;if(!this.state.paused)this.advance(dt);},100);}
 private advance(dt:number){try{this.elapsed+=dt;switch(this.state.stage){case 'loading':if(this.world){const scenario=prepareScenario(this.controller.mapId,this.world);this.controller.clearScenario();this.controller.setResources(scenario.resources);this.controller.addIncident(scenario.incident,'alta','INCIDENTE 047');this.controller.setMission(scenario.mission);this.update({stage:'incident',message:'Incidente 047 · prioridade ALTA · recursos comparados'});this.elapsed=0;}break;
 case 'incident':if(this.elapsed>=config.stepDelayMs){this.update({stage:'mission',message:'Missão preparada · 5 waypoints · Drone 02, recurso aéreo disponível'});this.elapsed=0;}break;
 case 'mission':if(this.elapsed>=config.stepDelayMs){const generation=this.generation;this.controller.setVision(true);this.update({stage:'flight',message:'Drone 02 em voo · telemetria, FOV e gravação simulados'});void this.controller.start().catch(e=>{if(generation===this.generation)this.fail(e);});this.elapsed=0;}break;
 case 'flight':if(this.controller.state.status==='completed'&&!this.controller.state.recording){const session=this.controller.state.sessions.at(-1);if(!session?.frames.length)throw new Error('A missão terminou sem gravação.');this.controller.openReplay(session);this.controller.replayProvider!.play();this.update({stage:'replay',message:'RECORDED / REPLAY · reproduzindo a sessão gravada',frames:session.frames.length,duration:(session.endedAt!-session.startedAt)/1000});}break;
 case 'replay':{const r=this.controller.state.replay;if(r&&!r.playing&&r.offset>=r.duration){this.update({stage:'complete',message:'DEMONSTRAÇÃO CONCLUÍDA'});this.stopTimer();}break;}}}catch(e){this.fail(e);}}
 pause(){if(['idle','complete','error'].includes(this.state.stage))return;this.update({paused:true});if(this.state.stage==='flight')this.controller.pause();if(this.state.stage==='replay')this.controller.replayProvider?.pause();}
 resume(){if(!this.state.paused)return;this.last=performance.now();this.update({paused:false});if(this.state.stage==='flight')this.controller.resume();if(this.state.stage==='replay')this.controller.replayProvider?.play();}
 cancel(){this.generation++;this.stopTimer();this.controller.stop();this.controller.closeReplay();this.update({stage:'idle',paused:false,message:'Modo manual'});}
 fail(e:unknown){this.stopTimer();this.controller.stop();this.update({stage:'error',error:e instanceof Error?e.message:String(e),message:'Demonstração interrompida por erro'});}
 private stopTimer(){if(this.timer)clearInterval(this.timer);this.timer=null;}
 dispose(){this.stopTimer();this.generation++;this.listeners.clear();}
}
