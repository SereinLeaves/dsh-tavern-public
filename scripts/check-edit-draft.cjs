const fs=require('node:fs'),assert=require('node:assert/strict');
const code=fs.readFileSync(__dirname+'/../dist/dsh-tavern/lib/client.js','utf8');
const start=code.indexOf('const MessageRow = '),end=code.indexOf('\n\t\t//#endregion',start);
let hooks=[],cursor=0;
const react={memo:fn=>fn,useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=initial;return[hooks[i],value=>hooks[i]=typeof value==='function'?value(hooks[i]):value]},useMemo:fn=>fn(),useCallback:fn=>fn};
const jsx=(type,props)=>({type,props});
const dummy=()=>{};
const Row=Function('react','react_jsx_runtime','TavernView_module_css_default','sameMessageRow','looksLikeHtml','sanitizeMessageHtml','Button','Spinner','ThinkingBlock','CharacterAvatar','StatusLine',code.slice(start,end)+'\nreturn MessageRow')(
 react,{jsx,jsxs:jsx},{},()=>false,()=>false,x=>x,'Button',dummy,dummy,dummy,dummy);
function walk(node){return node&&typeof node==='object'?[node,...[node.props?.children].flat(Infinity).flatMap(walk)]:[]}
const props={message:{kind:'assistant',messageId:'message-fixture',text:'Original text',status:'done'},onSaveEdit:async()=>false};
function render(){cursor=0;return Row(props)}
(async()=>{
 let row=render();walk(row).find(n=>n.props?.children==='✎ 编辑').props.onClick();
 row=render();walk(row).find(n=>n.type==='textarea').props.onChange({target:{value:'Unsent edited draft'}});
 row=render();await walk(row).find(n=>n.props?.children==='保存').props.onClick();
 row=render();assert.equal(walk(row).find(n=>n.type==='textarea').props.value,'Unsent edited draft');
 props.onSaveEdit=async()=>true;
 await walk(row).find(n=>n.props?.children==='保存').props.onClick();row=render();assert.ok(!walk(row).some(n=>n.type==='textarea'));
 const marker=code.indexOf('const runBranchOp = '),stop=code.indexOf('\n\t\t\tconst enterCharacter',marker);
 let busy=false,errors=[],ref={current:false};
 const run=Function('react','branching','branchPending','setBranching','actions','refresh',code.slice(marker,stop)+'\nreturn runBranchOp')(
  react,false,ref,v=>{busy=v},{setError:e=>errors.push(e)},async()=>{});
 assert.equal(await run(async()=>{throw Error('fixture write conflict')}),false);assert.ok(errors.at(-1).includes('fixture write conflict'));assert.equal(ref.current,false);assert.equal(busy,false);
 const first=run(async()=>{});assert.equal(await run(async()=>{throw Error('duplicate')}),false);assert.equal(await first,true);assert.equal(ref.current,false);
 const selectionStart=code.indexOf('const selectPlay = '),selectionEnd=code.indexOf('\n\t\t\tconst createPlay',selectionStart);
 let selected=[],pendingActivation=new Map(),activationRequest={current:0};
 const select=Function('react','activationRequest','actions','state','tavernApi',code.slice(selectionStart,selectionEnd)+'\nreturn selectPlay')(
 react,activationRequest,{setError:e=>errors.push(e),setPlayId:id=>selected.push(id),setPanel(){}},{plays:[{id:'one'},{id:'two'}]},
 {activatePlay:id=>new Promise((resolve,reject)=>pendingActivation.set(id,{resolve,reject}))});
 const opening=select('one');assert.equal(selected.length,0,'Must not subscribe before activation');
 const later=select('two');pendingActivation.get('two').resolve();await later;pendingActivation.get('one').resolve();await opening;
 assert.deepEqual(selected,['two'],'Stale activation cannot replace the later selection');
 const refused=select('one');pendingActivation.get('one').reject(Error('fixture writer held'));await refused;
 assert.deepEqual(selected,['two']);assert.ok(errors.at(-1).includes('writer held'));
 console.log('PASS edit draft: failed save keeps editor and exact draft, success closes editor; async operation result, error display and duplicate-request gate.');
})().catch(error=>{console.error(error);process.exitCode=1});
