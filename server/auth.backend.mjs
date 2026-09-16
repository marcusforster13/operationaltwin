import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBackend} from './index.mjs';
import {HttpError,SupabaseService} from './supabase.mjs';
test('authenticated HTTP routes reject missing access and isolate simulation ownership',async()=>{
 const store=new Map();const cloud={authenticate:async header=>{if(!['Bearer a','Bearer b'].includes(header))throw new HttpError(401,'Login necessário');return{userId:header.slice(7),maps:new Set(['tabajaras'])};},list:async(map,u)=>store.get(u.userId)||[],save:async(s,u)=>store.set(u.userId,[s]),login:async()=>({}),logout:async()=>{}};
 const server=createBackend({cloud});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const call=(path,user,body,method=body?'POST':'GET')=>fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{Authorization:`Bearer ${user}`}:{})},body:body?JSON.stringify(body):undefined});
 try{assert.equal((await call('/maps/tabajaras/sessions')).status,401);assert.equal((await call('/maps/cantagalo/sessions','a')).status,403);
 const s={id:'s',mapId:'tabajaras',mode:'simulation',startedAt:1,endedAt:2,mission:{mapId:'tabajaras',waypoints:[]},frames:[],events:[]};assert.equal((await call('/maps/tabajaras/sessions','a',s,'PUT')).status,200);assert.deepEqual(await(await call('/maps/tabajaras/sessions','b')).json(),[]);
 const run=await(await call('/maps/tabajaras/simulations','a',{route:[{x:0,y:0,z:0},{x:10,y:0,z:0}],speed:1})).json();assert.equal((await call(`/maps/tabajaras/simulations/${run.id}`,'b')).status,404);assert.equal((await call(`/maps/tabajaras/simulations/${run.id}/command`,'b',{command:'stop'})).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
test('Supabase adapter validates tokens with Auth and uses user credentials for database access',async()=>{
 const calls=[];const token=`x.${Buffer.from(JSON.stringify({exp:Date.now()/1000+3600})).toString('base64url')}.y`;
 const service=new SupabaseService('https://test.supabase.co','sb_publishable_test',async(url,init)=>{calls.push({url,init});return Response.json(url.endsWith('/auth/v1/user')?{id:'a'}:url.includes('twin_map_access')?[{map_id:'tabajaras'}]:[]);});
 await assert.rejects(()=>service.authenticate(),/Login/);const user=await service.authenticate(`Bearer ${token}`);assert.deepEqual([...user.maps],['tabajaras']);await service.list('tabajaras',user);assert.equal(calls.at(-1).init.headers.Authorization,`Bearer ${token}`);await service.authenticate(`Bearer ${token}`);assert.equal(calls.filter(c=>c.url.endsWith('/auth/v1/user')).length,1);
 assert.throws(()=>new SupabaseService('https://test.supabase.co','sb_secret_forbidden'));
 const denied=new SupabaseService('https://test.supabase.co','sb_publishable_test',async()=>new Response('',{status:401}));await assert.rejects(()=>denied.authenticate('Bearer invalid'),/Acesso recusado/);
});
