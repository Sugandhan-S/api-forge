import { useCallback } from 'react';
import { Globe, Database, ShieldCheck, Plus } from 'lucide-react';
import { useCanvasStore } from '../stores/canvasStore';
import type { EndpointNodeData, DatabaseNodeData, AuthNodeData, ForgeNodeData } from '../nodes/types';
import type { Node } from '@xyflow/react';

let nodeIdCounter = 100;

const SIDEBAR_ITEMS = [
  {
    type: 'endpoint',
    label: 'Endpoint',
    description: 'HTTP endpoint',
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    hoverBorder: 'hover:border-emerald-500/30',
  },
  {
    type: 'database',
    label: 'Database',
    description: 'Table / Model',
    icon: Database,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    hoverBorder: 'hover:border-cyan-500/30',
  },
  {
    type: 'auth',
    label: 'Auth',
    description: 'Security scheme',
    icon: ShieldCheck,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    hoverBorder: 'hover:border-amber-500/30',
  },
] as const;

function getDefaultNodeData(type: string): EndpointNodeData | DatabaseNodeData | AuthNodeData {
  switch (type) {
    case 'endpoint':
      return {
        label: 'New Endpoint',
        method: 'GET',
        path: '/api/v1/resource',
        description: '',
        statusCodes: [200],
      };
    case 'database':
      return {
        label: 'New Table',
        tableName: 'table_name',
        columns: [
          { name: 'id', type: 'uuid', primaryKey: true },
        ],
      };
    case 'auth':
      return {
        label: 'Auth Scheme',
        provider: 'jwt',
        scopes: [],
      };
    default:
      return {
        label: 'New Endpoint',
        method: 'GET',
        path: '/api/v1/resource',
        statusCodes: [200],
      };
  }
}

export function Toolbar() {
  const addNode = useCanvasStore((s) => s.addNode);

  const handleAddNode = useCallback(
    (type: string) => {
      const id = `${type}-${++nodeIdCounter}`;
      const data = getDefaultNodeData(type);

      // Offset each new node randomly so they don't stack
      const node: Node<ForgeNodeData> = {
        id,
        type,
        position: {
          x: 250 + Math.random() * 300,
          y: 150 + Math.random() * 300,
        },
        data,
      };

      addNode(node);
    },
    [addNode]
  );

  return (
    <div className="absolute top-4 left-4 z-50 animate-fade-in">
      <div className="flex flex-col gap-2 p-2 rounded-xl bg-[#12131a]/90 backdrop-blur-xl
                      border border-[#1e2030] shadow-2xl">
        <div className="px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-widest text-[#6e7191] font-semibold">
            Add Node
          </p>
        </div>

        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.type}
            onClick={() => handleAddNode(item.type)}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg
              border border-transparent ${item.hoverBorder}
              hover:bg-[#1a1b25] transition-all duration-150
              group cursor-pointer
            `}
          >
            <div className={`p-1.5 rounded-lg ${item.bg}`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="text-left">
              <p className="text-xs font-medium text-[#e4e5f1] group-hover:text-white">
                {item.label}
              </p>
              <p className="text-[10px] text-[#6e7191]">{item.description}</p>
            </div>
            <Plus className="w-3.5 h-3.5 text-[#2a2d45] group-hover:text-[#6e7191]
                            ml-auto transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
}
