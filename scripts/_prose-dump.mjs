import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../lib/reshape-docs.ts', import.meta.url), 'utf8');
const re = /\{\s*\n\s*title: (['"`])((?:\.|(?!\1)[\s\S])*?)\1,\s*\n\s*body: `((?:\.|[^`])*)`,(\s*\n\s*code: `((?:\.|[^`])*)`,)?/g;
const HARD = ['cuboid','roundedCuboid','roundedCylinder','cylinderElliptic','geodesicSphere','ellipsoid','torus','roundedRectangle','polyhedron','extrudeLinear','extrudeRotate','extrudeRectangular','extrudeHelical','rotateX','rotateY','rotateZ','translateX','translateY','translateZ','scaleX','scaleY','scaleZ','mirrorX','mirrorY','mirrorZ','getParameterDefinitions','module.exports','@jscad/modeling','jscad.','primitives.','transforms.','booleans.','extrusions.','measurements.','require('];
const SOFT = ['sphere','cylinder','rectangle','square','circle','ellipse','polygon','star','arc','line','rotate','translate','scale','align','center','mirror','union','subtract','intersect'];
function bad(t){
  for(const n of HARD) if(t.includes(n)) return true;
  for(const n of SOFT){let a=t.indexOf(n+'(');while(a!==-1){const b=a===0?' ':t[a-1];if(!/[A-Za-z0-9_]/.test(b))return true;a=t.indexOf(n+'(',a+1);}}
  return false;
}
const want = process.argv[2];
let m;
while((m=re.exec(src))){
  const before = src.slice(0,m.index);
  const sl = before.lastIndexOf("slug: '");
  const section = sl===-1?'?':before.slice(sl+7, before.indexOf("'",sl+7));
  if (want && section!==want) continue;
  const body=m[3];
  const sents = body.split('\n').flatMap(p=>p.split(/(?<=[.:?!])\s+/)).filter(bad);
  if(!sents.length) continue;
  console.log(`\n=== ${section} :: ${m[2]}`);
  for(const s of sents) console.log('  | '+s.trim());
  if (process.env.WITHCODE) console.log('  CODE:\n'+(m[5]||'').split('\n').map(l=>'    '+l).join('\n'));
}
