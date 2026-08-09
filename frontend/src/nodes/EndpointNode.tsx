import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Globe, ArrowRight } from 'lucide-react';
import type { EndpointNodeData } from './types';

const METHOD_STYLES: Record<string, { bg: string; text: string; glow: string }> = {
  GET: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  },
  POST: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.15)]',
  },
  PUT: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  },
  PATCH: {
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    glow: 'shadow-[0_0_12px_rgba(249,115,22,0.15)]',
  },
  DELETE: {
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]',
  },
};

function EndpointNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as EndpointNodeData;
  const method = nodeData.method || 'GET';
  const style = METHOD_STYLES[method] || METHOD_STYLES.GET;

  return (
    <div
      className={`
        group relative min-w-[260px] rounded-xl border
        bg-[#12131a] border-[#1e2030]
        transition-all duration-200 ease-out
        hover:border-[#2a2d45] hover:shadow-lg
        ${selected ? 'border-[#6c63ff] shadow-[0_0_20px_rgba(108,99,255,0.15)]' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e2030]">
        <div className={`p-1.5 rounded-lg ${style.bg} ${style.glow}`}>
          <Globe className={`w-3.5 h-3.5 ${style.text}`} />
        </div>
        <span className="text-sm font-semibold text-[#e4e5f1] tracking-tight">
          {nodeData.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2.5">
        {/* Method + Path */}
        <div className="flex items-center gap-2">
          <span
            className={`
              inline-flex px-2 py-0.5 rounded text-[10px] font-bold
              uppercase tracking-wider ${style.bg} ${style.text}
            `}
          >
            {method}
          </span>
          <code className="text-xs text-[#6e7191] font-mono truncate">
            {nodeData.path}
          </code>
        </div>

        {/* Description */}
        {nodeData.description && (
          <p className="text-[11px] text-[#6e7191] leading-relaxed line-clamp-2">
            {nodeData.description}
          </p>
        )}

        {/* Status Codes */}
        {nodeData.statusCodes && nodeData.statusCodes.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1">
            <ArrowRight className="w-3 h-3 text-[#2a2d45]" />
            <div className="flex gap-1">
              {nodeData.statusCodes.map((code) => (
                <span
                  key={code}
                  className={`
                    text-[10px] font-mono px-1.5 py-0.5 rounded
                    ${code < 300 ? 'bg-emerald-500/10 text-emerald-400' :
                      code < 400 ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'}
                  `}
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}
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

export const EndpointNode = memo(EndpointNodeComponent);
