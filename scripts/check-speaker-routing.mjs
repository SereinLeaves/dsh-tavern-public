import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../dist/dsh-tavern/lib/index.js', import.meta.url), 'utf8');
const moduleSource = source + '\nexport { TavernSessionRuntime as Runtime };';
const { Runtime } = await import('data:text/javascript;base64,' + Buffer.from(moduleSource).toString('base64'));

function character(id, name) {
  return { id, card: { data: { name, description: '', personality: '', scenario: '' } } };
}

const characters = [character('role-a', '林老师----课后'), character('role-b', '周老师')];
const play = { id: 'play', sessionId: 'session', characterIds: ['role-a', 'role-b'], multiAgent: true };
const runtime = new Runtime({
  storage: {
    listPlays: () => [play],
    getCharacter: id => characters.find(role => role.id === id),
  },
});
runtime.currentScene = () => ({ characterIds: ['role-a'], activeCharacterIds: ['role-a'] });
runtime.automaticSpeakers = () => null;
runtime.assertActive = () => {};
const routed = new Error('End of routing check');
runtime.ensureRoleAgent = async (_play, target) => {
  assert.equal(target.id, 'role-a');
  throw routed;
};
const speak = args => runtime.speakFor({ agent: { id: 'session' } }, args);
const prompt = runtime.buildDirectorSystem(play, characters, undefined, { contract: '', wrap: text => text });

assert.match(prompt, /"name":"林老师----课后","characterId":"role-a"/);
assert.match(prompt, /参数 characterId=/);
assert.doesNotMatch(prompt, /参数 characterName=/);
await assert.rejects(speak({ characterId: 'role-a', characterName: '周老师' }), error => error === routed);
await assert.rejects(speak({ characterName: '林老师----课后' }), error => error === routed);
await assert.rejects(speak({ characterName: '林老师' }), error => error === routed);
await assert.rejects(speak({}), error => error === routed);
await assert.rejects(speak({ characterId: 'unknown', characterName: '林老师' }), /找不到/);
await assert.rejects(speak({ characterId: 'role-b' }), /尚未出场/);
characters.push(character('role-c', '林老师----上课'));
play.characterIds.push('role-c');
await assert.rejects(speak({ characterName: '林老师' }), /多个角色/);
console.log('PASS speaker routing: director prompt, ID priority, unique aliases, ambiguity, and scene errors.');
