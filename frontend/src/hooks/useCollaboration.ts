import { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../websocket/socket';
import { useCanvasStore } from '../stores/canvasStore';
import type { Node, Edge } from '@xyflow/react';
import type { ForgeNodeData } from '../nodes/types';

/* ─── Types ─── */

export interface CollabPeer {
  socketId: string;
  userId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  joinedAt: string;
}

export type CollabStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseCollaborationReturn {
  status: CollabStatus;
  peers: CollabPeer[];
  myUserId: string;
  myColor: string;
  myName: string;
  broadcastCursor: (x: number, y: number) => void;
  broadcastNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  broadcastNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  broadcastNodeAdd: (node: Node<ForgeNodeData>) => void;
  broadcastNodeDelete: (nodeId: string) => void;
  broadcastEdgeAdd: (edge: Edge) => void;
  broadcastEdgeDelete: (edgeId: string) => void;
}

/* ─── Constants ─── */

const PEER_COLORS = [
  '#6c63ff', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
];

const PEER_NAMES = [
  'Designer', 'Builder', 'Architect', 'Planner',
  'Developer', 'Engineer', 'Analyst', 'Creator',
];

function generateUserId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/* ─── Stable user identity (persisted per session) ─── */

function getMyIdentity(): { userId: string; color: string; name: string } {
  const stored = sessionStorage.getItem('apiforge:collab-identity');
  if (stored) {
    try { return JSON.parse(stored); } catch { /* continue */ }
  }
  const idx = Math.floor(Math.random() * PEER_COLORS.length);
  const identity = {
    userId: generateUserId(),
    color: PEER_COLORS[idx],
    name: `Anonymous ${PEER_NAMES[idx]}`,
  };
  sessionStorage.setItem('apiforge:collab-identity', JSON.stringify(identity));
  return identity;
}

/* ─── Hook ─── */

export function useCollaboration(projectId: string): UseCollaborationReturn {
  const [status, setStatus] = useState<CollabStatus>('disconnected');
  const [peers, setPeers] = useState<CollabPeer[]>([]);
  const identity = useRef(getMyIdentity());
  const cursorThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const store = useCanvasStore();

  /* ── Connect & join room ── */
  useEffect(() => {
    if (!projectId) return;

    setStatus('connecting');

    if (!socket.connected) {
      socket.connect();
    }

    const joinRoom = () => {
      socket.emit('room:join', {
        projectId,
        userId: identity.current.userId,
        name: identity.current.name,
        color: identity.current.color,
      });
      setStatus('connected');
    };

    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    socket.on('connect_error', () => setStatus('error'));

    return () => {
      socket.off('connect', joinRoom);
      socket.off('connect_error');
    };
  }, [projectId]);

  /* ── Peer presence events ── */
  useEffect(() => {
    const handleRoomState = ({ peers: initialPeers }: { peers: CollabPeer[] }) => {
      setPeers(initialPeers);
    };

    const handlePeerJoined = (peer: CollabPeer) => {
      setPeers((prev) => [...prev.filter((p) => p.socketId !== peer.socketId), peer]);
    };

    const handlePeerLeft = ({ socketId }: { socketId: string }) => {
      setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
    };

    const handleCursorUpdate = ({ socketId, x, y }: { socketId: string; x: number; y: number }) => {
      setPeers((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, cursor: { x, y } } : p))
      );
    };

    socket.on('room:state', handleRoomState);
    socket.on('peer:joined', handlePeerJoined);
    socket.on('peer:left', handlePeerLeft);
    socket.on('cursor:update', handleCursorUpdate);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('peer:joined', handlePeerJoined);
      socket.off('peer:left', handlePeerLeft);
      socket.off('cursor:update', handleCursorUpdate);
    };
  }, []);

  /* ── Remote canvas events → apply to local store ── */
  useEffect(() => {
    const handleNodeMoved = ({ nodeId, position, senderSocketId }: {
      nodeId: string;
      position: { x: number; y: number };
      senderSocketId: string;
    }) => {
      if (senderSocketId === socket.id) return;
      store.applyRemoteNodeMove(nodeId, position);
    };

    const handleNodeData = ({ nodeId, patch, senderSocketId }: {
      nodeId: string;
      patch: Record<string, unknown>;
      senderSocketId: string;
    }) => {
      if (senderSocketId === socket.id) return;
      store.updateNodeData(nodeId, patch as Partial<ForgeNodeData>);
    };

    const handleNodeAdded = ({ node, senderSocketId }: { node: Node<ForgeNodeData>; senderSocketId: string }) => {
      if (senderSocketId === socket.id) return;
      store.addNode(node);
    };

    const handleNodeDeleted = ({ nodeId, senderSocketId }: { nodeId: string; senderSocketId: string }) => {
      if (senderSocketId === socket.id) return;
      store.deleteNode(nodeId);
    };

    const handleEdgeAdded = ({ edge, senderSocketId }: { edge: Edge; senderSocketId: string }) => {
      if (senderSocketId === socket.id) return;
      store.addEdge(edge);
    };

    const handleEdgeDeleted = ({ edgeId, senderSocketId }: { edgeId: string; senderSocketId: string }) => {
      if (senderSocketId === socket.id) return;
      store.deleteEdge(edgeId);
    };

    socket.on('canvas:node:moved', handleNodeMoved);
    socket.on('canvas:node:data', handleNodeData);
    socket.on('canvas:node:added', handleNodeAdded);
    socket.on('canvas:node:deleted', handleNodeDeleted);
    socket.on('canvas:edge:added', handleEdgeAdded);
    socket.on('canvas:edge:deleted', handleEdgeDeleted);

    return () => {
      socket.off('canvas:node:moved', handleNodeMoved);
      socket.off('canvas:node:data', handleNodeData);
      socket.off('canvas:node:added', handleNodeAdded);
      socket.off('canvas:node:deleted', handleNodeDeleted);
      socket.off('canvas:edge:added', handleEdgeAdded);
      socket.off('canvas:edge:deleted', handleEdgeDeleted);
    };
  }, [store]);

  /* ── Broadcast helpers ── */

  const broadcastCursor = useCallback((x: number, y: number) => {
    if (!socket.connected) return;
    if (cursorThrottle.current) return;
    cursorThrottle.current = setTimeout(() => {
      cursorThrottle.current = null;
    }, 50); // 20fps
    socket.emit('cursor:move', { x, y });
  }, []);

  const broadcastNodeMove = useCallback((nodeId: string, position: { x: number; y: number }) => {
    socket.emit('canvas:node:moved', { nodeId, position });
  }, []);

  const broadcastNodeData = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    socket.emit('canvas:node:data', { nodeId, patch });
  }, []);

  const broadcastNodeAdd = useCallback((node: Node<ForgeNodeData>) => {
    socket.emit('canvas:node:added', { node });
  }, []);

  const broadcastNodeDelete = useCallback((nodeId: string) => {
    socket.emit('canvas:node:deleted', { nodeId });
  }, []);

  const broadcastEdgeAdd = useCallback((edge: Edge) => {
    socket.emit('canvas:edge:added', { edge });
  }, []);

  const broadcastEdgeDelete = useCallback((edgeId: string) => {
    socket.emit('canvas:edge:deleted', { edgeId });
  }, []);

  return {
    status,
    peers,
    myUserId: identity.current.userId,
    myColor: identity.current.color,
    myName: identity.current.name,
    broadcastCursor,
    broadcastNodeMove,
    broadcastNodeData,
    broadcastNodeAdd,
    broadcastNodeDelete,
    broadcastEdgeAdd,
    broadcastEdgeDelete,
  };
}
