import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const requireHost=createRequire(resolve(process.argv[2] ?? '.', 'fixture-loader.cjs'));
const load=async name=>import(requireHost.resolve('@deepseek-ai/'+name));
const {Context}=await load('cordis');
const {default:SessionStore}=await load('dsh-session');
const {default:Agents}=await load('dsh-agent');
const {default:Projections}=await load('dsh-session-projection');
const {default:Llm}=await load('dsh-llm');
const {default:SystemPrompt}=await load('dsh-system-prompt');
const {default:Tools}=await load('dsh-tools');
const {default:AgentLoop}=await load('dsh-agent-loop');
const Persistence=await load('dsh-session-persistence-jsonl');
import {mkdtemp,rm,writeFile,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const directory=await mkdtemp(join(tmpdir(),'tavern-real-host-'));
const ctx=new Context();
try {
 for(const [plugin,config] of [[SessionStore,{}],[Agents,{}],[Projections,{}],[Llm,{}],[SystemPrompt,{includeHarnessIdentity:false,includeRuntimeContext:false,personaPrefix:'',personaSuffix:''}],[Tools,{}],[Persistence,{root:join(directory,'sessions'),compression:'zstd',listConcurrency:2}],[AgentLoop,{agents:[],maxParallelToolCalls:2}]]) {
  const fiber=ctx.plugin(plugin,config);await fiber.await();
 }
 console.log('SERVICES',!!ctx.agents,!!ctx.sessionPersistence,!!ctx.agentLoop);
 const code=await readFile(new URL('../dist/dsh-tavern/lib/index.js',import.meta.url),'utf8');
 await writeFile(join(directory,'tavern.mjs'),code+'\nexport {TavernSessionRuntime,LibraryStore,TavernStorage,greetingSeed};');
 const {TavernSessionRuntime:Runtime,LibraryStore,TavernStorage,greetingSeed}=await import(pathToFileURL(join(directory,'tavern.mjs')));
 const library=await LibraryStore.open(join(directory,'library'),console), storage=new TavernStorage(library,{get:()=>({})});
 await storage.upsertCharacter({id:'role-a',card:{data:{name:'角色甲'}}});
 await storage.upsertPreset({id:'preset-a',provider:'fixture',model:'model-a',maxTokens:300});
 await storage.upsertPreset({id:'preset-b',provider:'fixture',model:'model-b',maxTokens:600});
 const play={id:'play-one',sessionId:'host-session',characterIds:['role-a'],multiAgent:true,presetId:'preset-a',title:'Original',updatedAt:'v1'};
 await storage.upsertPlay(play);
 const rt=new Runtime({storage,logger:console,agents:ctx.agents,sessionPersistence:ctx.sessionPersistence,workspacePath:directory,workspace:()=>undefined,defaultModel:()=>({provider:'fixture',model:'default-model'}),ensurePreset:async()=>{},agentPresets:{mount:async()=>{}},config:{maxSwipeVariants:4,scanMessages:12,worldInfoBudgetChars:8000}});
 const seed=greetingSeed('角色甲：你好。','fixture','model-a');
 const first=await rt.ensureDirector(play,seed);
 assert.equal(first.agent.status,'idle');
 await assert.rejects(ctx.sessionPersistence.open(play.sessionId,'write'),e=>e.name==='SessionAlreadyOwnedError');
 const role=await rt.ensureRoleAgent(play,storage.getCharacter('role-a'));
 const initial=first.agent.session.snapshotEvents();
 const settings={...play,title:'Changed',presetId:'preset-b',multiAgent:false,updatedAt:'v2'};
 await rt.updatePlaySettings(play,settings);
 assert.equal(rt.getDirector(play.id),first.agent);
 assert.equal(first.agent.model.current().model,'model-b');
 assert.equal(role.agent.model.current().model,'model-b');
 const activated=await ctx.tools.resolve({agent:first.agent,signal:new AbortController().signal,modelSelection:first.agent.model.current()});
 assert.ok(!ctx.tools.definitions(first.agent,activated).some(tool=>tool.name==='tavern_speak'));activated.dispose();
 assert.equal(rt.liveOptions.get(first.agent).maxTokens,600);
 assert.deepEqual(initial,first.agent.session.snapshotEvents().filter(e=>e.type!=='model/selection'));
 // A failed staging setup must leave the original writer and original association alive.
 const realSetup=rt.sessionSetup.bind(rt);rt.sessionSetup=()=>async()=>{throw Error('fixture setup failure')};
 await assert.rejects(rt.rebasePlaySession(settings,initial,undefined,first.agent.session.snapshotEvents()),/fixture setup failure/);
 assert.equal(storage.getPlay(play.id),settings);assert.equal(rt.getDirector(play.id),first.agent);
 rt.sessionSetup=realSetup;
 await ctx.sessionPersistence.flush();
 async function storedBytes(){
  const scan=async root=>{for(const d of await readdir(root,{withFileTypes:true})){const path=join(root,d.name);if(d.isDirectory()){const found=await scan(path);if(found)return found;}else if(path.includes(play.sessionId) && d.name.endsWith('.zstd'))return path;}};
  return createHash('sha256').update(await readFile(await scan(join(directory,'sessions')))).digest('hex');
 }
 const originalHash=await storedBytes();
 const edited=await rt.editAssistant(play.id,seed.find(e=>e.type==='assistant/message').data.message.id,'角色甲：新的回复。');
 assert.notEqual(edited.sessionId,play.sessionId);
 assert.ok(rt.getDirector(play.id).session.snapshotEvents().some(e=>e.type==='assistant/message' && e.data.message.content[0].text==='角色甲：新的回复。'));
 const oldLog=await ctx.sessionPersistence.open(play.sessionId,'read');
 const originalRows=(await oldLog.read()).events;await oldLog.close();
 assert.ok(originalRows.some(e=>e.type==='assistant/message' && e.data.message.content[0].text==='角色甲：你好。'));
 // Swap two completed variants using the real factory and persistence; no generation.
 let current=storage.getPlay(play.id);
 const editedRows=structuredClone(rt.getDirector(play.id).session.snapshotEvents());
 const alternate=structuredClone(editedRows);
 alternate.find(e=>e.type==='assistant/message').data.message.content[0].text='角色甲：另一个版本。';
 await storage.upsertSwipeBranch({playId:play.id,key:'0',prefix:[],variants:[editedRows,alternate],current:0,busy:false,updatedAt:'fixture'});
 await rt.swipe(play.id,'0',1);
 assert.ok(rt.getDirector(play.id).session.snapshotEvents().some(e=>e.type==='assistant/message' && e.data.message.content[0].text==='角色甲：另一个版本。'));
 await rt.swipe(play.id,'0',-1);
 current=storage.getPlay(play.id);
 const beforeFailedRetry=rt.getDirector(play.id), originalCreate=rt.createDirector.bind(rt);
 // Failed admission on a real replacement agent must restore the same live original handle.
 rt.createDirector=async (...args)=>{const handle=await originalCreate(...args);handle.agent.followup=()=>{throw Error('fixture inbox admission failed')};return handle};
 await assert.rejects(rt.reroll(play.id),/fixture inbox admission failed/);
 assert.equal(storage.getPlay(play.id),current);assert.equal(rt.getDirector(play.id),beforeFailedRetry);
 const userId=beforeFailedRetry.session.snapshotEvents().find(e=>e.type==='user/message').data.id;
 await assert.rejects(rt.editUserAndRetry(play.id,userId,'Edited fixture question'),/fixture inbox admission failed/);
 assert.equal(storage.getPlay(play.id),current);assert.equal(rt.getDirector(play.id),beforeFailedRetry);
 rt.createDirector=originalCreate;
 await ctx.sessionPersistence.flush();
 assert.equal(await storedBytes(),originalHash,'Original durable log must remain byte-for-byte intact across forks and failures');
 // Cold history actions must re-acquire/attach the source before preparing a replacement.
 await rt.dropPlay(play.id);
 const coldPlay=storage.getPlay(play.id);
 await rt.editAssistant(play.id,seed.find(e=>e.type==='assistant/message').data.message.id,'角色甲：冷启动编辑。');
 assert.notEqual(storage.getPlay(play.id).sessionId,coldPlay.sessionId);
 // A regular Chat controller may already own the exact persisted Session.
 const observedPlay={...play,id:'observed-play',sessionId:'host-observed',updatedAt:'observed-v1'};
 await storage.upsertPlay(observedPlay);
 const foreign=await ctx.agents.create({sessionId:observedPlay.sessionId,agentOptions:{provider:'fixture',model:'model-a'},meta:{cwd:directory,agentPreset:'tavern'},seed:greetingSeed('角色甲：已有记录。','fixture','model-a')});
 const observedRows=JSON.stringify(foreign.agent.session.snapshotEvents());
 // Failure halfway through contribution setup must remove the partial prompt/tools but retain the writer.
 const realMemoryTool=rt.memoryReviewTool.bind(rt);
 rt.memoryReviewTool=()=>({name:'invalid-fixture-tool',parameters:{type:'object'},output:{schema:{type:'object'}}});
 await assert.rejects(rt.ensureDirector(observedPlay),/must declare output/);
 assert.equal(ctx.agents.get(observedPlay.sessionId),foreign.agent);
 rt.memoryReviewTool=realMemoryTool;
 const attached=await rt.ensureDirector(observedPlay);
 assert.equal(attached.agent,foreign.agent);assert.equal(attached.borrowed,true);
 assert.equal(JSON.stringify(foreign.agent.session.snapshotEvents()),observedRows);
 assert.ok(ctx.tools.definitions(foreign.agent).some(tool=>tool.name==='tavern_speak'));
 await rt.updatePlaySettings(observedPlay,{...observedPlay,presetId:'preset-b',updatedAt:'observed-v2'});
 assert.equal(foreign.agent.model.current().model,'model-b');
 await rt.dropPlay(observedPlay.id);
 assert.equal(ctx.agents.get(observedPlay.sessionId),foreign.agent,'Contribution cleanup must never close a host-owned writer');
 assert.ok(!ctx.tools.definitions(foreign.agent).some(tool=>tool.name==='tavern_speak'));
 await rt.ensureDirector(storage.getPlay(observedPlay.id));
 await rt.dispose();
 assert.equal(ctx.agents.get(observedPlay.sessionId),foreign.agent);
 await foreign.dispose();
 console.log('PASS REAL DSH host: exclusive writer, live settings/model/mode, tool registration, setup failure rollback, assistant edit, two-way version swap, retry/user-edit admission rollback, original durable log hash preserved, host-owned writer attachment/cleanup/re-attachment and partial setup rollback; no LLM requests.');
} finally {await ctx.fiber.dispose();await rm(directory,{recursive:true,force:true});}
