import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ShieldCheck } from 'lucide-react';
import type { AuthNodeData } from './types';

const PROVIDER_LABELS: Record<string, string> = {
  jwt: 'JWT Bearer',
  oauth2: 'OAuth 2.0',
  'api-key': 'API Key',
  basic: 'Basic Auth',
};

function AuthNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AuthNodeData;

  return (
    <div
      className={`
        group relative min-w-[220px] rounded-xl border
        bg-[#12131a] border-[#1e2030]
        transition-all duration-200 ease-out
        hover:border-[#2a2d45] hover:shadow-lg
        ${selected ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1e2030]">
        <div className="p-1.5 rounded-lg bg-amber-500/15 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#e4e5f1] tracking-tight">
            {nodeData.label}
          </span>
          <span className="text-[10px] text-amber-400/60">
            {PROVIDER_LABELS[nodeData.provider] || nodeData.provider}
          </span>
        </div>
      </div>

      {/* Scopes */}
      {nodeData.scopes && nodeData.scopes.length > 0 && (
        <div className="px-4 py-2.5">
          <p className="text-[10px] text-[#6e7191] uppercase tracking-wider mb-1.5">Scopes</p>
          <div className="flex flex-wrap gap-1">
            {nodeData.scopes.map((scope) => (
              <span
                key={scope}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full
                           bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Handles - auth nodes only have source (they provide auth to endpoints) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-[#2a2d45] !border-[#12131a] !w-2 !h-2"
      />
    </div>
  );
}

export const AuthNode = memo(AuthNodeComponent);
