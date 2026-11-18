import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/dsh-tavern/lib/index.js', import.meta.url), 'utf8');
const testModule = Buffer.from(source + '\nexport { TavernSessionRuntime };').toString('base64');
const { TavernSessionRuntime } = await import('data:text/javascript;base64,' + testModule);

const play = {
  id: 'play',
  sessionId: 'session',
  characterIds: ['character'],
  provider: 'draft-test-provider',
  model: 'draft-test-model',
  updatedAt: 'original'
};
const expectedRoute = { provider: play.provider, model: play.model };
const events = [];
const calls = [];
const session = {
  id: play.sessionId,
  snapshotEvents: () => structuredClone(events),
  toolHistory: () => []
};
const agent = { status: 'idle', session, runMaintenance: operation => operation() };
const runtime = new TavernSessionRuntime({
  storage: {
    getPlay: () => play,
    getCharacter: () => ({ card: { data: { name: '角色甲' } } }),
    getPreset: () => undefined
  },
  async *streamLlm(request) {
    assert.equal(request.provider, expectedRoute.provider);
    assert.equal(request.model, expectedRoute.model);
    const payload = request.messages[1].content[0].text;
    assert.ok(payload.length <= 160_000);
    calls.push(JSON.parse(payload));
    yield { type: 'text-delta', index: 0, text: '草稿' + calls.length };
    yield { type: 'finish', reason: { kind: 'completed' } };
  }
});
runtime.ensureDirector = async () => ({ agent });

const message = text => ({
  type: 'user/message',
  data: { id: 'message-' + events.length, content: [{ type: 'text', text }] }
});
function turn(first, second, kind = 'completed') {
  events.push(message(first), message(second), { type: 'turn/end', data: { reason: { kind } } });
}
const draft = () => runtime.draftCharacterMemory(play.id, 'character');

await assert.rejects(draft, /还没有已完成/);
turn('早期约定', '回复');
assert.equal((await draft()).text, '草稿1');
assert.deepEqual(calls.pop(), ['早期约定', '回复']);

turn('作废', '作废回复', 'error');
const long = '字'.repeat(80_000);
turn(long, '完整轮次 A');
turn(long, '完整轮次 B');
events.push(message('进行中'));
const before = structuredClone(events);
const result = await draft();
assert.equal(result.text, '草稿3');
assert.equal(result.expectedUpdatedAt, play.updatedAt);
assert.equal(result.draftSource.sessionId, play.sessionId);
assert.equal(result.draftSource.count, events.length);
assert.deepEqual(calls, [
  [['早期约定', '回复'], [long, '完整轮次 A']],
  [[long, '完整轮次 B']],
  ['草稿1', '草稿2']
]);
assert.deepEqual(events, before);

turn('字'.repeat(160_000), '超长单轮');
await assert.rejects(draft, /单个已完成轮次过长/);
assert.equal(calls.length, 3);
events.splice(-3);

const budgets = [];
runtime.deps.streamLlm = async function* (request) {
  budgets.push(request.maxTokens);
  if (budgets.length === 1) {
    yield { type: 'text-delta', index: 0, text: '截断内容' };
    yield { type: 'finish', reason: { kind: 'max-tokens' } };
    return;
  }
  assert.doesNotMatch(request.messages[1].content[0].text, /截断内容/);
  yield { type: 'text-delta', index: 0, text: '完整草稿' };
  yield { type: 'finish', reason: { kind: 'completed' } };
};
assert.equal((await draft()).text, '完整草稿');
assert.deepEqual(budgets, [4096, 16384, 4096, 4096]);
runtime.deps.streamLlm = async function* () {
  yield { type: 'finish', reason: { kind: 'max-tokens' } };
};
await assert.rejects(draft, /总结第 1\/2 段时 .*重试仍达到输出上限/);
assert.deepEqual(events, before);
console.log('PASS memory draft: model routing, whole-turn batching, merge, history preservation, and bounded retry.');
