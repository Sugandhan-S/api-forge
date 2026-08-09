import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Database, KeyRound } from 'lucide-react';
import type { DatabaseNodeData } from './types';

function DatabaseNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DatabaseNodeData;

  return (
    <div
      className={`
        group relative min-w-[260px] rounded-xl border
        bg-[#12131a] border-[#1e2030]
        transition-all duration-200 ease-out
        hover:border-[#2a2d45] hover:shadow-lg
        ${selected ? 'border-[#06b6d4] shadow-[0_0_20px_rgba(6,182,212,0.15)]' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e2030]">
        <div className="p-1.5 rounded-lg bg-cyan-500/15 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#e4e5f1] tracking-tight">
            {nodeData.label}
          </span>
          <span className="text-[10px] text-cyan-400/60 font-mono">
            {nodeData.tableName}
          </span>
        </div>
      </div>

      {/* Columns */}
      <div className="px-4 py-2.5">
        <div className="space-y-1">
          {nodeData.columns.map((col, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1 px-2 rounded-md
                         hover:bg-[#1a1b25] transition-colors group/row"
            >
              <div className="flex items-center gap-2">
                {col.primaryKey && (
                  <KeyRound className="w-3 h-3 text-amber-400" />
                )}
                <span className={`text-xs font-medium ${
                  col.primaryKey ? 'text-amber-300' : 'text-[#e4e5f1]'
                }`}>
                  {col.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#6e7191]">
                {col.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-[#1e2030]">
        <span className="text-[10px] text-[#6e7191]">
          {nodeData.columns.length} column{nodeData.columns.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-[#2a2d45] !border-[#12131a] !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[#2a2d45] !border-[#12131a] !w-2 !h-2"
      />
    </div>
  );
}

export const DatabaseNode = memo(DatabaseNodeComponent);
