import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const indexCode = await readFile(new URL('../dist/dsh-tavern/lib/index.js', import.meta.url), 'utf8');
const clientCode = await readFile(new URL('../dist/dsh-tavern/lib/client.js', import.meta.url), 'utf8');

const {
  LibraryStore,
  TavernStorage,
  TavernSessionRuntime: Runtime,
  tavernHandler,
  extractPresetPrompts,
  renderPresetPrompts,
  projectPresetMessages,
  installLlmProjection,
  buildCharacterSystem,
  buildClassicSystem,
  resolveModel,
  serializePreset
} = await import(
  'data:text/javascript;base64,' +
    Buffer.from(
      indexCode +
        '\nexport {LibraryStore,TavernStorage,TavernSessionRuntime,tavernHandler,extractPresetPrompts,renderPresetPrompts,projectPresetMessages,installLlmProjection,buildCharacterSystem,buildClassicSystem,resolveModel,serializePreset};'
    ).toString('base64')
);

const root = await mkdtemp(join(tmpdir(), 'tavern-preset-decouple-'));
const logger = { warn() {}, error() {} };

try {
  const library = await LibraryStore.open(root, logger);
  const storage = new TavernStorage(library, { get: () => ({}) });
  await storage.upsertCharacter({
    id: 'char-1',
    card: {
      data: {
        name: '艾莉',
        description: '测试角色',
        personality: '温柔',
        scenario: '酒馆',
        first_mes: '你好',
        mes_example: '',
        system_prompt: '',
        post_history_instructions: ''
      }
    }
  });

  const stPreset = {
    id: 'preset-st',
    name: '双人成行测试版',
    provider: 'preset-prov',
    model: 'preset-mod',
    systemPrompt: '手动补充风格：保持细腻',
    raw: {
      prompts: [
        { identifier: 'p-disabled', name: '禁用条目', role: 'system', content: 'SHOULD_NOT_APPEAR', injection_position: 0, injection_depth: 4, enabled: false },
        { identifier: 'p-before-sys', name: '前置系统', role: 'system', content: '主规则：{{// 内部注释}}面向{{user}}扮演{{char}}', injection_position: 0, injection_depth: 4, enabled: true },
        { identifier: 'p-before-user', name: '前置用户', role: 'user', content: '前置用户引导', injection_position: 0, injection_depth: 4, enabled: true },
        { identifier: 'p-before-asst', name: '前置助手', role: 'assistant', content: '前置助手起手', injection_position: 0, injection_depth: 4, enabled: true },
        { identifier: 'charDescription', name: '角色描述槽', marker: true, role: 'system', content: '' },
        { identifier: 'chatHistory', name: '聊天历史槽', marker: true, role: 'system', content: '' },
        { identifier: 'p-depth-2', name: '深度2提醒', role: 'user', content: '深度2用户提醒', injection_position: 1, injection_depth: 2, enabled: true },
        { identifier: 'p-depth-0', name: '深度0格式', role: 'system', content: '深度0结尾格式', injection_position: 1, injection_depth: 0, enabled: true },
        { identifier: 'p-after-asst', name: '历史后助手', role: 'assistant', content: '历史后助手prefill', injection_position: 0, injection_depth: 4, enabled: true }
      ],
      prompt_order: [
        {
          character_id: 100001,
          order: [
            { identifier: 'p-disabled', enabled: false },
            { identifier: 'p-before-sys', enabled: true },
            { identifier: 'p-before-user', enabled: true },
            { identifier: 'p-before-asst', enabled: true },
            { identifier: 'charDescription', enabled: true },
            { identifier: 'chatHistory', enabled: true },
            { identifier: 'p-depth-2', enabled: true },
            { identifier: 'p-depth-0', enabled: true },
            { identifier: 'p-after-asst', enabled: true }
          ]
        }
      ]
    }
  };
  await storage.upsertPreset(stPreset);

  const barePreset = {
    id: 'preset-bare',
    name: '无模型预设',
    raw: { prompts: [] }
  };
  await storage.upsertPreset(barePreset);

  // 1. Verify extractPresetPrompts, renderPresetPrompts, and no double-flattening into system string
  const extracted = extractPresetPrompts(stPreset);
  assert.equal(extracted.length, 9);
  assert.equal(extracted[0].enabled, false);
  assert.equal(extracted[1].enabled, true);

  const rendered = renderPresetPrompts(stPreset, '艾莉');
  assert.ok(rendered.beforeText.includes('主规则：面向玩家扮演艾莉'));
  assert.ok(!rendered.beforeText.includes('内部注释'));
  assert.ok(!rendered.beforeText.includes('SHOULD_NOT_APPEAR'));
  assert.ok(rendered.depthText.includes('深度0结尾格式'));

  const charSys = buildCharacterSystem(storage.getCharacter('char-1'), '', stPreset, []);
  assert.ok(charSys.includes('手动补充风格：保持细腻'));
  assert.ok(!charSys.includes('主规则：面向玩家扮演艾莉'));
  assert.ok(!charSys.includes('深度0结尾格式'));
  assert.ok(!charSys.includes('SHOULD_NOT_APPEAR'));

  const classicSys = buildClassicSystem({ characterIds: ['char-1'] }, [storage.getCharacter('char-1')], '', stPreset);
  assert.ok(classicSys.includes('手动补充风格：保持细腻'));
  assert.ok(!classicSys.includes('主规则：面向玩家扮演艾莉'));
  assert.ok(!classicSys.includes('深度0结尾格式'));

  // 2. Rework 1: Verify message-level role & injection_depth (0 and 2) with chat history
  const baseMessages = [
    { id: 'sys-0', role: 'system', content: [{ type: 'text', text: '基础系统提示' }] },
    { id: 'u-1', role: 'user', content: [{ type: 'text', text: '玩家消息1' }] },
    { id: 'a-1', role: 'assistant', content: [{ type: 'text', text: '角色回复1' }] },
    { id: 'u-2', role: 'user', content: [{ type: 'text', text: '玩家消息2' }] },
    { id: 'a-2', role: 'assistant', content: [{ type: 'text', text: '角色回复2' }] }
  ];

  const projected = projectPresetMessages(baseMessages, stPreset, '艾莉');
  const getText = (m) => m.content.map((b) => b.text).join('');
  assert.deepEqual(
    projected.map((m) => [m.role, getText(m)]),
    [
      ['system', '基础系统提示'],
      ['system', '主规则：面向玩家扮演艾莉'],
      ['user', '前置用户引导'],
      ['assistant', '前置助手起手'],
      ['user', '玩家消息1'],
      ['assistant', '角色回复1'],
      ['user', '深度2用户提醒'],
      ['user', '玩家消息2'],
      ['assistant', '角色回复2'],
      ['system', '深度0结尾格式'],
      ['assistant', '历史后助手prefill']
    ]
  );

  // 3. Verify installLlmProjection intercepts llm.stream & llm.prepareCall scoped by sessionId (skipping compaction)
  const deps = {
    storage,
    logger,
    defaultModel: () => ({ provider: 'default-prov', model: 'default-mod', reasoningEffort: 'low' })
  };
  const rt = new Runtime(deps);
  const playHistory = [
    { type: 'user/message', data: { id: 'h-u1', role: 'user', content: [{ type: 'text', text: '玩家消息1' }] } },
    { type: 'assistant/message', data: { message: { id: 'h-a1', role: 'assistant', content: [{ type: 'text', text: '角色回复1' }] } } }
  ];
  const play = {
    id: 'play-decouple',
    title: '解耦测试',
    sessionId: 'sess-decouple',
    characterIds: ['char-1'],
    lorebookIds: [],
    presetId: 'preset-st',
    provider: 'p1',
    model: 'm1',
    multiAgent: false,
    narratorEnabled: false,
    updatedAt: 'v1'
  };
  await storage.upsertPlay(play);

  const selections = [];
  let currentSel = { provider: 'p1', model: 'm1' };
  const agent = {
    id: play.sessionId,
    status: 'idle',
    session: { snapshotEvents: () => playHistory },
    runMaintenance: (job) => job(),
    model: {
      current: () => currentSel,
      select(next) {
        currentSel = next;
        selections.push(next);
      }
    }
  };
  rt.liveOptions.set(agent, {});
  rt.directors.set(play.id, { agent, dispose: async () => {} });

  const capturedStreamCalls = [];
  const capturedPrepareCalls = [];
  const mockLlm = {
    async *stream(opts) {
      capturedStreamCalls.push(opts);
      yield { type: 'finish', reason: { kind: 'completed' } };
    },
    async prepareCall(provider, model, _signal) {
      return {
        async *stream(opts) {
          capturedPrepareCalls.push({ provider, model, ...opts });
          yield { type: 'finish', reason: { kind: 'completed' } };
        }
      };
    }
  };
  const uninstall = installLlmProjection(mockLlm, rt);

  for await (const _chunk of mockLlm.stream({
    sessionId: play.sessionId,
    provider: currentSel.provider,
    model: currentSel.model,
    messages: baseMessages
  })) {}
  const prepared1 = await mockLlm.prepareCall(currentSel.provider, currentSel.model);
  for await (const _chunk of prepared1.stream({
    sessionId: play.sessionId,
    messages: baseMessages
  })) {}
  // Compaction & non-tavern sessions must remain untouched
  for await (const _chunk of mockLlm.stream({
    sessionId: play.sessionId,
    purpose: 'compaction',
    provider: 'compaction-provider',
    model: 'compaction-model',
    messages: baseMessages
  })) {}
  const prepared2 = await mockLlm.prepareCall('default-prov', 'default-mod');
  for await (const _chunk of prepared2.stream({
    sessionId: 'non-tavern-session',
    messages: baseMessages
  })) {}

  assert.equal(capturedStreamCalls[0].messages.length, 11);
  assert.deepEqual(
    capturedStreamCalls[0].messages.map((m) => m.role),
    ['system', 'system', 'user', 'assistant', 'user', 'assistant', 'user', 'user', 'assistant', 'system', 'assistant']
  );
  assert.equal(capturedPrepareCalls[0].messages.length, 11);
  assert.equal(capturedStreamCalls[1].messages.length, 5);
  assert.equal(capturedPrepareCalls[1].messages.length, 5);

  // 4. Verify resolveModel atomic pair priority: play pair > preset pair > DSH default
  assert.deepEqual(resolveModel(deps, stPreset, { provider: 'custom-p', model: 'custom-m' }), {
    provider: 'custom-p',
    model: 'custom-m',
    maxTokens: undefined
  });
  // Partial play config must NOT combine with preset's model/provider
  assert.deepEqual(resolveModel(deps, stPreset, { provider: 'partial-p' }), {
    provider: 'preset-prov',
    model: 'preset-mod',
    maxTokens: undefined
  });
  assert.deepEqual(resolveModel(deps, barePreset, {}), {
    provider: 'default-prov',
    model: 'default-mod',
    reasoningEffort: 'low',
    maxTokens: undefined
  });

  // 5. Verify PUT /tavern/presets/:id promptUpdates + serialization
  async function req(method, url, body) {
    let status;
    let result;
    const stream = body !== undefined ? Readable.from([Buffer.from(JSON.stringify(body))]) : Readable.from([]);
    Object.assign(stream, {
      method,
      url,
      headers: { host: 'localhost', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }
    });
    await tavernHandler(
      {
        storage,
        runtime: rt,
        logger,
        config: { allowedHosts: [] },
        multiAgentAvailable: () => true,
        defaultModel: deps.defaultModel
      },
      stream,
      {
        writeHead(code) { status = code; },
        end(value) { result = JSON.parse(value); }
      }
    );
    return { status, result };
  }

  const stateRes = await req('GET', '/tavern/state');
  assert.equal(stateRes.status, 200);
  assert.deepEqual(stateRes.result.defaultModel, { provider: 'default-prov', model: 'default-mod', reasoningEffort: 'low' });

  const patchRes = await req('PUT', '/tavern/presets/preset-st', {
    promptUpdates: [
      { identifier: 'p-disabled', enabled: true, content: '已启用条目' },
      { identifier: 'p-before-sys', enabled: false }
    ]
  });
  assert.equal(patchRes.status, 200);
  const updatedPreset = storage.getPreset('preset-st');
  const renderedAfter = renderPresetPrompts(updatedPreset, '艾莉');
  assert.ok(renderedAfter.beforeText.includes('已启用条目'));
  assert.ok(!renderedAfter.beforeText.includes('主规则'));
  const exported = serializePreset(updatedPreset);
  assert.equal(exported.prompt_order[0].order[0].enabled, true);
  assert.equal(exported.prompt_order[0].order[1].enabled, false);

  // 6. Rework 2: Atomic (Provider, Model ID) pair validation, fallback chain, and hot-switching preservation
  // 6a. POST /tavern/plays rejects partial (provider-only or model-only)
  const postOnlyProv = await req('POST', '/tavern/plays', {
    characterIds: ['char-1'],
    presetId: 'preset-st',
    provider: 'only-prov'
  });
  assert.equal(postOnlyProv.status, 400);
  assert.ok(postOnlyProv.result.error.includes('Provider 与模型 ID'));

  const postOnlyMod = await req('POST', '/tavern/plays', {
    characterIds: ['char-1'],
    presetId: 'preset-st',
    model: 'only-mod'
  });
  assert.equal(postOnlyMod.status, 400);
  assert.ok(postOnlyMod.result.error.includes('Provider 与模型 ID'));

  // 6b. PUT /tavern/plays/:id with complete (provider, model)
  const switchRes = await req('PUT', `/tavern/plays/${play.id}`, {
    presetId: 'preset-st',
    provider: 'alternate-provider',
    model: 'alternate-model',
    expectedUpdatedAt: 'v1'
  });
  assert.equal(switchRes.status, 200);
  assert.equal(switchRes.result.sessionId, 'sess-decouple');
  assert.equal(switchRes.result.presetId, 'preset-st');
  assert.equal(switchRes.result.provider, 'alternate-provider');
  assert.equal(switchRes.result.model, 'alternate-model');
  assert.deepEqual(currentSel, { provider: 'alternate-provider', model: 'alternate-model' });
  for await (const _chunk of mockLlm.stream({
    sessionId: play.sessionId,
    provider: currentSel.provider,
    model: currentSel.model,
    messages: baseMessages
  })) {}
  assert.equal(capturedStreamCalls.at(-1).provider, 'alternate-provider');
  assert.equal(capturedStreamCalls.at(-1).model, 'alternate-model');

  // 6c. PUT /tavern/plays/:id rejects partial update (clearing provider while keeping model)
  const partialClearRes = await req('PUT', `/tavern/plays/${play.id}`, {
    provider: null,
    expectedUpdatedAt: switchRes.result.updatedAt
  });
  assert.equal(partialClearRes.status, 400);
  assert.ok(partialClearRes.result.error.includes('Provider 与模型 ID'));
  assert.equal(selections.length, 1);
  assert.equal(storage.getPlay(play.id).provider, 'alternate-provider');

  // 6d. Clearing both (provider: null, model: null) falls back to preset's (provider, model)
  const clearToPresetRes = await req('PUT', `/tavern/plays/${play.id}`, {
    provider: null,
    model: null,
    expectedUpdatedAt: switchRes.result.updatedAt
  });
  assert.equal(clearToPresetRes.status, 200);
  assert.equal(clearToPresetRes.result.sessionId, 'sess-decouple');
  assert.equal(clearToPresetRes.result.presetId, 'preset-st');
  assert.equal(clearToPresetRes.result.provider, undefined);
  assert.equal(clearToPresetRes.result.model, undefined);
  assert.deepEqual(currentSel, { provider: 'preset-prov', model: 'preset-mod' });
  for await (const _chunk of mockLlm.stream({
    sessionId: play.sessionId,
    provider: currentSel.provider,
    model: currentSel.model,
    messages: baseMessages
  })) {}
  assert.equal(capturedStreamCalls.at(-1).provider, 'preset-prov');
  assert.equal(capturedStreamCalls.at(-1).model, 'preset-mod');

  // 6e. Partial update on cleared play (model-only) rejected
  const partialSetRes = await req('PUT', `/tavern/plays/${play.id}`, {
    model: 'orphan-model',
    expectedUpdatedAt: clearToPresetRes.result.updatedAt
  });
  assert.equal(partialSetRes.status, 400);
  assert.ok(partialSetRes.result.error.includes('Provider 与模型 ID'));
  assert.equal(selections.length, 2);

  // 6f. Switching to a preset without model falls back to DSH default
  const fallbackDshRes = await req('PUT', `/tavern/plays/${play.id}`, {
    presetId: 'preset-bare',
    expectedUpdatedAt: clearToPresetRes.result.updatedAt
  });
  assert.equal(fallbackDshRes.status, 200);
  assert.equal(fallbackDshRes.result.sessionId, 'sess-decouple');
  assert.equal(fallbackDshRes.result.presetId, 'preset-bare');
  assert.equal(currentSel.provider, 'default-prov');
  assert.equal(currentSel.model, 'default-mod');
  for await (const _chunk of mockLlm.stream({
    sessionId: play.sessionId,
    provider: currentSel.provider,
    model: currentSel.model,
    messages: baseMessages
  })) {}
  assert.equal(capturedStreamCalls.at(-1).provider, 'default-prov');
  assert.equal(capturedStreamCalls.at(-1).model, 'default-mod');

  // Confirm chat history was preserved across all hot-switches
  assert.deepEqual(agent.session.snapshotEvents(), playHistory);
  uninstall();

  // 7. Verify client.js contains decoupled model UI, default-source display, and partial validation
  assert.ok(clientCode.includes('模型与 API（独立于预设）'));
  assert.ok(clientCode.includes('extractClientPresetPrompts'));
  assert.ok(clientCode.includes('promptUpdates'));
  assert.ok(clientCode.includes('当前默认来源：'));
  assert.ok(clientCode.includes('hasPartialModel'));

  console.log('PASS preset message roles/injection_depth (0/2), atomic (provider, model) validation, fallback chain, and hot-switch preservation.');
} finally {
  await rm(root, { recursive: true, force: true });
}
