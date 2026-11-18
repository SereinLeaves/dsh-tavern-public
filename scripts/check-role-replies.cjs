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

const originalRole = tool('summary-role', '角色：[提示：任务已完成]\n[状态：晴]\n动作：她开门。\n语言：“等等……”', { characterId: 'role-a' });
const quotedDirector = '楼下有响动。\n\n甲：\n[状态：晴]\n动作：她开门。\n语言："等等......"\n\n雨停了。';
const merged = rows(originalRole, director(quotedDirector));
assert.deepEqual(merged.map(row => [row.name, row.text]), [
  [undefined, '楼下有响动。'],
  ['甲', '[提示：任务已完成]\n[状态：晴]\n动作：她开门。\n语言："等等......"\n\n雨停了。']
]);
assert.equal(merged[1].stepText, quotedDirector);
assert.equal(merged[1].messageId, 'director-msg');
assert.equal(rows(originalRole, director(quotedDirector.replace('等等', '快走'))).length, 3);
assert.equal(rows(originalRole, director(quotedDirector.replace('甲：', '乙----旧称：'))).length, 3);
assert.equal(rows(originalRole, director(quotedDirector, { status: 'running' })).length, 3);
assert.deepEqual(rows(role, director('甲：她轻声说。\n“我愿意。”', { status: 'running' })).map(row => row.status), ['streaming', 'done']);
assert.equal(rows(role, director('甲：她轻声说。\n“我愿意。”', { turn: 2 })).length, 2);
assert.equal(rows(tool('brief', '角色：好', { characterId: 'role-a' }), director('很好。')).length, 2);
assert.deepEqual(rows(tool('legacy', '乙：是我。', { characterName: '乙' }))[0].speakerNames, ['乙----旧称']);
assert.deepEqual(rows(tool('default', '角色：我在。', {})).map(row => row.text), ['我在。']);
assert.deepEqual(rows(tool('error', '角色：出错了。', {}, { isError: true }), tool('foreign', '私有工具结果。', {}, { name: 'other' })), []);
assert.equal(rows(narration)[0].messageId, 'director-msg');
const reasoningStep = {
  ...director('', { step: 1 }),
  data: { ...director('', { step: 1 }).data, blocks: [
    { kind: 'reasoning', text: '确认角色后调用工具。' }, { kind: 'tool-call', name: 'tavern_speak' }
  ], finalNode: { messageId: 'non-editable-tool-step' } }
};
const withDirector = rows(reasoningStep, role, director('甲：她轻声说。\n“我愿意。”'));
assert.equal(withDirector.length, 1);
assert.equal(withDirector[0].thinking, '确认角色后调用工具。');
assert.equal(withDirector[0].messageId, 'director-msg');
const withRoleOnly = rows(reasoningStep, role);
assert.equal(withRoleOnly.length, 1);
assert.equal(withRoleOnly[0].thinking, '确认角色后调用工具。');
assert.equal(withRoleOnly[0].text, '她轻声说。\n\n“我愿意。”');
const beforeOtherTurn = rows(reasoningStep, director('新一轮。', {turn: 2}));
assert.equal(beforeOtherTurn[0].messageId, undefined);
assert.equal(beforeOtherTurn[1].thinking, undefined);
const editedRole = tool('edited-quote', '角色：[状态：进行中]\n[进度：10%]\n[天气：晴]\n[时间：下午]\n[地点：走廊]\n[物品：钥匙]\n动作：她开门。\n语言：“等等……”', { characterId: 'role-a' });
const editedQuote = director('[提示：任务已完成]\n\n甲：\n[状态：完成]\n[进度：20%]\n[天气：晴]\n[时间：下午]\n[地点：走廊]\n[物品：钥匙]\n动作：她开门。\n语言：“等等……”\n\n*（雨停了。）*');
const consolidated = rows(reasoningStep, editedRole, editedQuote);
assert.equal(consolidated.length, 2);
assert.equal(consolidated[0].narrator, true);
assert.equal(consolidated[0].text, '[提示：任务已完成]\n\n*（雨停了。）*');
assert.equal(consolidated[0].thinking, '确认角色后调用工具。');
assert.equal(consolidated[1].name, '甲');
assert.equal(consolidated[1].text, '[状态：完成]\n[进度：20%]\n[天气：晴]\n[时间：下午]\n[地点：走廊]\n[物品：钥匙]\n动作：她开门。\n语言：“等等……”');
assert.equal(consolidated[1].stepText, editedQuote.data.blocks[0].text);
console.log('PASS Tavern role results, director narration, same-turn quotation, streaming, legacy names and failed/unrelated tools.');
