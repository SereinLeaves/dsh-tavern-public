const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2] || require('node:path').join(__dirname, '../dist/dsh-tavern/lib/client.js'),'utf8');
const start=source.indexOf('const selectPlay = (0, react.useCallback)(');
const end=source.indexOf('}, [actions, state]);',start);
assert(start >= 0 && end > start, 'selectPlay callback must exist');
const fn=source.slice(start+'const selectPlay = (0, react.useCallback)('.length,end+1);
function setup(activate=async()=>{}) {
 const calls=[], activationRequest={current:0};
 const actions=Object.fromEntries(['setError','setPlayId','setPanel'].map(k=>[k,v=>calls.push([k,v])]));
 const select=vm.runInNewContext('('+fn+')',{actions,state:{plays:[{id:'existing'}]},activationRequest,tavernApi:{activatePlay:async id=>{calls.push(['activate',id]);await activate(id);}}});
 return {select,calls};
}
(async()=>{
 let x=setup(); await x.select(null);assert.deepEqual(x.calls,[['setError',null],['setPlayId',null],['setPanel','chat']]);
 x=setup();await x.select('existing');assert.deepEqual(x.calls,[['setError',null],['activate','existing'],['setPlayId','existing'],['setPanel','chat']]);
 x=setup();await x.select('missing');assert.equal(x.calls.at(-1)[0],'setError');assert.equal(x.calls.length,2);
 let resolve;x=setup(()=>new Promise(r=>resolve=r));let pending=x.select('existing');await x.select(null);resolve();await pending;assert.deepEqual(x.calls.slice(-2),[['setPlayId',null],['setPanel','chat']]);assert(!x.calls.some(([k,v])=>k==='setPlayId'&&v==='existing'));
 let reject;x=setup(()=>new Promise((_,r)=>reject=r));pending=x.select('existing');await x.select(null);reject(new Error('old failure'));await pending;assert.deepEqual(x.calls.at(-1),['setPanel','chat']);
 x=setup(async()=>{throw new Error('activation failure')});await x.select('existing');assert.equal(x.calls.at(-1)[0],'setError');assert(!x.calls.some(([k])=>k==='setPlayId'));
 console.log('PASS: new form, existing play, missing play, stale activation, stale error, activation failure (6 scenarios).');
})().catch(e=>{console.error(e);process.exitCode=1;});
