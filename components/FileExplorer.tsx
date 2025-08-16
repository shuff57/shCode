'use client';
import { FileNode } from '../lib/lessons';
import { useLessonStore } from '../lib/store';

function FileItem({ node }: { node: FileNode }) {
  const selectFile = useLessonStore((s) => s.selectFile);
  const currentFile = useLessonStore((s) => s.currentFile);
  if (node.type === 'folder') {
    return (
      <li>
        <div>{node.name}</div>
        <ul>
          {node.children?.map((child) => (
            <FileItem key={child.path} node={child} />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li
      onClick={() => selectFile(node.path)}
      style={currentFile === node.path ? { color: 'var(--brand)', fontWeight: 'bold' } : {}}
    >
      {node.name}
    </li>
  );
}

export default function FileExplorer({ tree }: { tree: FileNode[] }) {
  return (
    <>
      <ul id="fileList">{tree.map((node) => <FileItem key={node.path} node={node} />)}</ul>
      <p className="drop-hint">Drag files here</p>
    </>
  );
}
