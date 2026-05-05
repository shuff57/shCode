'use client';

import { useEffect, useRef } from 'react';

interface KeyboardShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: { keys: string; description: string }[] = [
  { keys: 'Ctrl + Enter', description: 'Run code / Commit' },
  { keys: 'Ctrl + Shift + H', description: 'Toggle History panel' },
  { keys: 'Ctrl + Shift + T', description: 'Run tests' },
  { keys: '?', description: 'Show this dialog' },
];

export default function KeyboardShortcutModal({ isOpen, onClose }: KeyboardShortcutModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="shortcut-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      style={{
        background: '#1e1f29',
        color: '#cccccc',
        border: '1px solid #44475a',
        borderRadius: 8,
        padding: 0,
        maxWidth: 420,
        width: '90%',
      }}
    >
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 18,
              padding: '2px 6px',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {shortcuts.map((s) => (
              <tr
                key={s.keys}
                style={{ borderBottom: '1px solid rgba(68,71,90,0.4)' }}
              >
                <td style={{ padding: '10px 12px 10px 0' }}>
                  <kbd
                    style={{
                      background: 'rgba(68,71,90,0.4)',
                      border: '1px solid #44475a',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: '#bd93f9',
                    }}
                  >
                    {s.keys}
                  </kbd>
                </td>
                <td style={{ padding: '10px 0', fontSize: 14 }}>{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .shortcut-dialog::backdrop {
          background: rgba(0,0,0,0.55);
        }
      `}</style>
    </dialog>
  );
}
