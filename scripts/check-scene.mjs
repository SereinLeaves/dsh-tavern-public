process.on('uncaughtException',error=>{console.error(error.name+': '+error.message);process.exitCode=1;});
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
const code=await readFile(new URL('../dist/dsh-tavern/lib/index.js',import.meta.url),'utf8');
const {TavernSessionRuntime:Runtime,playSceneIds,tavernHandler}=await import('data:text/javascript;base64,'+Buffer.from(code+'\nexport {TavernSessionRuntime,playSceneIds,tavernHandler};').toString('base64'));
function fixture(){
 let play={id:'p',sessionId:'original',characterIds:['a','b'],updatedAt:'v1',multiAgent:true};
 const cards=['a','b'].map(id=>({id,card:{data:{name:id}}}));
 let resolveIdle,rejectIdle;
 const done=new Promise((resolve,reject)=>{resolveIdle=resolve;rejectIdle=reject});
 const prompts=[];
 let fail=false,saves=0;
 const handle={agent:{id:'original',status:'idle',session:{snapshotEvents:()=>[]},whenIdle:()=>done,followup(message){if(fail)throw Error('enqueue failed');prompts.push(message);this.status='running'}}};
 const storage={getPlay:()=>play,getCharacter:id=>cards.find(card=>card.id===id),listPlays:()=>[play],upsertPlay:async next=>{play=next;saves++}};
 const rt=new Runtime({storage,logger:{warn(){}}});
 rt.ensureDirector=async()=>handle;
 return {rt,storage,cards,handle,prompts,read:()=>play,resolved:()=>resolveIdle(),rejected:()=>rejectIdle(Error('model error')),fail:()=>{fail=true},saves:()=>saves};
}
{
 const f=fixture();
 assert.deepEqual(playSceneIds(f.read()),['a']);
 const updated=await f.rt.withHistoryChange('p',()=>f.rt.enterCharacter('p','b','v1'));
 assert.equal(updated.sessionId,'original');
 assert.deepEqual(updated.sceneCharacterIds,['a','b']);
 assert.equal(f.prompts.length,1);
 assert.match(JSON.stringify(f.prompts[0]),/指定角色出场/);
 assert.equal(f.rt.sceneFocus.get('p').characterId,'b');
 await assert.rejects(f.rt.withHistoryChange('p',()=>f.rt.enterCharacter('p','a',updated.updatedAt)),/正在回应/);
 await assert.rejects(f.rt.speakFor({agent:{id:'original'}},{characterId:'a'}),/用户点名/);
 f.resolved();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.rt.sceneFocus.size,0);
}
{
 const f=fixture();
 f.fail();
 const original=f.read();
 await assert.rejects(f.rt.enterCharacter('p','b','v1'),/enqueue failed/);
 assert.equal(f.read(),original);
 assert.equal(f.prompts.length,0);
 assert.equal(f.rt.sceneFocus.size,0);
 f.rejected();await new Promise(resolve=>setImmediate(resolve));
}
{
 const f=fixture();
 await assert.rejects(f.rt.enterCharacter('p','unknown','v1'),/不属于/);
 await assert.rejects(f.rt.enterCharacter('p','b','stale'),/已变化/);
 f.handle.agent.status='running';
 await assert.rejects(f.rt.enterCharacter('p','b','v1'),/正在回应/);
 assert.equal(f.saves(),0);
 assert.equal(f.prompts.length,0);
}
{
 const f=fixture();
 await f.rt.enterCharacter('p','a','v1');
 assert.match(JSON.stringify(f.prompts[0]),/指定角色接话/);
 f.resolved();
}
{
 const f=fixture();
 const request=Readable.from([Buffer.from(JSON.stringify({characterId:'b',expectedUpdatedAt:'v1'}))]);
 Object.assign(request,{method:'POST',url:'/tavern/plays/p/enter',headers:{host:'localhost'}});
 let status,response;
 await tavernHandler({storage:f.storage,runtime:f.rt,config:{allowedHosts:[]},logger:{warn(){}}},request,{
  writeHead(code){status=code},end(value){response=JSON.parse(value)}
 });
 assert.equal(status,200);
 assert.equal(response.sessionId,'original');
 assert.equal(f.prompts.length,1);
 f.resolved();
}
console.log('PASS avatar entrance submits one generation, selected speaker enforced, busy/stale/unknown requests refused, same session preserved, enqueue failure restores scene.');
