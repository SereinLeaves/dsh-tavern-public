import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const code=await readFile(new URL('../dist/dsh-tavern/lib/index.js',import.meta.url),'utf8');
const {LibraryStore,TavernStorage,TavernSessionRuntime:Runtime,reviewWindow,dueMemoryReviews,memoryReviewBatch}=await import('data:text/javascript;base64,'+Buffer.from(code+'\nexport {LibraryStore,TavernStorage,TavernSessionRuntime,reviewWindow,dueMemoryReviews,memoryReviewBatch};').toString('base64'));
const root=await mkdtemp(join(tmpdir(),'tavern-memory-fix-'));
try {
 const logger={warn(){},error(){}};
 const lib=await LibraryStore.open(root,logger),storage=new TavernStorage(lib,{get:()=>({})});
 const rt=new Runtime({storage,logger,config:{}}),events=[];
 function turn(n){events.push({type:'turn/start',data:{turn:n}}, {type:'user/message',data:{id:'u'+n,source:{kind:'user'},content:[{type:'text',text:'角色甲约定明天去图书馆，第'+n+'次谈话。'}]}},{type:'user/message',data:{id:'ctx'+n,source:{kind:'runtime-context'},content:[{type:'text',text:'运行上下文与过时旧经历，不是新剧情'}]}},{type:'assistant/message',data:{message:{id:'a'+n,content:[{type:'reasoning',text:'private reasoning'},{type:'text',text:'角色甲：明天在图书馆见。'}]}}},{type:'turn/end',data:{turn:n,reason:{kind:'completed'}}});}
 const play={id:'p',sessionId:'s',characterIds:['a'],characterMemories:{a:{enabled:true,book:{entries:[{uid:0,content:'手动原件',key:[],constant:true}]},autoReview:{enabled:true,interval:5,checkedTurns:0}}},updatedAt:'0'};
 await storage.upsertCharacter({id:'a',card:{data:{name:'角色甲'}}});await storage.upsertPlay(play);
 const agent={id:'s',session:{snapshotEvents:()=>events}};rt.directors.set('p',{agent});
 for(let n=1;n<=12;n++)turn(n);
 assert.equal(reviewWindow(events).messages.length,24);assert.ok(!reviewWindow(events).messages.some(m=>m.id.startsWith('ctx')));
 assert.equal(memoryReviewBatch(play,events,'a').turns,5);
 const tool=rt.memoryReviewTool();
 await assert.rejects(tool.execute({characterId:'a',entries:[]},{agent}),/noChangeReason/);
 assert.equal(storage.getPlay('p').characterMemories.a.autoReview.checkedTurns,0);
 await assert.rejects(tool.execute({characterId:'a',entries:['bad']},{agent}),/对象/);
 const entry={keywords:['图书馆'],content:'约定次日去图书馆，尚未兑现。',messageId:'a5',quote:'明天在图书馆见。'};
 await assert.rejects(tool.execute({characterId:'a',entries:[{...entry,quote:'伪造的引文'}]},{agent}));
 assert.deepEqual(await tool.execute({characterId:'a',entries:[entry]},{agent}),{added:1});
 let saved=storage.getPlay('p');assert.equal(saved.characterMemories.a.autoReview.checkedTurns,5);
 assert.equal(memoryReviewBatch(saved,events,'a').messages[0].id,'u6');assert.deepEqual(dueMemoryReviews(saved,events).due,['a']);
 const reason='逐条核对已完成对话，内容均为已有约定的重复说明，没有新状态变化。';
 await tool.execute({characterId:'a',entries:[],noChangeReason:reason},{agent});
 saved=storage.getPlay('p');assert.equal(saved.characterMemories.a.autoReview.checkedTurns,10);
 assert.deepEqual(dueMemoryReviews(saved,events).due,[]);
 // Explicit user-requested tool remains executable before the next interval.
 assert.deepEqual(await tool.execute({characterId:'a',entries:[{...entry,content:'第十二次确认图书馆约定。',messageId:'a12'}]},{agent}),{added:1});
 saved=storage.getPlay('p');assert.equal(saved.characterMemories.a.autoReview.checkedTurns,12);assert.equal(saved.characterMemories.a.book.entries[0].content,'手动原件');
 const legacy=structuredClone(saved);legacy.characterMemories.a.automaticEntries=[];legacy.characterMemories.a.autoReview={enabled:true,interval:5,checkedTurns:12,checkedAt:'old',lastAdded:0};
 assert.deepEqual(dueMemoryReviews(legacy,events).due,['a']);assert.equal(memoryReviewBatch(legacy,events,'a').messages[0].id,'u1');
 // Registration is available while enabled, independently of the automatic schedule.
 let gate;const ctx={systemPrompt:{section(){},context(){}},tools:{register(t,options){gate=options.when;}}};
 rt.deps.agentPresets={mount:async()=>{}};
 await rt.sessionSetup(undefined,()=>'',{},tool)(ctx);
 assert.equal(gate({agent}),true);
 const state={kind:'state',topic:'医院状态',content:'角色甲目前在医院住院观察，尚未出院，后续需确认康复情况。',messageId:'a12',quote:'明天在图书馆见。'};
 await assert.rejects(tool.execute({characterId:'a',entries:[{...state,topic:''}]},{agent}),/topic/);
 await assert.rejects(tool.execute({characterId:'a',entries:[{...entry,keywords:[]}]},{agent}),/keywords/);
 await assert.rejects(tool.execute({characterId:'a',entries:[{...state,supersedes:[0]}]},{agent}),/手动原件/);
 assert.deepEqual(await tool.execute({characterId:'a',entries:[state]},{agent}),{added:1});
 assert.deepEqual(await tool.execute({characterId:'a',entries:[{...state,content:state.content.replace('尚未出院','已经出院')}]},{agent}),{added:1});
 const reopened=await LibraryStore.open(root,logger);assert.equal(reopened.play('p').characterMemories.a.automaticEntries.length,4);
 console.log('PASS runtime-context exclusion, bounded cursor batches, empty/invalid rejection without progress, evidence, explicit retry before interval, legacy zero-result recovery, registration, manual preservation, durable write/read.');
} finally {await rm(root,{recursive:true,force:true});}

await import('./check-memory-granularity.mjs');

await import('./check-memory-evidence.mjs');
