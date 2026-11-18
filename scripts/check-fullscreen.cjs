const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const clientCode = fs.readFileSync(__dirname + '/../dist/dsh-tavern/lib/client.js', 'utf8');

// 1. Verify CSS styles for fullscreen button and expanded mode
assert.ok(clientCode.includes('.tv-chat-fullscreen.tv-chat-expanded'), 'CSS must define .tv-chat-expanded');
assert.ok(clientCode.includes('.tv-fullscreen-button'), 'CSS must define .tv-fullscreen-button');

// 2. Extract ChatPanel implementation to test double-Esc behavior
const start = clientCode.indexOf('function ChatPanel(props)');
const end = clientCode.indexOf('/** Collapsible reasoning', start);
assert.ok(start > 0 && end > start, 'ChatPanel bounds must be located');

let eventListeners = {};
const mockWindow = {
    addEventListener: (type, fn) => {
        eventListeners[type] = fn;
    },
    removeEventListener: (type, fn) => {
        delete eventListeners[type];
    }
};

let stateValues = [];
let stateCursor = 0;
let effectCallbacks = [];
let setters = [];

const mockReact = {
    useState: (initial) => {
        const id = stateCursor++;
        if (!(id in stateValues)) stateValues[id] = typeof initial === 'function' ? initial() : initial;
        const setter = (val) => {
            stateValues[id] = typeof val === 'function' ? val(stateValues[id]) : val;
        };
        setters[id] = setter;
        return [stateValues[id], setter];
    },
    useRef: (init) => ({ current: init }),
    useEffect: (fn) => effectCallbacks.push(fn),
    useLayoutEffect: () => {},
    useCallback: (fn) => fn,
    useMemo: (fn) => fn()
};

const jsx = (type, props) => ({ type, props });
const panelContext = {
    react: mockReact,
    react_jsx_runtime: { jsx, jsxs: jsx, Fragment: 'Fragment' },
    TavernView_module_css_default: new Proxy({}, { get: (_, k) => k }),
    useCharacterBackground: () => ({ prefs: { enabled: false } }),
    singleCharacterBackground: () => null,
    CharacterBackgroundControls: () => null,
    CharacterBackdrop: () => null,
    Button: 'Button',
    Spinner: 'Spinner',
    SceneRail: 'SceneRail',
    SceneCharacterRail: 'SceneCharacterRail',
    CharacterAvatar: 'CharacterAvatar',
    FullscreenButton: 'FullscreenButton',
    MemoryDraft: 'MemoryDraft',
    MessageRow: 'MessageRow',
    Empty: 'Empty',
    avatarSrc: (x) => x,
    window: mockWindow,
    performance: { now: () => nowMs },
    localStorage: { getItem: () => null, setItem: () => {} }
};

let nowMs = 1000;
const Panel = vm.runInNewContext(clientCode.slice(start, end) + '\nChatPanel', panelContext);

const props = {
    characters: [{ id: 'c1', name: '角色1' }],
    plays: [],
    lorebooks: [],
    presets: [],
    messages: [],
    activePlay: { id: 'p1', characterIds: ['c1'] },
    activePlayId: 'p1',
    activeSessionId: 's1'
};

// First render to discover which state slot is fullscreen (via FullscreenButton onClick)
stateCursor = 0;
const firstTree = Panel(props);
const findBtn = (n) => !n || typeof n !== 'object' ? null : (n.type === 'FullscreenButton' ? n : [n.props?.children].flat(Infinity).map(findBtn).find(Boolean));
const fsBtn = findBtn(firstTree);
assert.ok(fsBtn && typeof fsBtn.props?.onClick === 'function', 'FullscreenButton onClick must exist');
fsBtn.props.onClick();

// Second render in fullscreen state
stateCursor = 0;
effectCallbacks = [];
const fsTree = Panel(props);
assert.ok(fsTree.props.className.includes('tv-chat-expanded'), 'Fullscreen class applied');
effectCallbacks.forEach(fn => fn());

const onKeyDown = eventListeners['keydown'];
assert.ok(onKeyDown, 'keydown listener registered when fullscreen');

let prevented = false;
onKeyDown({ key: 'Escape', isComposing: false, defaultPrevented: false, repeat: false, preventDefault: () => { prevented = true; } });
assert.equal(prevented, false, 'First Esc does not exit fullscreen');

nowMs = 1300;
onKeyDown({ key: 'Escape', isComposing: false, defaultPrevented: false, repeat: false, preventDefault: () => { prevented = true; } });
assert.equal(prevented, true, 'Second Esc within 700ms exits fullscreen');

console.log('PASS double-Esc fullscreen: expanded overlay mode, single-press ignored, double-press within 700ms exits.');
