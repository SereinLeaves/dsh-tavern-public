import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const code=await readFile(new URL(process.argv[2]??'../dist/dsh-tavern/lib/index.js',import.meta.url),'utf8');
const {TavernSessionRuntime:Runtime}=await import('data:text/javascript;base64,'+Buffer.from(code+'\nexport {TavernSessionRuntime};').toString('base64'));
const event=(seq,type,data,surfaceOp)=>({seq,type,data,...(surfaceOp?{surfaceOp}:{})});
const turn = (text) => [
  event(0,'turn/start',{turn:1}),
  event(1,'user/message',{id:'u',content:[{type:'text',text:'question'}]}),
  event(2,'assistant/message',{message:{id:'a',content:[{type:'text',text}]}},'append'),
  event(3,'turn/end',{turn:1}),
];
const first=turn('first');
const second=turn('second');
const play={id:'play-test',sessionId:'old'};
function fixture({failStart=false,failSave=false}={}){
  let current=play;
  let branch={playId:play.id,key:'0',prefix:[],variants:[first,second],current:0,busy:false,userText:'question'};
  const original=branch;
  let disposed=0,cleared=0,replayed=0;
  let newEvents;
  const storage={
    getPlay:()=>current,
    upsertPlay:async next=>{current=next},
    getSwipeBranch:()=>branch,
    upsertSwipeBranch:async next=>{if(failSave && next.current===1) throw Error('disk');branch=next},
    deleteSwipeBranches:async()=>{cleared++;branch=undefined},
    deleteSwipeBranch:async()=>{branch=undefined},
  };
  const rt=new Runtime({logger:{warn(){}},config:{maxSwipeVariants:4},storage});
  const handle = (id,snapshotEvents) => ({dispose:async()=>{disposed++},agent:{
    id,status:'idle',runMaintenance:job=>job(),session:{snapshotEvents},whenIdle:()=>new Promise(()=>{}),
    followup(){if(failStart) throw Error('queue');replayed++},
  }});
  rt.directors.set(play.id,handle('old',()=>first));
  rt.ensureDirector=async(next,seed)=>{
    if (next===play) {
      const originalHandle=handle("old",()=>first);
      rt.directors.set(play.id,originalHandle);
      return originalHandle;
    }
    newEvents=seed;
    const h=handle(next.sessionId,()=>seed);
    rt.directors.set(play.id,h);
    return h;
  };
  return {rt,storage,original,read:()=>({current,branch,disposed,cleared,replayed,newEvents})};
}
{
  const {rt,original,read}=fixture({failStart:true});
  await assert.rejects(rt.reroll(play.id),/queue/);
  assert.deepEqual(read(),{current:play,branch:original,disposed:1,cleared:0,replayed:0,newEvents:[]});
  assert.equal(rt.directors.get(play.id).agent.id,"old");
}
{
  const {rt,original,read}=fixture({failStart:true});
  await assert.rejects(rt.editUserAndRetry(play.id,'u','edited'),/queue/);
  assert.deepEqual(read(),{current:play,branch:original,disposed:1,cleared:0,replayed:0,newEvents:[]});
}
{
  const {rt,original,read}=fixture({failSave:true});
  await assert.rejects(rt.swipe(play.id,'0',1),/disk/);
  assert.equal(read().current,play);
  assert.equal(read().branch,original);
  assert.equal(read().disposed,1);
}
{
  const {rt,read}=fixture();
  const result=await rt.swipe(play.id,'0',1);
  assert.equal(read().current,result.play);
  assert.equal(read().branch.current,1);
  assert.deepEqual(read().newEvents,second);
  const back=await rt.swipe(play.id,'0',-1);
  assert.equal(back.branch.current,0);
  assert.deepEqual(read().newEvents,first);
}
{
  const {rt,read}=fixture();
  rt.directors.delete(play.id);
  const continued=[...first,event(4,'turn/start',{turn:2}),event(5,'user/message',{id:'u2'}),event(6,'turn/end',{turn:2})];
  rt.liveEvents=async()=>continued;
  rt.ensureDirector=async()=>{const h={agent:{id:play.sessionId,status:'idle',runMaintenance:job=>job(),session:{snapshotEvents:()=>continued}},dispose:async()=>{throw Error('Must not dispose stale history')}};rt.directors.set(play.id,h);return h};
  await assert.rejects(rt.reroll(play.id),/已有新消息/);
  await assert.rejects(rt.swipe(play.id,'0',1),/已经继续/);
  assert.equal(read().current,play);
  assert.equal(read().disposed,0);
}
{
  const {rt,read}=fixture();
  const firstAction=rt.withHistoryChange(play.id,()=>rt.reroll(play.id));
  await assert.rejects(rt.withHistoryChange(play.id,()=>rt.swipe(play.id,'0',1)),/正在更新/);
  const result=await firstAction;
  assert.equal(result.branch.variants.length,3);
  assert.equal(read().replayed,1);
  assert.equal(rt.changingHistory.size,0);
}
console.log('PASS retry startup rollback, edited replay rollback, swipe write rollback, normal two-way swipe, stale history, concurrent requests.');
