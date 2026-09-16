import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackend} from './index.mjs';
const record=(id='one')=>({id,mapId:'tabajaras',mode:'simulation',startedAt:1,endedAt:2,mission:{mapId:'tabajaras',waypoints:[]},frames:[],events:[]});
test('HTTP backend persists across restart, isolates maps and controls simulated telemetry',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'twin-test-'));let server;
 const start=async()=>{server=createBackend({directory,origins:['http://127.0.0.1:5177']});await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};
 const close=()=>new Promise(r=>server.close(r));
 try{let base=await start();const call=(path,body,method=body?'POST':'GET',headers={})=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});
 assert.equal((await call('/health')).status,200);
 assert.equal((await call('/health',undefined,'GET',{Origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await call('/maps/unknown/sessions')).status,404);
 assert.equal((await call('/maps/cantagalo/sessions',record(),'PUT')).status,400);
 assert.equal((await call('/maps/tabajaras/sessions',record(),'PUT')).status,200);
 await close();base=await start();assert.equal((await(await call('/maps/tabajaras/sessions')).json()).length,1);assert.deepEqual(await(await call('/maps/cantagalo/sessions')).json(),[]);
 for(let i=0;i<12;i++)assert.equal((await call('/maps/tabajaras/sessions',{...record(String(i)),startedAt:i+10},'PUT')).status,200);
 assert.equal((await(await call('/maps/tabajaras/sessions')).json()).length,10);
 const route=[{x:0,y:30,z:0},{x:100,y:30,z:0}];const creation=await call('/maps/tabajaras/simulations',{route,speed:10});assert.equal(creation.status,201);const {id}=await creation.json();const path=`/maps/tabajaras/simulations/${id}`;
 const a=await(await call(path)).json();assert.equal(a.mapId,'tabajaras');assert.equal(a.state,'flying');assert.equal((await call(`/maps/cantagalo/simulations/${id}`)).status,404);
 await call(path+'/command',{command:'pause'});const paused=await(await call(path)).json();assert.equal(paused.state,'paused');assert.equal(paused.speed,0);
 await call(path+'/command',{command:'resume'});assert.equal((await(await call(path)).json()).state,'flying');
 await call(path+'/command',{command:'stop'});assert.equal((await(await call(path)).json()).state,'completed');
 }finally{await close();await rm(directory,{recursive:true,force:true});}
});
