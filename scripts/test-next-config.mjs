// Use Next's own config loader so development routing cannot accidentally
// disable the production static export required by Cloudflare Pages.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {PHASE_DEVELOPMENT_SERVER,PHASE_PRODUCTION_BUILD,PHASE_PRODUCTION_SERVER}=require('next/constants');
const loadConfig=require('next/dist/server/config').default;
for(const phase of [PHASE_DEVELOPMENT_SERVER,PHASE_PRODUCTION_BUILD,PHASE_PRODUCTION_SERVER]){
 const config=await loadConfig(phase,process.cwd());
 assert.equal(config.output,phase===PHASE_DEVELOPMENT_SERVER?undefined:'export');
 assert.equal(config.trailingSlash,true);
 assert.equal(config.images.unoptimized,true);
 assert.equal(typeof config.webpack,'function','singleton resolution stays configured');
}
console.log('Next config: development handles dynamic routes; production builds/servers retain static-export settings.');
