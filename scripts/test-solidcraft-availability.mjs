import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, lstat, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkSolidCraftAvailability } from '../lib/solidcraft-availability.ts';
import { SOLIDCRAFT_ASSETS } from '../functions/_shared/solidcraft-runtime.ts';
import { prepareSolidCraftPreview } from './prepare-solidcraft-preview.mjs';
import { stageSolidCraftPreview } from './stage-solidcraft-preview.mjs';

const html='<title>SolidCraft host</title><iframe id="sc"></iframe>';
const host='/solidcraft-preview/host.html';
const calls=[];
let bad=null;
const fetcher=async(url,init)=>{
  init.signal.throwIfAborted();calls.push([url,init]);
  if(url===host){
    assert.notEqual(init.method,'HEAD','host checks work through proxies that reject HEAD');
    return bad==='host'?new Response('missing',{status:404}):new Response(bad==='login'?'<title>Sign in</title>':html);
  }
  assert.equal(init.method,'HEAD','engine checks do not download oversized files');
  if(bad==='engine')return new Response(null,{status:503});
  return new Response(null,{headers:{'Content-Type':bad==='fallback'?'text/html':'application/wasm'}});
};
const signal=new AbortController().signal;
await checkSolidCraftAvailability(signal,fetcher);
assert.equal(calls.length,3);assert.ok(calls.every(([,init])=>init.cache==='no-store'));
for(const [kind,pattern] of [['host',/host\.html \(HTTP 404\)/],['login',/returned a different page/],['engine',/engine failed to load:.*HTTP 503/],['fallback',/returned a different file/]]){
  bad=kind;await assert.rejects(checkSolidCraftAvailability(signal,fetcher),pattern);
}
bad=null;await checkSolidCraftAvailability(signal,fetcher); // Retry after a failed check.
await assert.rejects(checkSolidCraftAvailability(signal,async()=>{throw new TypeError('Failed to fetch');}),/dev server or network/);
const abort=new AbortController();abort.abort();await assert.rejects(checkSolidCraftAvailability(abort.signal,fetcher),{name:'AbortError'});

const root=await mkdtemp(path.join(os.tmpdir(),'solidcraft-dev-'));
try {
  const vendor=path.join(root,'vendor/solidcraft-preview');
  for(const name of ['src','pane','solidcraft'])await mkdir(path.join(vendor,name),{recursive:true});
  await writeFile(path.join(vendor,'host.html'),html);
  await writeFile(path.join(vendor,'pane/pane.js'),'// tracked host');
  const cadDir=path.join(root,'cad'),webDir=path.join(root,'web');
  const opts={root,cadDir,webDir};
  assert.equal((await lstat(path.join(root,'public/solidcraft-preview')).catch(()=>null)),null);
  const first=await prepareSolidCraftPreview({...opts,requireEngines:false});
  assert.deepEqual(first.missing,SOLIDCRAFT_ASSETS.map(a=>a.path));
  assert.equal(await readFile(path.join(root,'public/solidcraft-preview/host.html'),'utf8'),html,'a clean checkout stages its host at dev startup');
  await assert.rejects(prepareSolidCraftPreview(opts),/Missing pinned SolidCraft engines/);
  for(const asset of SOLIDCRAFT_ASSETS){
    const source=asset.path.startsWith('kernel/')?path.join(cadDir,'packages/solidcraft-host/kernel/dist',path.basename(asset.path)):path.join(webDir,path.basename(asset.path));
    await mkdir(path.dirname(source),{recursive:true});await writeFile(source,'test engine fixture');
  }
  assert.deepEqual((await prepareSolidCraftPreview(opts)).missing,[]);
  for(const asset of SOLIDCRAFT_ASSETS)assert.equal((await lstat(path.join(root,'public/solidcraft-preview',asset.path))).isSymbolicLink(),true,'local engines are linked without copying large binaries');
  await stageSolidCraftPreview(root);
  for(const asset of SOLIDCRAFT_ASSETS)assert.equal(await lstat(path.join(root,'public/solidcraft-preview',asset.path)).catch(()=>null),null,'production staging does not ship local engine links');
  await rm(path.join(root,'public/solidcraft-preview'),{recursive:true});
  await symlink(vendor,path.join(root,'public/solidcraft-preview'),'dir');
  await assert.rejects(stageSolidCraftPreview(root),/Refusing to replace a symlink/);
  assert.equal(await readFile(path.join(vendor,'host.html'),'utf8'),html,'a rejected staging target remains untouched');
} finally {await rm(root,{recursive:true,force:true});}

const server=await readFile('server.js','utf8');
assert.ok(server.indexOf('await prepareSolidCraftPreview(')<server.indexOf('const app = next('),'runtime is prepared before Next scans public files');
assert.match(server,/if \(dev\) server.use\('\/solidcraft-preview', express.static/,'dev serves runtime GET and HEAD directly');
console.log('SolidCraft availability: clean dev setup, local engine links, production staging, file-specific errors and retry pass.');
