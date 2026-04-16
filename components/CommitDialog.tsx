'use client';

import { useState, useRef, useEffect } from 'react';

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (message: string) => void;
  dirtyCount: number;
}

export default function CommitDialog({ isOpen, onClose, onCommit, dirtyCount }: CommitDialogProps) {
  const [message, setMessage] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
      textareaRef.current?.focus();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleCommit = () => {
    if (message.trim()) {
      onCommit(message.trim());
      setMessage('');
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="commit-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="commit-dialog-content">
        <h3>Commit changes</h3>
        <p className="commit-dialog-desc">
          Create a snapshot of your project ({dirtyCount} file{dirtyCount !== 1 ? 's' : ''} changed).
        </p>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g., Add new feature"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleCommit();
            }
          }}
        />
        <div className="commit-dialog-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleCommit} disabled={!message.trim()}>
            Commit
          </button>
        </div>
      </div>
    </dialog>
  );
}
