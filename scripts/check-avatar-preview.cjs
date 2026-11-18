const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||__dirname+'/../dist/dsh-tavern/lib/client.js','utf8');
const a=source.indexOf('function CharacterAvatarPreview('),b=source.indexOf('function CharacterEditor(',a);
let values=[],cursor=0,effects=[],modal={open:false,showModal(){this.open=true;this.shown=(this.shown||0)+1;},close(){this.open=false;}};
const react={useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],v=>values[i]=v];},useRef:()=>({current:modal}),useEffect:fn=>effects.push(fn)};
const jsx=(type,props,key)=>({type,props,key});const Preview=vm.runInNewContext(source.slice(a,b)+'\nCharacterAvatarPreview',{react,react_jsx_runtime:{jsx,jsxs:jsx,Fragment:'Fragment'},TavernView_module_css_default:{cardAvatar:'cardAvatar',btn:'btn'},avatarSrc:x=>'/avatars/'+x});
const walk=n=>n&&typeof n==='object'?[n,...[n.props?.children].flat(Infinity).flatMap(walk)]:[];
function render(){cursor=0;effects=[];const node=Preview({src:'fictional.png',name:'测试角色'});effects.forEach(f=>f());return walk(node);}
let nodes=render();assert.equal(nodes.filter(n=>n.type==='img').length,1);assert(!modal.open);
nodes.find(n=>n.props?.className==='tv-avatar-preview-trigger').props.onClick();nodes=render();assert(modal.open);assert.equal(modal.shown,1);assert.equal(nodes.find(n=>n.props?.className==='tv-avatar-preview-image').props.src,'/avatars/fictional.png');
let dialog=nodes.find(n=>n.type==='dialog');const content={};dialog.props.onClick({target:content,currentTarget:dialog});render();assert(modal.open,'Image/content click keeps modal open');
dialog.props.onClick({target:dialog,currentTarget:dialog});render();assert(!modal.open);
nodes=render();nodes.find(n=>n.props?.className==='tv-avatar-preview-trigger').props.onClick();nodes=render();nodes.find(n=>n.type==='dialog').props.onCancel();render();assert(!modal.open,'Native Escape cancel closes');
nodes=render();nodes.find(n=>n.props?.className==='tv-avatar-preview-trigger').props.onClick();nodes=render();nodes.find(n=>n.props?.className==='tv-avatar-preview-image').props.onError();nodes=render();assert(nodes.some(n=>n.props?.role==='status'));nodes.find(n=>n.props?.['aria-label']==='关闭头像预览').props.onClick();render();assert(!modal.open);
assert(source.slice(b,source.indexOf('\n\t\tfunction ',b+25)).includes('jsx(CharacterAvatarPreview,'));
console.log('PASS avatar preview: button opens full image via native modal, content stays open, backdrop/Escape/close dismiss, load failure notice, editor integration.');
