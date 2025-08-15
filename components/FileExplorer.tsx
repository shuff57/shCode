'use client';
import { FileNode } from '../lib/lessons';
import { useLessonStore } from '../lib/store';

function FileItem({ node }: { node: FileNode }) {
  const selectFile = useLessonStore((s) => s.selectFile);
  const currentFile = useLessonStore((s) => s.currentFile);
  if (node.type === 'folder') {
    return (
      <div className="ml-2">
        <div className="font-semibold">{node.name}</div>
        <div className="ml-2">
          {node.children?.map((child) => (
            <FileItem key={child.path} node={child} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      className={`cursor-pointer ml-2 ${currentFile === node.path ? 'text-blue-500 font-bold' : ''}`}
      onClick={() => selectFile(node.path)}
    >
      {node.name}
    </div>
  );
}

export default function FileExplorer({ tree }: { tree: FileNode[] }) {
  return (
    <div>
      {tree.map((node) => (
        <FileItem key={node.path} node={node} />
      ))}
    </div>
  );
}
