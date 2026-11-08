import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('snapshot.json',root),'utf8'));
for(const [path,expected] of Object.entries(manifest.files)){
 const bytes=await readFile(new URL(path,root));
 if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Snapshot hash mismatch: '+path);
 if(path.endsWith('.js'))execFileSync(process.execPath,['--check',fileURLToPath(new URL(path,root))],{stdio:'pipe'});
}
for(const script of ['check-play-selection.cjs','check-lifecycle.mjs','check-edit-draft.cjs','check-auto-memory.mjs','check-history.mjs','check-settings.mjs','check-translation.cjs','check-scene.mjs','check-scene-client.cjs','check-scene-sync.mjs']){
 execFileSync(process.execPath,[fileURLToPath(new URL(script,import.meta.url))],{stdio:'inherit'});
}
const client = await readFile(new URL('dist/dsh-tavern/lib/client.js',root),'utf8');
const fixture = await readFile(new URL('scripts/scene-client.fixture.js',root),'utf8');
if (!client.includes(fixture.trimEnd())) throw Error('Avatar component fixture differs from installed code');
const projection = await readFile(new URL('scripts/scene-projection.fixture.js',root),'utf8');
const server = await readFile(new URL('dist/dsh-tavern/lib/index.js',root),'utf8');
if (!client.includes(projection.trimEnd()) || !server.includes(projection.trimEnd())) throw Error('Scene projection differs between client and server');
console.log('PASS installed snapshot checksums, JavaScript syntax, history/settings/translation regressions.');
