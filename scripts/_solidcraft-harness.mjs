// Node-only referee for the shipped SolidCraft interpreter, translator and
// unmodified engine. App code never imports this helper or executes source here.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { arc, mt, hostPrepare, translateDoc } from '../vendor/solidcraft-preview/pane/bundle/host-lib.js';
import { createUpstreamBridge } from '../vendor/solidcraft-preview/src/upstream-bridge.mjs';
import { translateProjectSketch } from '../vendor/solidcraft-preview/pane/src/project-sketch.mjs';
import { sketchCommands } from '../lib/solidcraft-sketch-script.ts';
import { mapSketch } from '../vendor/solidcraft-preview/pane/bundle/host-lib.js';
const bundle=fs.readFileSync(new URL('../vendor/solidcraft-preview/pane/bundle/runner.js',import.meta.url),'utf8');
export function evaluateCad(source){let listen,result;const parent={postMessage:r=>{result=r;}};const window={parent,addEventListener:(_,fn)=>{listen=fn;}};vm.runInNewContext(bundle,{window,console});listen({source:parent,data:{source:'reshape-run',runId:1,code:source}});return JSON.parse(JSON.stringify(result));}
export async function buildCad(source,dir,view='solid'){
 const result=evaluateCad(source);if(result.errors.length)throw Error(JSON.stringify(result.errors));
 const kernel=createRequire(import.meta.url)(path.join(path.resolve(dir),'solidcraft_referee_p2.js'));let held=[];
 const run=commands=>{const raw=JSON.parse(kernel.run(JSON.stringify({commands})));if(!raw.results)throw Error(JSON.stringify(raw));return raw;};
 const execute=async(command,params={})=>{
  if(command==='file.new'){held=[];return {};}
  const raw=run([...held,{command,params}]);const failed=raw.results.find(r=>!r.ok);if(failed)throw Error(JSON.stringify(failed));
  if(!['document.inspect','document.revision','sketch.inspect','model.faces','model.edges','inspect.measure'].includes(command))held.push({command,params});
  return raw.results.at(-1).out;
 };
 const api={execute,inspect:params=>execute('document.inspect',params),async request(method,{commands}){
  if(method!=='engine.batch')throw Error('Unexpected native request '+method);
  const raw=run([...held,...commands]);const replies=raw.results.slice(held.length);const index=replies.findIndex(r=>!r.ok);
  const completed=index<0?replies.length:index;held.push(...commands.slice(0,completed));
  return {completed,results:replies.slice(0,completed).map(r=>r.out),...(index<0?{}:{failed:{index,command:commands[index].command,error:replies[index].error}})};
 }};
 const bridge=createUpstreamBridge(api);
 if(view==='sketch'){const commands=sketchCommands(result.doc,mapSketch);return {tr:{commands,features:[]},fin:await bridge.execute(commands,{fresh:true})};}
 const prepared=hostPrepare(result,{recorded:true});if(prepared.refusal)throw Error(prepared.refusal);
 const context={arc,mt,soups:{},runSC:(commands,options)=>bridge.execute(commands,{fresh:true,...options}),topologyOf:commands=>bridge.topologyOf(commands),followMoves:true,fromUsage:prepared.fromUsage,mapSketch};
 const tr=view==='model'?await translateProjectSketch(prepared.doc,context,translateDoc):await translateDoc(prepared.doc,context);
 return {tr,fin:await bridge.execute(tr.commands,{fresh:true})};
}
