import { readSketch, type SketchDrawing } from './solidcraft-sketch';
import { nativeModelDoc, readNativeDocument, readNativeDrawing, type NativeDrawing } from './solidcraft-native-format';
import type { SketchProgram } from './solidcraft-sketch-script';

export const nativeError=(error:unknown,fallback:string):string=>error instanceof Error?error.message:typeof error==='string'?error:error&&typeof error==='object'&&'message' in error?String(error.message):fallback;

type Api={request(method:string,params?:object):Promise<any>;execute(command:string,params?:object):Promise<any>};
type NativeWindow=Window & {solidcraft?:Api;credentialless?:boolean};
type Handle={name:string;x:number;y:number};
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const rendered=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));

// File transfer uses SolidCraft's normal JSON exporter and browser file storage.
// No upstream code, solver state, or serialization routine is patched.
async function storage(win:Window) { return win.navigator.storage.getDirectory(); }
async function readExport(win:Window,name:string,bytes:number) {
  const dir=await storage(win);
  for(let i=0;i<100;i++) {
    try {const f=await (await dir.getFileHandle(name)).getFile();if(f.size===bytes)return await f.text();} catch {}
    await pause(25);
  }
  throw new Error('SolidCraft did not finish saving the native sketch. Your open sketch is kept.');
}
async function removeTransfer(win:Window,name:string) {try{await (await storage(win)).removeEntry(name);}catch{}}
export async function putNativeFile(win:Window,name:string,text:string) {
  readNativeDocument(text);
  const dir=await storage(win);const file=await dir.getFileHandle(name,{create:true});const writer=await file.createWritable();await writer.write(text);await writer.close();
}
export async function exportNativeFile(api:Api,win:Window,name:string) {
  const result=await api.execute('file.export',{path:`/opfs/${name}`,format:'json'});
  try {const text=await readExport(win,name,result.bytes);readNativeDocument(text);return text;}
  finally {await removeTransfer(win,name);}
}

export async function migrateSketch(api:Api,drawing:SketchDrawing) {
  await api.execute('file.new',{});
  await api.execute('sketch.create',{plane:'XY',name:'Organizer outline'});
  for (const e of drawing.entities) {
    if(e.kind==='rectangle') {
      const r=await api.execute('sketch.rectangle.two_point',{p0:[e.x,e.y],p1:[e.x+e.width,e.y+e.depth],connect:false});
      await api.execute('sketch.dimension',{entities:[r.sides.bottom],value:e.width});
      await api.execute('sketch.dimension',{entities:[r.sides.right],value:e.depth});
      if(e.anchored)await api.execute('sketch.constraint.fix',{entities:[r.corners.bottom_left]});
    } else if(e.kind==='circle') {
      const r=await api.execute('sketch.circle.center',{center:[e.x,e.y],radius:e.diameter/2,connect:false});
      const curve=r.created.curves[0];
      await api.execute('sketch.dimension',{entities:[curve],value:e.diameter,kind:'diameter'});
      if(e.anchored) {const si=await api.execute('sketch.inspect',{});const c=si.curves.find((v:{id:string})=>v.id===curve);await api.execute('sketch.constraint.fix',{entities:[c.center]});}
    } else await api.execute('sketch.line',{points:[[e.x,e.y],[e.x2,e.y2]],connect:false,infer:false});
  }
}

export function createNativeSketch(frame:HTMLIFrameElement,options:{editable:()=>boolean;onChange(record:NativeDrawing):void;onInvalid():void;onStatus(text:string):void;onError(text:string):void;onSave():void;onFinish?():void}) {
  let api:Api;let win:NativeWindow;let live=true;let loading=true;let editing=false;let busy=false;let down=false;let timer:ReturnType<typeof setInterval>|null=null;
  let lastRevision='';let saving:Promise<boolean>|null=null;let ui:any=null;let selection:any=null;let handles:Handle[]=[];
  const prefix=`shcode-sketch-${crypto.randomUUID()}`;
  let mask:HTMLDivElement;let cover:HTMLDivElement;let finishMask:HTMLDivElement;let workspaceMask:HTMLDivElement;
  let activeName='Organizer outline';
  let scriptSource:string|undefined;let scriptDesign:string|undefined;
  let generatedSource:string|undefined;let generatedDesign:string|undefined;
  const fail=(e:unknown)=>options.onError(nativeError(e,'The native sketch could not be saved.'));
  const point=(e:PointerEvent)=>{const r=frame.getBoundingClientRect();const scale=(ui?.viewport?.[0]+ui?.viewport?.[2])/r.width;return {x:e.clientX*scale,y:e.clientY*scale};};
  function block(e:Event){e.preventDefault();e.stopImmediatePropagation();}
  function updateMasks() {
    if(!ui||!mask)return;
    const width=ui.viewport[0]+ui.viewport[2],scale=frame.clientWidth/width;
    const tab=handles.find(h=>h.name==='tab:SKETCH');
    if(editing&&!tab)throw new Error('The native Sketch toolbar could not be verified.');
    const globalBottom=tab ? tab.y+17 : ui.viewport[1];
    mask.style.height=`${(editing?globalBottom:ui.viewport[1])*scale}px`;
    const workspace=handles.find(h=>h.name==='ribbon:workspace');
    workspaceMask.style.cssText=`position:fixed;left:0;top:0;width:${(workspace?workspace.x*2+5:95)*scale}px;height:${ui.viewport[1]*scale}px;z-index:96;background:#202126;`;
    const finish=handles.filter(h=>h.name==='button:sketch.finish'||h.name==='button:sketch.cancel');
    if(editing&&finish.length) {
      const left=Math.max(0,Math.min(...finish.map(h=>h.x))-50);
      finishMask.style.cssText=`position:fixed;left:${left*scale}px;right:0;top:${globalBottom*scale}px;height:${Math.max(0,ui.viewport[1]-globalBottom)*scale}px;z-index:90;background:transparent;`;
      finishMask.hidden=false;
    } else finishMask.hidden=true;
    cover.hidden=!loading&&!busy&&editing&&options.editable();
    cover.style.cursor=cover.hidden?'default':'grab';
  }
  function key(e:KeyboardEvent) {
    if(loading||busy||!editing||!options.editable()){block(e);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){block(e);if(e.type==='keydown')options.onSave();return;}
    if((e.ctrlKey||e.metaKey)&&/^[zy]$/i.test(e.key)){block(e);if(e.type==='keydown')void finish(e.key.toLowerCase()==='y'||e.shiftKey?'edit.redo':'edit.undo');return;}
    const text=!!ui?.dialog||!!selection?.dimension_editing;
    if(e.key==='Enter'&&!ui?.tool&&!text){block(e);return;}
    const modifier=e.ctrlKey||e.metaKey;
    const allowed=modifier ? /^[zayxcv]$/i.test(e.key) : e.key==='Escape' ? !!ui?.tool||text : text || /^[lcrd0-9.+*/=()\-]$/i.test(e.key)||['Enter','Backspace','Delete','Shift','Control','Alt','Meta','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key);
    if(e.altKey||!allowed)block(e);
  }
  function pointer(e:PointerEvent) {
    if(e.button===2){block(e);return;}
    if(!cover.hidden){block(e);return;}
    if(e.type==='pointerdown'){
      const p=point(e);const finishButton=handles.find(h=>h.name==='sketch_palette:finish');
      if(finishButton&&Math.abs(p.x-finishButton.x)<75&&Math.abs(p.y-finishButton.y)<18){block(e);void finish();return;}
      down=true;options.onInvalid();
    }
    if(e.type==='pointerup'||e.type==='pointercancel')down=false;
  }
  const menu=(e:Event)=>block(e);
  const blur=()=>{down=false;};
  async function fit() {
    const inspect=await api.request('document.inspect',{});
    if(!inspect.bodies?.length&&!inspect.sketches?.some((sketch:{curves?:number})=>(sketch.curves??0)>0))return;
    await api.request('ui.camera',{fit:true});
    const view=await api.request('ui.inspect',{});
    // Native fit frames geometry only. Leave room for dimension labels as well.
    if(Number.isFinite(view.camera?.distance))await api.request('ui.camera',{distance:view.camera.distance*1.6});
  }
  async function refresh() {
    ui=await api.request('ui.inspect',{});
    handles=await api.request('ui.handles',{});
    selection=await api.request('ui.selection',{});
    const inspect=await api.request('document.inspect',{});
    if(inspect.bodies?.length||inspect.timeline?.some((f:{type:string})=>f.type!=='Sketch'&&f.type!=='sketch'))throw new Error('This lesson accepts 2D sketches only.');
    editing=inspect.active_sketch!==null&&inspect.active_sketch!==undefined;
    updateMasks();return inspect;
  }
  async function capture(builtSource?:string,adoptedSource?:string):Promise<boolean> {
    if(!live||loading||down)return false;
    if(saving)return saving;
    saving=(async()=>{
      const before=await api.request('document.revision',{});
      const inspect=await refresh();
      const sk=inspect.sketches?.[0];
      const snap=sk?await api.execute('sketch.inspect',{sketch:sk.name}):null;
      const text=await exportNativeFile(api,win,`${prefix}-export-${crypto.randomUUID()}.json`);
      const after=await api.request('document.revision',{});
      if(!live||JSON.stringify(before)!==JSON.stringify(after))return false;
      const native=readNativeDocument(text);
      const design=JSON.stringify(native);
      if(builtSource!==undefined){scriptSource=builtSource;scriptDesign=design;generatedSource=undefined;generatedDesign=undefined;}
      else if(design!==scriptDesign)scriptSource=undefined;
      if(adoptedSource!==undefined){generatedSource=adoptedSource;generatedDesign=design;scriptSource=undefined;}
      else if(design!==generatedDesign)generatedSource=undefined;
      const doc=snap?nativeModelDoc(snap):null;
      const solver=snap?.status==='solved'?{status:'solved' as const,dof:snap.dof??null,ownDof:null,worstRes:null,profiles:snap.profiles?.length??null}:null;
      const record:NativeDrawing={version:2,editor:'solidcraft',native,doc,solver,editing,...(scriptSource!==undefined?{scriptSource}:{}),...(generatedSource!==undefined?{generatedSource}:{})};
      lastRevision=JSON.stringify(after);options.onChange(record);
      options.onStatus(editing?'Editing in SolidCraft · native changes captured':doc?scriptSource!==undefined?'Built from script':generatedSource!==undefined?'Finished sketch':'Native drawing saved · Run to rebuild from code':'Native sketch saved · these curves are not supported by automatic checks');
      return true;
    })().catch(e=>{fail(e);return false;}).finally(()=>{saving=null;});
    return saving;
  }
  async function finish(command='sketch.finish') {
    if(busy)return false;
    if(!editing)return capture();
    if(!options.editable()&&command!=='sketch.finish')return false;
    busy=true;down=false;updateMasks();options.onInvalid();
    let ok=false;
    try {await api.execute(command,{});await rendered();await refresh();ok=await capture();}
    catch(e){fail(e);}finally{busy=false;updateMasks();}
    if(ok&&command==='sketch.finish')options.onFinish?.();
    return ok;
  }
  async function poll() {
    if(!live||loading||busy||saving||down)return;
    try {
      await refresh();
      const revision=JSON.stringify(await api.request('document.revision',{}));
      if(revision!==lastRevision)await capture();
    } catch(e){busy=true;updateMasks();options.onInvalid();fail(e);}
  }
  return {
    async start(saved:string,transfer?:{reloadFile:string;editing:boolean;scriptSource?:string;generatedSource?:string}) {
      win=frame.contentWindow as NativeWindow;
      const started=Date.now();
      while(live&&!win.solidcraft) {if(Date.now()-started>150000)throw new Error('SolidCraft did not finish loading.');await pause(100);}
      if(!live)return;
      if(win.credentialless!==true)throw new Error('The native sketch needs isolated iframe storage. Your saved lesson files are kept.');
      api=win.solidcraft!;
      const doc=frame.contentDocument!;
      mask=doc.createElement('div');cover=doc.createElement('div');finishMask=doc.createElement('div');workspaceMask=doc.createElement('div');
      mask.style.cssText='position:fixed;top:0;left:0;right:0;z-index:95;background:#202126;';
      cover.style.cssText='position:fixed;inset:0;z-index:100;background:transparent;touch-action:none;';
      finishMask.style.zIndex='90';
      doc.body.append(mask,cover,finishMask,workspaceMask);
      finishMask.addEventListener('pointerdown',e=>{block(e);const p=point(e);const buttons=handles.filter(h=>h.name==='button:sketch.finish'||h.name==='button:sketch.cancel');const nearest=buttons.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];void finish(nearest?.name==='button:sketch.cancel'?'sketch.cancel':'sketch.finish');});
      // A covered native view remains a flat, read-only camera when paused or finished.
      cover.addEventListener('wheel',e=>{e.preventDefault();if(!ui?.camera)return;void api.request('ui.camera',{distance:Math.max(.1,ui.camera.distance*Math.exp(Math.max(-1,Math.min(1,e.deltaY*.002))))}).catch(fail);},{passive:false});
      for(const type of ['keydown','keyup','keypress'])win.addEventListener(type,key as EventListener,true);
      for(const type of ['pointerdown','pointerup','pointercancel'])win.addEventListener(type,pointer as EventListener,true);
      win.addEventListener('blur',blur);
      win.addEventListener('contextmenu',menu,true);win.addEventListener('drop',menu,true);win.addEventListener('dragover',menu,true);
      await api.request('ui.home',{open:false});
      if(!live)return null;
      await api.request('ui.set',{layout:'compact',showBrowser:false,showTimeline:false,showNavigationBar:false,perspective:false,viewAnglesLockPitch:true,viewAnglesLockYaw:true,viewAnglesLockRoll:true});
      if(!live)return null;
      if(saved&&!transfer&&JSON.parse(saved)?.version===2) {
        const record=readNativeDrawing(saved);
        const name=`${prefix}-restore.json`;await putNativeFile(win,name,JSON.stringify(record.native));
        if(!live){await removeTransfer(win,name);return null;}
        // The unmodified browser app loads OPFS into its VFS at startup.
        await new Promise<void>(resolve=>{frame.addEventListener('load',()=>resolve(),{once:true});frame.src=frame.src;});
        win=frame.contentWindow as NativeWindow;
        while(live&&!win.solidcraft){if(Date.now()-started>150000)throw new Error('SolidCraft did not finish reopening the native sketch.');await pause(100);}
        api=win.solidcraft!;
        // Restart bindings on the new native window, then open the exact file.
        // start() is called again by the React owner after this transfer.
        return {reloadFile:name,editing:record.editing,scriptSource:record.scriptSource,generatedSource:record.generatedSource};
      }
      if(transfer) {
        if(!live)return null;
        await api.execute('file.new',{});
        // File-open is asynchronous in the browser API. Its accepted reply is
        // not proof that OPFS finished loading or that the design was opened.
        await pause(300);
        let inspect:any=null;
        for(let i=0;i<50&&live;i++) {
          if(i%5===0)await api.execute('doc.open',{path:`/opfs/${transfer.reloadFile}`});
          await pause(100);inspect=await api.request('document.inspect',{});
          if(inspect.path===`/opfs/${transfer.reloadFile}`)break;
        }
        if(!live)return null;
        if(inspect?.path!==`/opfs/${transfer.reloadFile}`){await removeTransfer(win,transfer.reloadFile);throw new Error('SolidCraft could not reopen the saved native file. Your saved sketch is kept.');}
        await removeTransfer(win,transfer.reloadFile);
        activeName=inspect.sketches?.[0]?.name??activeName;
        if(transfer.editing&&inspect.sketches?.length)await api.execute('sketch.edit',{sketch:activeName});
      } else if(saved)await migrateSketch(api,readSketch(saved));
      else {await api.execute('file.new',{});await api.execute('sketch.create',{plane:'XY',name:activeName});}
      if(!live)return null;
      await api.request('ui.set',{tab:'SKETCH'});await api.request('ui.view',{view:'top'});await fit();await rendered();loading=false;await refresh();await capture(transfer?.scriptSource,transfer?.generatedSource);
      timer=setInterval(()=>{void poll();},500);return null;
    },
    async build(program:SketchProgram) {
      if(!live||loading||busy)throw new Error('Wait for SolidCraft to finish loading, then Run again.');
      if(program.commands.some(c=>!c.command.startsWith('sketch.')))throw new Error('This lesson accepts sketch operations only.');
      busy=true;down=false;updateMasks();options.onInvalid();
      // The React owner keeps the current native file in History before calling
      // this. On failure the view stays covered until that saved file is reopened.
      try {
        if(saving)await saving;
        await api.execute('file.new',{});
        for(const command of program.commands){if(!live)throw new Error('The sketch run was cancelled.');await api.execute(command.command,command.params);}
        const inspect=await refresh();activeName=inspect.sketches?.[0]?.name??activeName;
        const solved=await api.execute('sketch.inspect',{sketch:activeName});
        if(solved.status!=='solved'||!Array.isArray(solved.failing)||solved.failing.length)throw new Error('SolidCraft could not solve these sketch constraints. Adjust them and Run again.');
        await api.request('ui.view',{view:'top'});await fit();await rendered();
        if(!await capture(program.source))throw new Error('The new sketch could not be captured. Your previous native sketch will be reopened.');
        busy=false;updateMasks();
      } catch(error){scriptSource=undefined;throw error;}
    },
    async edit() {
      if(!live||busy||editing||!options.editable())return;
      busy=true;options.onInvalid();updateMasks();
      try {const inspect=await api.request('document.inspect',{});if(inspect.sketches?.length)await api.execute('sketch.edit',{sketch:inspect.sketches[0].name});else await api.execute('sketch.create',{plane:'XY',name:activeName});await api.request('ui.set',{tab:'SKETCH'});await api.request('ui.view',{view:'top'});await fit();await rendered();await refresh();}
      catch(e){fail(e);}finally{busy=false;updateMasks();}
    },
    finish,
    async fit(){try{await fit();}catch(e){fail(e);}},
    async flush(){for(let i=0;i<3;i++){if(await capture())return true;await pause(100);}return false;},
    async confirmSaved() {
      if(!live||loading||busy||saving||down)return;
      busy=true;updateMasks();
      try {
        const revision=JSON.stringify(await api.request('document.revision',{}));
        // This page's credentialless partition belongs to this native editor.
        // Once the owner has durably saved this exact snapshot, its recovery
        // copy must not be offered as another project's work on the next mount.
        if(live&&revision===lastRevision){await removeTransfer(win,'recovery.sc');await removeTransfer(win,'recovery.json');}
      } finally {busy=false;if(live)updateMasks();}
    },
    applyPolicy(){if(mask)updateMasks();},
    get editing(){return editing;},
    dispose(){live=false;if(timer)clearInterval(timer);for(const type of ['keydown','keyup','keypress'])win?.removeEventListener(type,key as EventListener,true);for(const type of ['pointerdown','pointerup','pointercancel'])win?.removeEventListener(type,pointer as EventListener,true);win?.removeEventListener('blur',blur);win?.removeEventListener('contextmenu',menu,true);win?.removeEventListener('drop',menu,true);win?.removeEventListener('dragover',menu,true);mask?.remove();cover?.remove();finishMask?.remove();workspaceMask?.remove();}
  };
}
