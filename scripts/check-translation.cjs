const assert = require('node:assert/strict');
const fs = require('node:fs');
const tavern = fs.readFileSync(__dirname+'/../dist/dsh-tavern/lib/client.js','utf8');
const official = fs.readFileSync(__dirname+'/../extras/tavern-cot-scope/lib/client.js','utf8');
const jsx = (type, props) => ({type,...props});
const runtime = {jsx, jsxs:jsx};
const extract = (source, from, to) => source.slice(source.indexOf(from),source.indexOf(to,source.indexOf(from)));
const fragmentCode = extract(official,'function reasoningFragments(', '//#endregion');
const renderBody = extract(official,'function TranslationBody(', '//#endregion');
const build = (code, name, args) => Function(...Object.keys(args),code+'\nreturn '+name)(...Object.values(args));
const reference = {sessionId:'tavern-fixture'};
const binding = build('const reasoningReference=reference;'+extract(tavern,'const reasoningView =','(0, react.useLayoutEffect)'), 'reasoningView', {
  reference, react:{useMemo:f=>f()}, react_jsx_runtime:runtime, SessionProvider:'session',
  renderSlot:(name,props)=>({name,...props})
});
const sample = 'The sky is blue.';
let open = false, calls = 0;
const block = build(extract(tavern,'function ThinkingBlock(','/** Status label'),'ThinkingBlock',{
  react:{useState:()=>[open,f=>{open=f(open)}]}, react_jsx_runtime:runtime, TavernView_module_css_default:{}
});
const props = {text:sample,streaming:false,reasoningView:(...args)=>{calls++;return binding(...args)}};
let row = block(props);
assert.equal(calls,0);
row.children[0].onClick();
row=block(props);
assert.equal(row.children[1].children.session,reference);
assert.deepEqual(row.children[1].children.children,{name:'tavern.reasoning.body',rawText:sample,text:sample,running:false});
const state = [];
const ref = {};
const pending = [];
let cursor=0, mounted=false, requests=0;
const react = {
  useState(init){const i=cursor++; if (!(i in state)) state[i]=init; return [state[i], value=>{state[i]=value}]},
  useRef:()=>ref,
  useMemo:f=>f(),
  useEffect:f=>{if(!mounted) pending.push(f)}
};
const component = build(fragmentCode+'\n'+renderBody,'TranslationBody',{
  react, react_jsx_runtime:runtime, Translation_module_css_default:{},
  _deepseek_ai_dsh_client_ui_primitives:{Button:'button'}
});
const bodyProps = {text:sample,running:false,t:x=>x,renderFactorySlot:(_,props)=>props.text,
  usePreferences:f=>f({provider:'bing',targetLanguage:'zh'}),
  useTranslationLocale:f=>f({active:'zh'}),useTranslationLimit:f=>f(500),
  translate:async request=>{requests++; assert.deepEqual(request,{text:sample,provider:'bing',targetLanguage:'zh'});return '天空是蓝色的。'}
};
function render(){cursor=0;return component(bodyProps)}
(async ()=>{
  render(); mounted=true; pending.forEach(f=>f());
  await new Promise(resolve=>setImmediate(resolve));
  let view=render();
  assert.equal(view.children[1],'天空是蓝色的。');
  assert.equal(view.children[0].children[0].children,'original');
  view.children[0].children[0].onClick();
  view=render();
  assert.equal(view.children[1],sample);
  assert.equal(view.children[0].children[0].children,'translation');
  view.children[0].children[0].onClick();
  assert.equal(render().children[1],'天空是蓝色的。');
  assert.equal(requests,1);
  console.log('PASS closed sends nothing; official slot receives tavern session; mocked provider translates to Chinese; original/translation toggle works.');
})().catch(error=>{console.error(error);process.exitCode=1});
