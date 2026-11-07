import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
const source=await readFile(new URL('../dist/dsh-tavern/lib/index.js',import.meta.url),'utf8');
const {TavernSessionRuntime:Runtime,tavernHandler,tavernFailure}=await import('data:text/javascript;base64,'+Buffer.from(source+'\nexport {TavernSessionRuntime,tavernHandler,tavernFailure};').toString('base64'));
const rows=[{seq:0,type:'turn/start',data:{turn:1}},{seq:1,type:'user/message',data:{id:'u1',content:[{type:'text',text:'Question'}]}},{seq:2,type:'assistant/message',data:{message:{id:'a1',content:[{type:'text',text:'Original reply'}]}}},{seq:3,type:'turn/end',data:{turn:1}}];
function fixture(failure){
 const original={id:'play-one',sessionId:'session-original',characterIds:[],updatedAt:'v1'};
 let play=original, originalDisposals=0, replacementDisposals=0, resumeOriginal=0;
 const originalRows=structuredClone(rows), immutable=JSON.stringify(originalRows);
 const options={maxTokens:20};
 const storage={getPlay:()=>play,getPreset:()=>undefined,upsertPlay:async next=>{
  if(failure==='disk' && next!==original) throw Object.assign(Error('disk full'),{code:'ENOSPC'});
  if(failure==='restore' && next===original) throw Error('restore failed');
  play=next;
  if(failure==='queued' && next!==original) originalRows.push({type:'agent/inbox/spliced',seq:4,data:{target:'next-turn',inserted:[{content:[]}],removedCount:0}});
 },getSwipeBranch:()=>undefined};
 const runtime=new Runtime({storage,logger:{warn(){},error(){}},defaultModel:()=>({provider:'fixture',model:'model-a'})});
 const old={agent:{id:original.sessionId,status:'idle',session:{snapshotEvents:()=>originalRows},runMaintenance:job=>job()},dispose:async()=>{originalDisposals++;if(failure==='old-disposal')throw Error('old cleanup failed')}};
 runtime.directors.set(original.id,old);runtime.liveOptions.set(old.agent,options);
 runtime.ensureDirector=async next=>{
  if(next===original){resumeOriginal++;throw Error('Original writer is still owned');}
  assert.equal(originalDisposals,0,'Old writer must remain alive while preparing replacement');
  if(failure==='setup')throw Error('setup failed');
  const handle={agent:{id:next.sessionId,status:'idle',session:{snapshotEvents:()=>rows}},dispose:async()=>{replacementDisposals++;if(failure==='new-disposal')throw Error('new cleanup failed')}};
  runtime.directors.set(original.id,handle);return handle;
 };
 return {runtime,original,old,originalRows,immutable,read:()=>({play,originalDisposals,replacementDisposals,resumeOriginal})};
}
for(const failure of ['setup','disk','commit','new-disposal','queued']){
 const f=fixture(failure);
 await assert.rejects(f.runtime.rebasePlaySession(f.original,rows,undefined,rows,()=>{if(['commit','new-disposal'].includes(failure))throw Error('commit failed')}));
 assert.equal(f.read().play,f.original);assert.equal(f.runtime.directors.get(f.original.id),f.old);
 assert.equal(f.read().originalDisposals,0);assert.equal(f.read().resumeOriginal,0);
 if(failure==='queued')assert.equal(f.originalRows.at(-1).type,'agent/inbox/spliced');else assert.equal(JSON.stringify(f.originalRows),f.immutable);
 assert.equal(f.runtime.rebasing.size,0);
 if(failure==='new-disposal')assert.equal(f.runtime.retiredHandles.size,1);
}
{
 const f=fixture('old-disposal');const changed=await f.runtime.rebasePlaySession(f.original,rows,undefined,rows);
 assert.equal(f.read().play,changed);assert.equal(f.read().resumeOriginal,0);assert.equal(f.runtime.retiredHandles.size,1);
 assert.equal(JSON.stringify(f.originalRows),f.immutable);
}
{
 const f=fixture('restore');
 await assert.rejects(f.runtime.rebasePlaySession(f.original,rows,undefined,rows,()=>{throw Error('commit failed')}),e=>e.name==='TavernRecoveryError' && /恢复原配置/.test(e.message));
 assert.equal(f.runtime.directors.get(f.original.id),f.old);assert.equal(f.read().originalDisposals,0);
}
{
 const f=fixture('old-disposal');await assert.rejects(f.runtime.dropPlay(f.original.id),/old cleanup/);
 assert.equal(f.runtime.directors.get(f.original.id),f.old,'Failed disposal remains reachable');
}
{
 const failure=Object.assign(Error('fixture read corruption'),{name:'SessionPersistenceCorruptionError'});
 const rt=new Runtime({sessionPersistence:{open:async()=>{throw failure}}});
 await assert.rejects(rt.persistedSession('test'),e=>e===failure);
}
const operations=[['PUT','/tavern/plays/play-one','保存会话设置','updatePlaySettings'],['PUT','/tavern/plays/play-one/messages/a1','保存回复编辑','editAssistant'],['POST','/tavern/plays/play-one/messages/retry','重试回复','reroll'],['POST','/tavern/plays/play-one/messages/swipe','切换回复版本','swipe'],['POST','/tavern/plays/play-one/messages/u1/retry','修改消息并重试','editUserAndRetry']];
for(const [method,url,label,action] of operations){
 const failure=Object.assign(Error('session "fixture" is already owned by an active write handle'),{name:'SessionAlreadyOwnedError'});
 const storage={getPlay:()=>({id:'play-one',characterIds:['role-a'],updatedAt:'v1'}),getCharacter:()=>({id:"role-a"}),listCharacters:()=>[{id:"role-a"}],getLorebook:()=>({})};
 const runtime={withHistoryChange:(_,job)=>job(),[action]:async()=>{throw failure}};
 const request=Readable.from([Buffer.from(JSON.stringify({text:'Fixture edit',key:'0',step:1}))]);
 Object.assign(request,{method,url,headers:{host:'localhost','content-type':'application/json'}});
 let status,result;
 await tavernHandler({storage,runtime,logger:{warn(message){if(!message.includes("active write handle"))console.error(message)}},config:{allowedHosts:[]}},request,{writeHead(code){status=code},end(value){result=JSON.parse(value)}});
 assert.equal(status,409,label+" "+JSON.stringify(result));assert.ok(result.error.includes(label));assert.ok(result.error.includes('写入'));assert.ok(result.error.includes('错误编号'));assert.ok(!result.error.includes('服务器内部错误'));
}
for(const [name,status,word] of [['SessionHandleClosedError',409,'连接'],['SessionOwnershipLostError',409,'连接'],['SessionPersistenceNotFoundError',404,'不存在'],['SessionPersistenceCorruptionError',422,'校验'],['SessionFormatUnsupportedError',422,'格式'],['TavernRecoveryError',500,'Recovery failure']]){
 const result=tavernFailure(Object.assign(Error('Recovery failure'),{name}));assert.equal(result.status,status);assert.ok(result.reason.includes(word));
}
assert.equal(tavernFailure({code:'ENOSPC'}).status,507);
assert.equal(tavernFailure({code:'EACCES'}).status,403);
assert.ok(!tavernFailure(Error('secret fixture content')).reason.includes('secret fixture'));
console.log('PASS lifecycle: prepare/write/commit/disposal/rollback failures, retained old writer, queued input, original history immutability, cold read errors, five HTTP operation labels, typed causes and correlation IDs.');
