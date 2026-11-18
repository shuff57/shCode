// Show the shared, unconsumed profile in Model without making a solid.
// All solid features still use the guarded translator; this adds sketch commands only.
import { translateSketchOnly } from './sketch-only.mjs';
export async function translateProjectSketch(doc,context,translateSolid){
  const sketch=doc.features[0];
  if(doc.features.length===1)return translateSketchOnly(doc,context);
  const result=await translateSolid(doc,context);
  if(sketch?.kind!=='sketch')return result;
  const name=`sk_${sketch.id}_0`;
  if(result.commands.some(c=>c.command==='sketch.create'&&c.params.name===name))return result;
  const flat=await translateSketchOnly({...doc,features:[sketch]},context);
  if(flat.features[0].status==='refused'){
    result.features=result.features.map(f=>f.id===sketch.id?flat.features[0]:f);
  }else result.commands.push(...flat.commands);
  return result;
}
