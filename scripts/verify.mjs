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
for(const script of ['check-history.mjs','check-settings.mjs','check-translation.cjs']){
 execFileSync(process.execPath,[fileURLToPath(new URL(script,import.meta.url))],{stdio:'inherit'});
}
console.log('PASS installed snapshot checksums, JavaScript syntax, history/settings/translation regressions.');
