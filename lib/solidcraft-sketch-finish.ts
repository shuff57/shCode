import type { NativeDrawing } from './solidcraft-native-format';

/** Finish the current coded profile without ever regenerating its source. */
export async function finishCodedSketch(options:{
  source():string;
  variable:string;
  capture():Promise<NativeDrawing|null>;
  build():Promise<void>;
  finish():Promise<boolean>;
  /** False when the native drawing was built for another sketch of the same script (the Sketch view's variable changed since). */
  fresh?():boolean;
}):Promise<{source:string;variable:string}> {
  const source=options.source();
  const unchanged=()=>{
    if(options.source()!==source)throw new Error('Your code changed while finishing. Finish sketch again to use the current code.');
  };
  let drawing=await options.capture();unchanged();
  if(drawing?.scriptSource===undefined&&drawing?.generatedSource===undefined&&drawing?.native.features[0]?.sketch?.curves.length){
    throw new Error('Finish sketch uses your code. Your mouse edits are saved separately; press Run to keep them in History and rebuild from the script before finishing.');
  }
  // Older generated-source records are preserved in History by build, then
  // rebuilt from their saved script just like an edited coded sketch.
  if(!drawing||drawing.scriptSource!==source||drawing.solver?.status!=='solved'||options.fresh?.()===false){
    await options.build();unchanged();
  }
  if(!await options.finish())throw new Error('The sketch could not be finished. Keep it open and try again.');
  drawing=await options.capture();unchanged();
  if(!drawing||drawing.editing||drawing.scriptSource!==source||drawing.solver?.status!=='solved'||options.fresh?.()===false){
    throw new Error('Run the current sketch code successfully before finishing. Your script and native drawing are kept.');
  }
  return {source,variable:options.variable};
}
