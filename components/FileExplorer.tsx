'use client';
import { useState, DragEvent } from 'react';
import { FileNode } from '../lib/lessons';
import { useLessonStore } from '../lib/store';

function FileItem({
  node,
  move,
  external,
}: {
  node: FileNode;
  move: (src: string, dest: string | null) => void;
  external: (e: DragEvent, dest: string) => void;
}) {
  const selectFile = useLessonStore((s) => s.selectFile);
  const currentFile = useLessonStore((s) => s.currentFile);
  if (node.type === 'folder') {
    return (
      <li
        onDrop={(e) => {
          e.stopPropagation();
          const src = e.dataTransfer.getData('text/plain');
          if (src) {
            move(src, node.path);
          } else {
            external(e, node.path);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <div>{node.name}</div>
        <ul>
          {node.children?.map((child) => (
            <FileItem
              key={child.path}
              node={child}
              move={move}
              external={external}
            />
          ))}
        </ul>
      </li>
    );
  }
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', node.path)}
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
  const moveFile = useLessonStore((s) => s.moveFile);
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

  function removeNode(list: FileNode[], path: string): [FileNode | null, FileNode[]] {
    let removed: FileNode | null = null;
    const filtered = list
      .map((n) => {
        if (n.path === path) {
          removed = n;
          return null;
        }
        if (n.type === 'folder' && n.children) {
          const [childRemoved, children] = removeNode(n.children, path);
          if (childRemoved) {
            removed = childRemoved;
            return { ...n, children };
          }
        }
        return n;
      })
      .filter(Boolean) as FileNode[];
    return [removed, filtered];
  }

  function insertNode(
    list: FileNode[],
    folder: string | null,
    node: FileNode
  ): FileNode[] {
    if (!folder) return [...list, node];
    return list.map((n) => {
      if (n.path === folder && n.type === 'folder') {
        return { ...n, children: [...(n.children || []), node] };
      }
      if (n.type === 'folder' && n.children) {
        return { ...n, children: insertNode(n.children, folder, node) };
      }
      return n;
    });
  }

  const moveNode = (src: string, dest: string | null) => {
    setNodes((prev) => {
      const [removed, without] = removeNode(prev, src);
      if (!removed) return prev;
      const name = removed.name;
      const newPath = dest ? `${dest}/${name}` : name;
      const updated = { ...removed, path: newPath };
      moveFile(src, newPath);
      return insertNode(without, dest, updated);
    });
  };

  const handleExternalDrop = async (
    e: DragEvent,
    dest: string | null
  ) => {
    const items = Array.from(e.dataTransfer.items || []);
    const newNodes: FileNode[] = [];
    for (const item of items) {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) {
        const node = await traverse(entry, dest ? dest + '/' : '');
        if (node) newNodes.push(node);
      }
    }
    if (newNodes.length) {
      setNodes((prev) => {
        let next = prev;
        for (const n of newNodes) {
          next = insertNode(next, dest, n);
        }
        return next;
      });
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    const internal = e.dataTransfer.getData('text/plain');
    if (internal) {
      moveNode(internal, null);
      return;
    }
    await handleExternalDrop(e, null);
  };

  return (
    <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <ul id="fileList">
        {nodes.map((node) => (
          <FileItem
            key={node.path}
            node={node}
            move={moveNode}
            external={handleExternalDrop}
          />
        ))}
      </ul>
      <p className="drop-hint">Drag files or folders here</p>
    </div>
  );
}
