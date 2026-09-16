import {afterEach,expect,it,vi} from 'vitest';
import {waitForBackend} from './backendHealth';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const healthy=()=>Response.json({mode:'REMOTE_SIMULATION',authRequired:true});
it('recovers from startup HTTP and network failures without disabling authentication',async()=>{
 vi.useFakeTimers();const fetch=vi.fn().mockResolvedValueOnce(new Response('',{status:503})).mockRejectedValueOnce(new TypeError('network')).mockResolvedValueOnce(healthy());vi.stubGlobal('fetch',fetch);
 const result=waitForBackend('https://example.invalid',new AbortController().signal);
 await vi.advanceTimersByTimeAsync(6000);
 expect(await result).toEqual({mode:'REMOTE_SIMULATION',authRequired:true});expect(fetch).toHaveBeenCalledTimes(3);
});
it('does not treat a malformed health response as permission to skip login',async()=>{
 vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn().mockImplementation(async()=>Response.json({mode:'REMOTE_SIMULATION'})));
 const result=expect(waitForBackend('https://example.invalid',new AbortController().signal)).rejects.toThrow('90 segundos');
 await vi.advanceTimersByTimeAsync(90000);await result;
});
it('cancels pending retries when the screen unmounts',async()=>{
 vi.useFakeTimers();const fetch=vi.fn().mockRejectedValue(new TypeError('offline'));vi.stubGlobal('fetch',fetch);const abort=new AbortController();
 const result=expect(waitForBackend('https://example.invalid',abort.signal)).rejects.toMatchObject({name:'AbortError'});
 await vi.advanceTimersByTimeAsync(1);abort.abort();await result;await vi.advanceTimersByTimeAsync(90000);expect(fetch).toHaveBeenCalledTimes(1);
});
