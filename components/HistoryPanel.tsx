'use client';

import { useState, useMemo } from 'react';
import { useLessonStore } from '../lib/store';
import type { Commit, Version, FileNode } from '../lib/types';
import { History, Clock, X, RotateCcw } from 'lucide-react';
import DiffViewer from './DiffViewer';

function findFileByPath(nodes: FileNode[], target: string): FileNode | null {
  for (const n of nodes) {
    if (n.type === 'file' && n.path === target) return n;
    if (n.type === 'folder' && n.children) {
      const hit = findFileByPath(n.children, target);
      if (hit) return hit;
    }
  }
  return null;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [tab, setTab] = useState<'file' | 'project'>('file');
  const [selectedCommit, setSelectedCommit] = useState<Commit | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  const currentFile = useLessonStore((s) => s.currentFile);
  const fileContents = useLessonStore((s) => s.fileContents);
  const commits = useLessonStore((s) => s.commits);
  const lesson = useLessonStore((s) => s.lesson);
  const restoreCommit = useLessonStore((s) => s.restoreCommit);
  const restoreVersion = useLessonStore((s) => s.restoreVersion);
  const pathToId = useLessonStore((s) => s.pathToId);

  const currentContent = currentFile ? fileContents[currentFile] || '' : '';
  const currentFileId = currentFile ? pathToId(currentFile) : '';

  // File history: versions of the current file from commits
  const fileVersions = useMemo(() => {
    if (!currentFileId) return [];
    const versions: Version[] = [];
    for (let i = commits.length - 1; i >= 0; i--) {
      const commit = commits[i];
      if (commit.fileContentsSnapshot[currentFile || ''] !== undefined) {
        versions.push({
          timestamp: commit.timestamp,
          content: commit.fileContentsSnapshot[currentFile || ''],
        });
      }
    }
    return versions;
  }, [commits, currentFile, currentFileId]);

  // For `example` lessons, expose the starter code as a restore-to-default entry.
  const defaultVersion = useMemo<Version | null>(() => {
    if (!lesson || lesson.type !== 'example' || !currentFile) return null;
    const node = findFileByPath(lesson.files, currentFile);
    if (!node || node.content === undefined) return null;
    return { timestamp: 0, content: node.content };
  }, [lesson, currentFile]);

  if (!isOpen) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const timeAgo = (ts: number) => {
    const secs = Math.floor((Date.now() - ts) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  };

  return (
    <div className="history-panel-overlay" onClick={onClose}>
      <div className="history-panel" onClick={(e) => e.stopPropagation()}>
        <div className="history-panel-header">
          <div className="history-tabs">
            <button
              className={tab === 'file' ? 'active' : ''}
              onClick={() => { setTab('file'); setSelectedCommit(null); setSelectedVersion(null); }}
            >
              File History
            </button>
            <button
              className={tab === 'project' ? 'active' : ''}
              onClick={() => { setTab('project'); setSelectedCommit(null); setSelectedVersion(null); }}
            >
              Project History
            </button>
          </div>
          <button className="history-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="history-body">
          <div className="history-list">
            {tab === 'file' ? (
              fileVersions.length === 0 && !defaultVersion ? (
                <p className="history-empty">No history for this file yet.</p>
              ) : (
                <>
                  {fileVersions.map((v, i) => (
                    <button
                      key={v.timestamp}
                      className={`history-item ${selectedVersion?.timestamp === v.timestamp ? 'active' : ''}`}
                      onClick={() => { setSelectedVersion(v); setSelectedCommit(null); }}
                    >
                      <div className="history-item-title">
                        {i === 0 ? 'Latest commit' : `Version ${fileVersions.length - i}`}
                      </div>
                      <div className="history-item-time">
                        {timeAgo(v.timestamp)} - {formatTime(v.timestamp)}
                      </div>
                    </button>
                  ))}
                  {defaultVersion && (
                    <button
                      className={`history-item ${selectedVersion?.timestamp === 0 ? 'active' : ''}`}
                      onClick={() => { setSelectedVersion(defaultVersion); setSelectedCommit(null); }}
                    >
                      <div className="history-item-title">Original (starter)</div>
                      <div className="history-item-time">Restore to default</div>
                    </button>
                  )}
                </>
              )
            ) : (
              [...commits].reverse().map((c) => (
                <button
                  key={c.id}
                  className={`history-item ${selectedCommit?.id === c.id ? 'active' : ''}`}
                  onClick={() => { setSelectedCommit(c); setSelectedVersion(null); }}
                >
                  <div className="history-item-title">{c.message}</div>
                  <div className="history-item-time">
                    {timeAgo(c.timestamp)} - {c.changedFileIds.length} file{c.changedFileIds.length !== 1 ? 's' : ''}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="history-detail">
            {tab === 'file' && selectedVersion ? (
              <>
                <div className="history-detail-header">
                  <span>Comparing selected version with current</span>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => {
                      if (currentFileId) {
                        restoreVersion(currentFileId, selectedVersion);
                        onClose();
                      }
                    }}
                    disabled={selectedVersion.content === currentContent}
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                </div>
                <DiffViewer
                  original={selectedVersion.content}
                  modified={currentContent}
                  language={currentFile?.split('.').pop() || 'text'}
                />
              </>
            ) : tab === 'project' && selectedCommit ? (
              <>
                <div className="history-detail-header">
                  <div>
                    <strong>{selectedCommit.message}</strong>
                    <div className="history-item-time">{formatTime(selectedCommit.timestamp)}</div>
                  </div>
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => {
                      restoreCommit(selectedCommit.id);
                      onClose();
                    }}
                  >
                    <RotateCcw size={14} /> Restore
                  </button>
                </div>
                <div className="history-changed-files">
                  <h4>Changed files:</h4>
                  <ul>
                    {selectedCommit.changedFileIds.map((id) => (
                      <li key={id}>{id}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="history-empty">
                <History size={40} />
                <p>Select a {tab === 'file' ? 'version' : 'commit'} to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
