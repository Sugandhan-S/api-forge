import { io as socketIO } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * Singleton Socket.IO client — shared across all hooks.
 * Connect/disconnect is managed by useCollaboration.
 */
export const socket = socketIO(BACKEND_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 5,
  reconnectionDelay: 1500,
});

socket.on('connect', () => {
  console.log(`[Socket] Connected: ${socket.id}`);
});

socket.on('disconnect', (reason) => {
  console.log(`[Socket] Disconnected: ${reason}`);
});

socket.on('connect_error', (err) => {
  console.warn(`[Socket] Connection error: ${err.message}`);
});
