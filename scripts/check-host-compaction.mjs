// Offline integration: real DSH preset loader/compactor, synthetic sessions, mocked LLM stream.
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mkdtemp,writeFile,readFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const modules=resolve(process.argv[2]??'.');
const host=createRequire(join(modules,'fixture-loader.cjs'));
const load=async name=>import(host.resolve('@deepseek-ai/'+name));
const {Context}=await load('cordis');
const plugins=await Promise.all(['cordis-plugin-loader','dsh-session','dsh-agent','dsh-session-projection','dsh-llm','dsh-system-prompt','dsh-tools','dsh-agent-loop','dsh-token-meter','dsh-commands','dsh-agent-preset-registry'].map(async name=>[name,(await load(name)).default]));
const persistence=await load('dsh-session-persistence-jsonl');
const nativeExecutor=await load('dsh-tool-executor-native');
const directory=await mkdtemp(join(tmpdir(),'tavern-compaction-'));
const ctx=new Context();
ctx.baseUrl=pathToFileURL(join(directory,'package.json')).href;
let runtime;
try {
 await writeFile(join(directory,'package.json'),JSON.stringify({type:'module'}));
 await symlink(modules,join(directory,'node_modules'),'dir');
 const configs={
  'cordis-plugin-loader':{baseUrl:pathToFileURL(join(directory,'package.json')).href},
  'dsh-system-prompt':{includeHarnessIdentity:false,includeRuntimeContext:false,personaPrefix:'',personaSuffix:''},
  'dsh-agent-loop':{agents:[],maxParallelToolCalls:2},
  'dsh-agent-preset-registry':{default:'tavern'},
 };
 for(const [name,plugin]of plugins){await ctx.plugin(plugin,configs[name]??{}).await();if(name==='cordis-plugin-loader')ctx.loader.builtins.group=(await load('cordis-plugin-loader')).Group;}
 await ctx.plugin(persistence,{root:join(directory,'sessions'),compression:'zstd',listConcurrency:2}).await();
 await ctx.plugin(nativeExecutor.default??nativeExecutor).await();
 const source=await readFile(new URL('../dist/dsh-tavern/lib/index.js',import.meta.url),'utf8');
 await writeFile(join(directory,'tavern.mjs'),source+'\nexport {TAVERN_PRESET_DEFINITION,TavernSessionRuntime,LibraryStore,TavernStorage,greetingSeed};');
 const {TAVERN_PRESET_DEFINITION:definition,TavernSessionRuntime:Runtime,LibraryStore,TavernStorage,greetingSeed}=await import(pathToFileURL(join(directory,'tavern.mjs')));
 ctx.agentPresets.register(definition);
 const library=await LibraryStore.open(join(directory,'library'),console),storage=new TavernStorage(library,{get:()=>({})});
 await storage.upsertCharacter({id:'role-one',card:{data:{name:'角色甲',description:'虚构测试角色。',personality:'平静',scenario:'图书馆',system_prompt:'',post_history_instructions:'',mes_example:'',first_mes:''}}});
 const play={id:'play-one',sessionId:'fixture-director',characterIds:['role-one'],multiAgent:false,updatedAt:'v1',title:'Fixture'};
 await storage.upsertPlay(play);
 runtime=new Runtime({storage,logger:console,agents:ctx.agents,agentPresets:ctx.agentPresets,sessionPersistence:ctx.sessionPersistence,ensurePreset:async()=>{},workspace:()=>undefined,workspacePath:directory,defaultModel:()=>({provider:'fixture',model:'model-one'}),config:{scanMessages:12,worldInfoBudgetChars:8000}});
  const makeSeed=()=>{
  const result=[];
  for(let turn=1;turn<=8;turn++){
   const block=greetingSeed('角色甲：'+('当晚在图书馆确认计划，约定下次见面。'.repeat(80)),'fixture','model-one');
   const offset=result.length;
   for(const row of block){row.seq+=offset;if('turn'in row.data)row.data.turn=turn;if(row.type==='user/message')row.data.content[0].text='询问当前约定和场景。'.repeat(100);}
   result.push(...block);
  }
  return result;
 };
 const handle=await runtime.ensureDirector(play,makeSeed());
 const backend=ctx.agentPresets.serviceFor(handle.agent,'compaction');
 assert.ok(backend,'Tavern preset must actually mount an isolated compactor');
 assert.equal(backend.config.auto,true);
 console.log('PASS real preset mounting and automatic configuration');
 let mode='normal',began;
 const calls=[];
 ctx.llm.stream=async function*(request){
  calls.push(request);
  if(mode==='fail')throw Error('synthetic summary failure');
  if(mode==='wait'){
   began.resolve();
   await new Promise((_,reject)=>{if(request.signal.aborted)reject(request.signal.reason);else request.signal.addEventListener('abort',()=>reject(request.signal.reason),{once:true})});
  }
  yield {type:'text-delta',index:0,text:request.purpose==='compaction'?'当前剧情：双方已约定在图书馆会合，尚未见面。':'角色甲：收到。'};
  yield {type:'finish',reason:'stop'};
 };
 ctx.llm.resolveModelInfo=async()=>({context:{contextWindow:16384},defaultMaxTokens:512});
 const before=structuredClone(handle.agent.session.snapshotEvents());
 const result=await runtime.compactPlay(play.id);

 assert.equal(result.compacted,true);assert.equal(calls.length,1);
 assert.ok(calls[0].messages.some(m=>m.role==='system'&&m.content.some(b=>b.text?.includes('角色扮演剧情'))));
 const after=handle.agent.session.snapshotEvents();
 assert.deepEqual(after.slice(0,before.length),before,'Original events must remain an exact prefix');
 assert.ok(after.some(e=>e.type==='compaction/summary'));
 console.log('PASS native manual compaction, story instructions, and original event preservation');
 assert.ok(ctx.commands.list(handle.agent).some(command=>command.name==='compact'));
 const makePlay=async name=>{
  const next={...play,id:name,sessionId:name};await storage.upsertPlay(next);
  const h=await runtime.ensureDirector(next,makeSeed());return {play:next,agent:h.agent,backend:runtime.configureCompaction(h.agent)};
 };
 const failed=await makePlay('fixture-failed');
 const failedOriginal=structuredClone(failed.agent.session.snapshotEvents());
 let rows=structuredClone(failed.agent.session.snapshotEvents()),surface=[...failed.agent.session.surface.nodes];
 mode='fail';
 await assert.rejects(runtime.compactPlay(failed.play.id),e=>e.code==='summary');
 assert.deepEqual(failed.agent.session.snapshotEvents().slice(0,rows.length),rows);
 assert.deepEqual([...failed.agent.session.surface.nodes],surface);
 assert.equal(failed.agent.status,'idle');
 const cancelled=await makePlay('fixture-cancelled');
 const cancelledOriginal=structuredClone(cancelled.agent.session.snapshotEvents());
 rows=structuredClone(cancelled.agent.session.snapshotEvents());surface=[...cancelled.agent.session.surface.nodes];
 mode='wait';began=Promise.withResolvers();
 const controller=new AbortController();
 const pending=cancelled.backend.compactNow(cancelled.agent,controller.signal);
 await began.promise;
 await assert.rejects(runtime.compactPlay(cancelled.play.id),e=>e.code==='busy');
 controller.abort(Error('fixture cancellation'));
 await assert.rejects(pending);assert.equal(cancelled.agent.status,'idle');
 assert.deepEqual(cancelled.agent.session.snapshotEvents().slice(0,rows.length),rows);
 assert.deepEqual([...cancelled.agent.session.surface.nodes],surface);
 mode='normal';
 const automatic=await makePlay('fixture-automatic');
 const automaticOriginal=structuredClone(automatic.agent.session.snapshotEvents());
 const callsBefore=calls.length;
 // First turn creates a routed request header; the next pre-step prices that envelope.
 automatic.agent.followup({id:'fixture-input-1',role:'user',content:[{type:'text',text:'请接话。'}],source:{kind:'user'}});
 await automatic.agent.whenIdle();
 automatic.agent.followup({id:'fixture-input-2',role:'user',content:[{type:'text',text:'继续当前场景。'}],source:{kind:'user'}});
 await automatic.agent.whenIdle();
 assert.ok(calls.slice(callsBefore).some(call=>call.purpose==='compaction'),'Automatic pre-step compaction must actually summarize');
 assert.ok(automatic.agent.session.snapshotEvents().some(e=>e.type==='compaction/summary'));
 assert.deepEqual(automatic.agent.session.snapshotEvents().slice(0,automaticOriginal.length),automaticOriginal);
 for(const request of calls.filter(call=>call.purpose==='compaction'))assert.equal(request.messages.filter(m=>m.role==='system'&&m.content.some(b=>b.text?.includes('本次压缩对象是角色扮演剧情'))).length,1);
 const command=await makePlay('fixture-command');
 const commandOriginal=structuredClone(command.agent.session.snapshotEvents());
 const commandResult=await ctx.commands.execute(command.agent,'/compact',[],new AbortController().signal);
 assert.equal(commandResult.result.kind,'success');
 assert.ok(command.agent.session.snapshotEvents().some(e=>e.type==='compaction/summary'));
 const empty={...play,id:'fixture-empty',sessionId:'fixture-empty'};await storage.upsertPlay(empty);
 await runtime.ensureDirector(empty,[]);assert.equal((await runtime.compactPlay(empty.id)).compacted,false);
 await ctx.sessionPersistence.flush();
 for(const [agent,original]of [[handle.agent,before],[failed.agent,failedOriginal],[cancelled.agent,cancelledOriginal],[automatic.agent,automaticOriginal],[command.agent,commandOriginal]]){
  const reader=await ctx.sessionPersistence.open(agent.session.id,'read');
  try{assert.deepEqual((await reader.read()).events,agent.session.snapshotEvents(),'Durable event log must exactly match all in-memory events');}finally{await reader.close();}
  if(original.length)assert.deepEqual(agent.session.snapshotEvents().slice(0,original.length),original);
 }
 const role=await runtime.ensureRoleAgent(play,storage.getCharacter('role-one'));
 assert.ok(ctx.agentPresets.serviceFor(role.agent,'compaction'));
 assert.ok(ctx.commands.list(role.agent).some(command=>command.name==='compact'));
 assert.equal(ctx.get('compaction'),undefined,'Preset compaction must not leak into the host root');
 console.log('PASS native command execution, concurrent refusal, empty history, failure/cancellation preservation, real automatic trigger, complete durable logs, role scope, and root isolation.');

} finally {
 if(runtime)await runtime.dispose();
 await ctx.fiber.dispose();
 await rm(directory,{recursive:true,force:true});
}
