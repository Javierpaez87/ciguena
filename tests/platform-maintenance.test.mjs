import test from 'node:test';
import assert from 'node:assert/strict';
import { maintenanceResponse, maintenanceEnabled, maintenanceClientHeaders } from '../netlify/lib/platformMaintenance.mjs';
import { examDraftKey, examDraftVersion, writeExamDraft, readExamDraft, clearExamDraft } from '../src/lib/maintenanceExamDraft.ts';
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='sb_secret_mock';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
const event=(token='')=>({httpMethod:'POST',headers:{Authorization:token?'Bearer '+token:'','x-ciguena-maintenance-actor':'spoofed'}});
const actor='11111111-1111-1111-1111-111111111111';
function mock({enabled=true,valid=true,allowed=true,superadmin=false,fail=false}={}) {
  return async(url,init)=>{
    if(url.endsWith('/get_platform_maintenance')) return fail?json({},500):json({enabled});
    if(url.endsWith('/auth/v1/user')) return valid?json({id:actor}):json({},401);
    if(url.endsWith('/maintenance_actor_authorized')) {
      const body=JSON.parse(init.body);
      assert.equal(body.p_auth_user_id,actor);
      return json(allowed&&(!body.p_superadmin_only||superadmin));
    }
    throw new Error('unexpected URL');
  };
}
test('off: no actor header, public endpoint works',async()=>{const e=event();assert.equal(await maintenanceResponse(e,'public',mock({enabled:false})),null);assert.deepEqual(maintenanceClientHeaders(e),{});});
test('on: public requests and no-token requests blocked',async()=>{assert.equal((await maintenanceResponse(event('token'),'public',mock())).statusCode,503);assert.equal((await maintenanceResponse(event(),'authorized',mock())).statusCode,503);});
test('on: ordinary and invalid accounts blocked',async()=>{for(const args of [{allowed:false},{valid:false}])assert.equal((await maintenanceResponse(event('token'),'authorized',mock(args))).statusCode,503);});
test('on: verified actor gets internal header, not caller spoof',async()=>{const e=event('token');assert.equal(await maintenanceResponse(e,'authorized',mock()),null);assert.deepEqual(maintenanceClientHeaders(e),{'x-ciguena-maintenance-actor':actor});});
test('legacy administrative endpoints require superadmin during maintenance',async()=>{assert.equal((await maintenanceResponse(event('token'),'superadmin',mock())).statusCode,503);assert.equal(await maintenanceResponse(event('token'),'superadmin',mock({superadmin:true})),null);});
test('status failure fails closed; scheduled job can check paused state',async()=>{assert.equal((await maintenanceResponse(event(),'authorized',mock({fail:true}))).statusCode,503);assert.equal(await maintenanceEnabled(mock()),true);await assert.rejects(maintenanceEnabled(mock({fail:true})));});
test('OPTIONS stays available',async()=>{assert.equal(await maintenanceResponse({httpMethod:'OPTIONS'},'public',()=>{throw Error('not called')}),null);});
const memory=new Map();globalThis.sessionStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const key=examDraftKey('profile','assignment','test'),version=examDraftVersion({id:'test',questions:['q1']});
const questions=[{id:'q1',optionKeys:['a','b']}];
const draft=()=>({version,attempt:1,currentQ:0,answers:{q1:'b'},optionOrder:{q1:['b','a']},savedAt:Date.now()});
test('exam draft restores chosen answers and exact option order',()=>{const d=draft();assert.equal(writeExamDraft(key,d),true);assert.deepEqual(readExamDraft(key,version,1,questions),d);clearExamDraft(key);assert.equal(readExamDraft(key,version,1,questions),null);});
test('exam draft refuses obsolete attempt, version or malformed order',()=>{for(const [d,v,a] of [[draft(),version,2],[draft(),'new',1],[{...draft(),optionOrder:{q1:['b','b']}},version,1],[{...draft(),savedAt:Date.now()-49*3600000},version,1]]){writeExamDraft(key,d);assert.equal(readExamDraft(key,v,a,questions),null);assert.equal(memory.has(key),false);}});
