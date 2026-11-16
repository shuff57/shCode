'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import SolidCraftStudio from './SolidCraftStudio';
import { cadPolicy } from '../lib/solidcraft-policy';
import { NO_TEACHER_MODES, type TeacherModes } from '../lib/lesson-mode';
import styles from './solidcraft-sandbox.module.css';

export default function SolidCraftSandbox() {
  const [code, setCode] = useState('// Change a size, then Run.\nconst body = box(40, 30, 10)\nhole(body, { across: 6 })\n');
  const [modes, setModes] = useState<TeacherModes | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/my-lesson-modes', { signal: abort.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setModes).catch(e => { if (e.name !== 'AbortError') setModes(NO_TEACHER_MODES); });
    return () => abort.abort();
  }, []);
  const policy = cadPolicy('sandbox-reshape', modes);
  function download() { const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' })); const a = document.createElement('a'); a.href = url; a.download = 'script.js'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <main className={styles.page}>
    <div className={styles.toolbar}><h1>reSHape <span className={styles.badge}>UI preview</span></h1><div className={styles.actions}><Link href="/sandbox/">Back to sandbox</Link><button onClick={download}>Download script</button></div></div>
    <p className={styles.notice}>Preview work is not saved to your projects. Download your script to keep it. The pilot lesson saves through shCode.</p>
    <SolidCraftStudio value={code} onChange={setCode} toolsAllowed={policy.toolsAllowed} policyLoaded={modes !== null} policyReason={policy.reason} lessonId="cad-preview" />
  </main>;
}
