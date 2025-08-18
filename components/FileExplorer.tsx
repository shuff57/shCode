'use client';
import { useState } from 'react';
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
      style={
        currentFile === node.path
          ? { color: 'var(--brand)', fontWeight: 'bold' }
          : {}
      }
    >
      {node.name}
    </li>
  );
}

export default function FileExplorer({ tree }: { tree: FileNode[] }) {
  const updateFile = useLessonStore((s) => s.updateFile);
  const [nodes, setNodes] = useState<FileNode[]>(tree);

  async function traverse(entry: any, base = ''): Promise<FileNode | null> {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          const reader = new FileReader();
          reader.onload = () => {
            const path = base + entry.name;
            const content = reader.result as string;
            updateFile(path, content);
            resolve({
              type: 'file',
              name: entry.name,
              path,
              content,
            });
          };
          reader.readAsText(file);
        });
      });
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((res) =>
        reader.readEntries((ents: any[]) => res(ents))
      );
      const children: FileNode[] = [];
      for (const ent of entries) {
        const child = await traverse(ent, base + entry.name + '/');
        if (child) children.push(child);
      }
      return {
        type: 'folder',
        name: entry.name,
        path: base + entry.name,
        children,
      };
    }
    return null;
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items || []);
    const newNodes: FileNode[] = [];
    for (const item of items) {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) {
        const node = await traverse(entry);
        if (node) newNodes.push(node);
      }
    }
    if (newNodes.length) {
      setNodes((prev) => [...prev, ...newNodes]);
    }
  };

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <ul id="fileList">
        {nodes.map((node) => (
          <FileItem key={node.path} node={node} />
        ))}
      </ul>
      <p className="drop-hint">Drag files or folders here</p>
    </div>
  );
}
