import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
const code=await readFile(new URL('../dist/dsh-tavern/lib/index.js',import.meta.url),'utf8');
const {LibraryStore,TavernStorage,TavernSessionRuntime:Runtime,tavernHandler}=await import('data:text/javascript;base64,'+Buffer.from(code+'\nexport {LibraryStore,TavernStorage,TavernSessionRuntime,tavernHandler};').toString('base64'));
const root=await mkdtemp(join(tmpdir(),'tavern-settings-test-'));
const logger={warn(){},error(){}};
try{
 const library=await LibraryStore.open(root,logger);
 const storage=new TavernStorage(library,{get:()=>({})});
 for(const id of ['role-one','role-two']) await storage.upsertCharacter({id,card:{data:{name:id}}});
 await storage.upsertLorebook({id:'book-new',book:{entries:[]}});
 await storage.upsertPreset({id:'preset-new',provider:'fixture',model:'new-model'});
 const original={id:'play-one',title:'Original',sessionId:'same-session',characterIds:['role-one','role-two'],lorebookIds:[],presetId:'preset-new',multiAgent:true,narratorEnabled:false,updatedAt:'v1'};
 await storage.upsertPlay(original);
 const branch={playId:original.id,key:'0',variants:[],current:0};
 await storage.upsertSwipeBranch(branch);
 const rt=new Runtime({storage,logger});
 let resumed=[],disposed=[],rejectLoad=false,busy=false;
 const handle=id=>({agent:{id,status:busy?'running':'idle'},dispose:async()=>{disposed.push(id)}});
 rt.directors.set(original.id,handle(original.sessionId));
 rt.roles.set(original.id,new Map([['role-one',handle('retained-role-log')]]));
 rt.createDirector=async play=>{
   if(rejectLoad && play.title==='Bad load') throw Error('simulated reload failure');
   resumed.push(play);
   const h=handle(play.sessionId);rt.directors.set(play.id,h);return h;
 };
 async function request(body) {
  let status,result;
  const req=Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(req,{method:'PUT',url:'/tavern/plays/'+original.id,headers:{host:'localhost','content-type':'application/json'}});
  await tavernHandler({storage,runtime:rt,logger,config:{allowedHosts:[]},multiAgentAvailable:()=>true},req,{
   writeHead(code){status=code},end(value){result=JSON.parse(value)}
  });
  return {status,result};
 }
 assert.equal((await request({characterIds:[]})).status,400);
 assert.equal((await request({characterIds:'bad'})).status,400);
 assert.equal((await request({presetId:'missing'})).status,400);
 assert.equal((await request({multiAgent:'yes'})).status,400);
 assert.equal((await request({expectedUpdatedAt:'stale'})).status,409);
 assert.equal(storage.getPlay(original.id),original);
 rt.directors.get(original.id).agent.status='running';
 assert.equal((await request({title:'Busy'})).status,409);
 assert.equal(disposed.length,0);
 rt.directors.get(original.id).agent.status='idle';
 const updated=await request({title:'Updated',characterIds:['role-two'],lorebookIds:['book-new'],presetId:null,narratorEnabled:true,multiAgent:false,expectedUpdatedAt:'v1'});
 assert.equal(updated.status,200);
 assert.equal(updated.result.sessionId,original.sessionId);
 assert.equal(updated.result.presetId,undefined);
 assert.deepEqual(updated.result.characterIds,['role-two']);
 assert.deepEqual(disposed,['same-session','retained-role-log']);
 assert.equal(storage.getSwipeBranch(original.id,'0'),branch);
 assert.ok(storage.getCharacter('role-one'));
 assert.deepEqual(resumed[0],storage.getPlay(original.id));
 const before=storage.getPlay(original.id);
 rejectLoad=true;
 const failed=await request({title:'Bad load',presetId:'preset-new',expectedUpdatedAt:before.updatedAt});
 assert.equal(failed.status,500);
 assert.equal(storage.getPlay(original.id),before);
 assert.equal(resumed.at(-1),before);
 assert.equal(rt.directors.get(original.id).agent.id,original.sessionId);
 assert.equal(rt.rebasing.size,0);
 assert.equal(rt.changingHistory.size,0);
 const reopened=await LibraryStore.open(root,logger);
 assert.deepEqual(reopened.play(original.id),before);
 console.log('PASS settings route, validation, busy and stale saves, same-session reload, removed-role preservation, branch preservation, reload failure rollback, disk read-back.');
}finally{await rm(root,{recursive:true,force:true})}
