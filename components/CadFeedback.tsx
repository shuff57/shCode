'use client';
import { useEffect, useRef, useState } from 'react';
import type { ModelDoc } from '../lib/model-types';
import type { NativeDrawing } from '../lib/solidcraft-native-format';
import type { SketchDrawing } from '../lib/solidcraft-sketch';
import { makeCadEvidence, type CadSolverReport } from '../lib/cad-feedback';
import { streamGrade } from '../lib/written-grader-store';
interface Props { lessonId: string; drawing: SketchDrawing|NativeDrawing; snapshot: {doc:ModelDoc;solver:CadSolverReport;key:string} | null; drawingKey:string }
export default function CadFeedback(props:Props) {
  const [explanation, explain] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [result, setResult] = useState<{summary:string;criteria:{id:string;feedback:string}[];hints:string[]}|null>(null);
  const key = JSON.stringify([props.drawingKey,props.snapshot,explanation]);
  const latest = useRef({key,live:true}); latest.current.key=key;
  useEffect(()=>{setResult(null);setNote('');},[key]);
  useEffect(()=>{latest.current.live=true;return()=>{latest.current.live=false;};},[]);
  const current = props.snapshot?.key === props.drawingKey && props.snapshot?.doc.features.some(f=>f.kind==='sketch'&&(f.geoms?.length ?? 0)>0);
  async function review() {
    if (!current || !props.snapshot || busy) return;
    const requested=key;
    setBusy(true);setResult(null);setNote('Reading your current sketch…');
    try {
      const evidence=await makeCadEvidence(props.drawing,props.snapshot.doc,props.snapshot.solver,explanation);
      if (!latest.current.live || latest.current.key!==requested) return;
      const {data,status}=await streamGrade({lessonId:props.lessonId,lessonTitle:'',prompt:'',rubric:[],response:'Review the attached current CAD sketch evidence.',cadEvidence:evidence},()=>{});
      if (!latest.current.live) return;
      if (latest.current.key!==requested) {setNote('Your sketch or explanation changed. Ask for feedback on the current version.');return;}
      if (!data?.ok || status!==200) {setNote(typeof data?.error==='string' ? data.error : 'AI feedback is unavailable. Your geometry checks and saved sketch still work.');return;}
      if (data.feedbackOnly!==true || data.artifactId!==evidence.artifactId) {setNote('The feedback did not match this sketch version. Ask again.');return;}
      setResult({summary:String(data.summary??''),criteria:(data.criteria??[]).map((c:{id:unknown;feedback:unknown})=>({id:String(c.id),feedback:String(c.feedback??'')})),hints:Array.isArray(data.hints)?data.hints.map(String):[]});
      setNote('Feedback for this sketch version.');
    } catch (e) {if(latest.current.live && latest.current.key===requested)setNote(e instanceof Error?e.message:'Feedback could not be loaded.');}
    finally {if(latest.current.live)setBusy(false);}
  }
  return <section aria-label="AI sketch feedback">
    <h3>AI sketch feedback</h3>
    <p>The AI reads the sketch geometry and solver report. Check measures the lesson requirements separately.</p>
    <label style={{display:'block'}}>Your design choices (optional)<textarea style={{width:'100%',resize:'vertical',background:'var(--card)',color:'var(--text)',border:'1px solid var(--border)',padding:6,borderRadius:4}} aria-label="Your design choices" maxLength={1000} rows={3} value={explanation} onChange={e=>explain(e.target.value)} /></label>
    <button disabled={!current || busy} onClick={review}>{busy?'Reading sketch…':'Ask for sketch feedback'}</button>
    {!current && <p>Draw a sketch and let the view update before asking.</p>}
    <p role="status">{note}</p>
    {result && <div><p>{result.summary}</p>{result.criteria.map(c=><p key={c.id}>{c.feedback}</p>)}{result.hints.map((h,i)=><p key={i}>{h}</p>)}</div>}
  </section>;
}
