import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react';
import type { ForgeNodeData } from '../nodes/types';

/* ─── Initial Canvas State ─── */
const initialNodes: Node<ForgeNodeData>[] = [
  {
    id: 'endpoint-1',
    type: 'endpoint',
    position: { x: 300, y: 150 },
    data: {
      label: 'Get Users',
      method: 'GET',
      path: '/api/v1/users',
      description: 'Retrieve a paginated list of all users',
      statusCodes: [200, 401, 500],
    },
  },
  {
    id: 'endpoint-2',
    type: 'endpoint',
    position: { x: 300, y: 400 },
    data: {
      label: 'Create User',
      method: 'POST',
      path: '/api/v1/users',
      description: 'Create a new user account',
      statusCodes: [201, 400, 409],
    },
  },
  {
    id: 'database-1',
    type: 'database',
    position: { x: 750, y: 250 },
    data: {
      label: 'Users Table',
      tableName: 'users',
      columns: [
        { name: 'id', type: 'uuid', primaryKey: true },
        { name: 'email', type: 'varchar(255)' },
        { name: 'name', type: 'varchar(100)' },
        { name: 'created_at', type: 'timestamp' },
      ],
    },
  },
  {
    id: 'auth-1',
    type: 'auth',
    position: { x: 50, y: 280 },
    data: {
      label: 'JWT Auth',
      provider: 'jwt',
      scopes: ['read:users', 'write:users'],
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-ep1-db1',
    source: 'endpoint-1',
    target: 'database-1',
    animated: true,
    style: { stroke: '#6c63ff' },
  },
  {
    id: 'e-ep2-db1',
    source: 'endpoint-2',
    target: 'database-1',
    animated: true,
    style: { stroke: '#6c63ff' },
  },
  {
    id: 'e-auth1-ep1',
    source: 'auth-1',
    target: 'endpoint-1',
    style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
  },
  {
    id: 'e-auth1-ep2',
    source: 'auth-1',
    target: 'endpoint-2',
    style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
  },
];

/* ─── Store Interface ─── */
interface CanvasStore {
  nodes: Node<ForgeNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  projectTitle: string;
  projectId: string;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNode: (id: string | null) => void;
  addNode: (node: Node<ForgeNodeData>) => void;
  updateNodeData: (id: string, data: Partial<ForgeNodeData>) => void;
  deleteNode: (id: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (edgeId: string) => void;
  setProjectTitle: (title: string) => void;
  // Remote (collab) apply — does NOT re-broadcast
  applyRemoteNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
}

/* ─── Zustand Store ─── */
export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodeId: null,
  projectTitle: 'User Service API',
  projectId: 'default-project',

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(
        { ...connection, animated: true, style: { stroke: '#6c63ff' } },
        get().edges
      ),
    });
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  deleteNode: (id) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  addEdge: (edge) => {
    const exists = get().edges.some((e) => e.id === edge.id);
    if (!exists) {
      set({ edges: [...get().edges, edge] });
    }
  },

  deleteEdge: (edgeId) => {
    set({ edges: get().edges.filter((e) => e.id !== edgeId) });
  },

  setProjectTitle: (title) => {
    set({ projectTitle: title });
  },

  applyRemoteNodeMove: (nodeId, position) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      ),
    });
  },
}));
