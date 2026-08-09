import { useReactFlow } from '@xyflow/react';
import type { CollabPeer } from '../hooks/useCollaboration';

/* ─── Single cursor label ─── */

function PeerCursor({ peer }: { peer: CollabPeer }) {
  const { flowToScreenPosition } = useReactFlow();

  if (!peer.cursor) return null;

  const screen = flowToScreenPosition({ x: peer.cursor.x, y: peer.cursor.y });

  return (
    <div
      className="pointer-events-none absolute z-[200] transition-transform duration-75"
      style={{ left: screen.x, top: screen.y, transform: 'translate(-2px, -2px)' }}
    >
      {/* SVG cursor arrow */}
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
        <path
          d="M1 1L8.5 22L12 13L21 9.5L1 1Z"
          fill={peer.color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* Name label */}
      <div
        className="absolute top-5 left-3 px-1.5 py-0.5 rounded text-[10px] font-semibold
                   text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: peer.color }}
      >
        {peer.name}
      </div>
    </div>
  );
}

/* ─── Overlay container ─── */

interface CollabCursorsProps {
  peers: CollabPeer[];
}

export function CollabCursors({ peers }: CollabCursorsProps) {
  const activePeers = peers.filter((p) => p.cursor);

  if (activePeers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[200] overflow-hidden">
      {activePeers.map((peer) => (
        <PeerCursor key={peer.socketId} peer={peer} />
      ))}
    </div>
  );
}
