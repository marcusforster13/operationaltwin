import {describe,it,expect} from 'vitest';
import {MockTelemetryProvider,sampleRoute} from './MockTelemetryProvider';
import type {DroneTelemetry} from '../../types/domain';
describe('mock provider',()=>{
 it('moves by elapsed time independent of frame subdivision',()=>{const run=(steps:number[])=>{const p=new MockTelemetryProvider('map-a');let last:DroneTelemetry|undefined;p.subscribe(d=>last=d);p.start([{x:0,y:0,z:0},{x:100,y:0,z:0}],10,1000);steps.forEach(dt=>p.advance(dt));return last!;};expect(run([2]).position).toEqual(run([.5,.5,.5,.5]).position);expect(run([2]).position.x).toBe(20);expect(run([2]).mapId).toBe('map-a');});
 it('pauses, resumes, stops and unsubscribes',()=>{const p=new MockTelemetryProvider('map-b');const frames:DroneTelemetry[]=[];const off=p.subscribe(d=>frames.push(d));p.start([{x:0,y:0,z:0},{x:100,y:0,z:0}],10,0);p.advance(1);p.pause();p.advance(30);expect(frames.at(-1)!.position.x).toBe(10);p.resume();p.advance(1);expect(frames.at(-1)!.position.x).toBe(20);p.stop();p.advance(1);expect(frames.at(-1)!.position.x).toBe(20);off();});
 it('finishes exactly at final waypoint and handles duplicates',()=>{const r=[{x:0,y:0,z:0},{x:0,y:0,z:0},{x:10,y:10,z:0}];expect(sampleRoute(r,100).position).toEqual(r[2]);expect(sampleRoute(r,100).completed).toBe(true);expect(sampleRoute(r,1).heading).toBe(90);});
});
