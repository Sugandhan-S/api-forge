import type { Server, Socket } from 'socket.io';

/* ─── Types ─── */

interface Peer {
  socketId: string;
  userId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  joinedAt: string;
}

interface Room {
  projectId: string;
  peers: Map<string, Peer>;
}

/* ─── In-memory room store ─── */
const rooms = new Map<string, Room>();

function getOrCreateRoom(projectId: string): Room {
  if (!rooms.has(projectId)) {
    rooms.set(projectId, { projectId, peers: new Map() });
  }
  return rooms.get(projectId)!;
}

function leaveRoom(socket: Socket, io: Server, roomId: string) {
  socket.leave(roomId);
  const room = rooms.get(roomId);
  if (!room) return;

  const peer = room.peers.get(socket.id);
  room.peers.delete(socket.id);

  if (peer) {
    io.to(roomId).emit('peer:left', { socketId: socket.id, userId: peer.userId });
  }

  // GC empty rooms
  if (room.peers.size === 0) {
    rooms.delete(roomId);
  }
}

/* ─── Setup ─── */

export function setupCollabHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);
    let currentRoomId: string | null = null;

    /* ── Join a project room ── */
    socket.on('room:join', (data: {
      projectId: string;
      userId: string;
      name: string;
      color: string;
    }) => {
      const { projectId, userId, name, color } = data;

      // Leave any current room first
      if (currentRoomId) leaveRoom(socket, io, currentRoomId);

      currentRoomId = projectId;
      socket.join(projectId);

      const room = getOrCreateRoom(projectId);
      const peer: Peer = {
        socketId: socket.id,
        userId,
        name,
        color,
        joinedAt: new Date().toISOString(),
      };
      room.peers.set(socket.id, peer);

      // Send existing peers to the newcomer
      const existingPeers = Array.from(room.peers.values()).filter(
        (p) => p.socketId !== socket.id
      );
      socket.emit('room:state', { peers: existingPeers });

      // Announce arrival to existing peers
      socket.to(projectId).emit('peer:joined', peer);
      console.log(`[WS] ${name} joined room: ${projectId} (${room.peers.size} peers)`);
    });

    /* ── Cursor position (canvas coordinates) ── */
    socket.on('cursor:move', (data: { x: number; y: number }) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      if (room) {
        const peer = room.peers.get(socket.id);
        if (peer) peer.cursor = data;
      }
      socket.to(currentRoomId).emit('cursor:update', {
        socketId: socket.id,
        x: data.x,
        y: data.y,
      });
    });

    /* ── Canvas node events ── */
    socket.on('canvas:node:moved', (data: {
      nodeId: string;
      position: { x: number; y: number };
    }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('canvas:node:moved', {
        ...data,
        senderSocketId: socket.id,
      });
    });

    socket.on('canvas:node:data', (data: {
      nodeId: string;
      patch: Record<string, unknown>;
    }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('canvas:node:data', {
        ...data,
        senderSocketId: socket.id,
      });
    });

    socket.on('canvas:node:added', (data: { node: unknown }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('canvas:node:added', {
        ...data,
        senderSocketId: socket.id,
      });
    });

    socket.on('canvas:node:deleted', (data: { nodeId: string }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('canvas:node:deleted', {
        ...data,
        senderSocketId: socket.id,
      });
    });

    socket.on('canvas:edge:added', (data: { edge: unknown }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('canvas:edge:added', {
        ...data,
        senderSocketId: socket.id,
      });
    });

    socket.on('canvas:edge:deleted', (data: { edgeId: string }) => {
      if (!currentRoomId) return;
      socket.to(currentRoomId).emit('canvas:edge:deleted', {
        ...data,
        senderSocketId: socket.id,
      });
    });

    /* ── Disconnect ── */
    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
      if (currentRoomId) leaveRoom(socket, io, currentRoomId);
    });
  });
}

/* ─── Room stats (for health endpoint) ─── */
export function getRoomStats() {
  return {
    activeRooms: rooms.size,
    totalPeers: Array.from(rooms.values()).reduce((s, r) => s + r.peers.size, 0),
  };
}
