const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(process.argv[2] ?? path.join(__dirname, '../dist/dsh-tavern/lib/client.js'), 'utf8');
const start = source.indexOf('function blocksToText(');
const end = source.indexOf('/** Load the full tavern state snapshot.', start);
assert.ok(start >= 0 && end > start);
const extractMessages = Function(source.slice(start, end) + '\nreturn extractMessages;')();

const characters = new Map([['role-a', '甲'], ['role-b', '乙----旧称']]);
const text = text => ({ type: 'text', text });
const user = { key: 'input', id: 'input-msg', kind: 'user', data: { content: [text('请继续。')] } };
const tool = (key, rendered, args, { turn = 1, step = 1, ...overrides } = {}) => ({
  key,
  kind: 'tool-call',
  location: { kind: 'step', turn: { turn }, step: { step } },
  data: {
    root: {
      kind: 'tool-result', name: 'tavern_speak', isError: false,
      call: { argsRaw: JSON.stringify(args) }, content: [text(rendered)], ...overrides
    }
  }
});
const director = (body, { turn = 1, step = 2, status = 'settled' } = {}) => ({
  key: `director-${turn}-${step}`, kind: 'assistant-step',
  data: { turn, step, status, blocks: [{ kind: 'text', text: body }], finalNode: { messageId: 'director-msg' } }
});
const rows = (...nodes) => extractMessages(
  { order: [user, ...nodes].map(node => node.key), nodes: new Map([user, ...nodes].map(node => [node.key, node])) },
  [...characters.values()], characters
).slice(1);

const role = tool('role-1', '角色：她轻声说。\n\n“我愿意。”', { characterId: 'role-a' });
const narration = director('风停了下来。');
assert.deepEqual(rows(role, narration).map(row => [row.name, row.text, row.messageId]), [
  [undefined, '风停了下来。', 'director-msg'],
  ['甲', '她轻声说。\n\n“我愿意。”', undefined]
]);
const nextRole = tool('role-2', '乙：是我。', { characterName: '乙' });
assert.deepEqual(rows(role, narration, nextRole).map(row => row.id), ['director-1-2#0', 'role-1', 'role-2']);
assert.deepEqual(rows(role, director('新一轮。', { turn: 2 })).map(row => row.id), ['role-1', 'director-2-2#0']);
const steering = { ...user, key: 'steering', kind: 'steering' };
assert.deepEqual(rows(role, steering, narration).map(row => row.id), ['role-1', 'steering', 'director-1-2#0']);
assert.deepEqual(rows(role).map(row => row.id), ['role-1']);
assert.equal(rows(role, director('甲：\n她轻声说。\n"我愿意。"\n门开了。')).length, 1);
assert.deepEqual(rows(role, director('甲：她轻声说。\n“我愿意。”', { status: 'running' })).map(row => row.status), ['streaming', 'done']);
assert.equal(rows(role, director('甲：她轻声说。\n“我愿意。”', { turn: 2 })).length, 2);
assert.equal(rows(tool('brief', '角色：好', { characterId: 'role-a' }), director('很好。')).length, 2);
assert.deepEqual(rows(tool('legacy', '乙：是我。', { characterName: '乙' }))[0].speakerNames, ['乙----旧称']);
assert.deepEqual(rows(tool('default', '角色：我在。', {})).map(row => row.text), ['我在。']);
assert.deepEqual(rows(tool('error', '角色：出错了。', {}, { isError: true }), tool('foreign', '私有工具结果。', {}, { name: 'other' })), []);
assert.equal(rows(narration)[0].messageId, 'director-msg');
console.log('PASS Tavern role results, director narration, same-turn quotation, streaming, legacy names and failed/unrelated tools.');
