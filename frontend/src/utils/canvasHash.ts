import type { Node, Edge } from '@xyflow/react';

/**
 * Produces a short, stable fingerprint of the canvas structure.
 *
 * The hash changes when:
 *  - Nodes are added or removed
 *  - Edges are added or removed
 *  - A node's type changes
 *
 * The hash does NOT change when:
 *  - Node positions move (layout changes are cosmetic)
 *  - Visual styling changes
 *
 * This lets us detect "the API design fundamentally changed" vs
 * "the user just rearranged cards on the canvas".
 */
export function computeCanvasHash(nodes: Node[], edges: Edge[]): string {
  const nodeFingerprint = nodes
    .map((n) => `${n.id}:${n.type ?? 'default'}`)
    .sort()
    .join('|');

  const edgeFingerprint = edges
    .map((e) => `${e.source}->${e.target}`)
    .sort()
    .join('|');

  const raw = `${nodes.length}:${edges.length}::${nodeFingerprint}::${edgeFingerprint}`;

  // Simple djb2 hash — deterministic, fast, no crypto needed
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }

  return (hash >>> 0).toString(36); // unsigned 32-bit base-36 string, e.g. "1q3z9a"
}
