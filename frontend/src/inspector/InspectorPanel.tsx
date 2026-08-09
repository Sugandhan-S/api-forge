import { useCallback, useMemo } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../stores/canvasStore';
import { EndpointInspector } from './EndpointInspector';
import { DatabaseInspector } from './DatabaseInspector';
import { AuthInspector } from './AuthInspector';
import type { EndpointNodeData, DatabaseNodeData, AuthNodeData, ForgeNodeData } from '../nodes/types';

export function InspectorPanel() {
  const nodes = useCanvasStore((s) => s.nodes);
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeId);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const setSelectedNode = useCanvasStore((s) => s.setSelectedNode);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  const handleClose = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleDelete = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  }, [selectedNodeId, deleteNode]);

  const handleChange = useCallback(
    (data: Partial<ForgeNodeData>) => {
      if (selectedNodeId) {
        updateNodeData(selectedNodeId, data);
      }
    },
    [selectedNodeId, updateNodeData]
  );

  if (!selectedNode) return null;

  const nodeType = selectedNode.type;

  return (
    <div
      className="absolute top-0 right-0 z-50 h-full w-[360px] animate-slide-in
                 bg-[#12131a]/95 backdrop-blur-xl border-l border-[#1e2030]
                 shadow-[-8px_0_32px_rgba(0,0,0,0.4)]
                 flex flex-col"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2030] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6c63ff] animate-pulse-glow" />
          <span className="text-xs font-semibold text-[#e4e5f1] uppercase tracking-wider">
            Properties
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 rounded-lg text-[#6e7191] hover:text-red-400
                       hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete node"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#6e7191] hover:text-[#e4e5f1]
                       hover:bg-[#1a1b25] transition-colors cursor-pointer"
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Body — Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {nodeType === 'endpoint' && (
          <EndpointInspector
            data={selectedNode.data as unknown as EndpointNodeData}
            onChange={handleChange}
          />
        )}
        {nodeType === 'database' && (
          <DatabaseInspector
            data={selectedNode.data as unknown as DatabaseNodeData}
            onChange={handleChange}
          />
        )}
        {nodeType === 'auth' && (
          <AuthInspector
            data={selectedNode.data as unknown as AuthNodeData}
            onChange={handleChange}
          />
        )}
      </div>

      {/* Panel Footer */}
      <div className="px-4 py-3 border-t border-[#1e2030] shrink-0">
        <div className="flex items-center justify-between text-[10px] text-[#6e7191]">
          <span>ID: <code className="text-[#2a2d45] font-mono">{selectedNode.id}</code></span>
          <span>Type: <code className="text-[#6c63ff] font-mono">{nodeType}</code></span>
        </div>
      </div>
    </div>
  );
}
