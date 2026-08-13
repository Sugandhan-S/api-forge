import type { Node } from '@xyflow/react';
import type { ForgeNodeData } from '../nodes/types';

export function layoutNodes(
  newNodes: Node<ForgeNodeData>[],
  existingNodes: Node<ForgeNodeData>[]
): Node<ForgeNodeData>[] {
  // Find right-most boundary of existing canvas to spawn new nodes
  let startX = 200;
  if (existingNodes.length > 0) {
    const maxX = Math.max(...existingNodes.map((n) => n.position.x + 350));
    startX = maxX + 100;
  }

  let endpointY = 100;
  let databaseY = 100;

  return newNodes.map((node) => {
    if (node.type === 'endpoint') {
      const positioned = { ...node, position: { x: startX, y: endpointY } };
      endpointY += 200;
      return positioned;
    } else if (node.type === 'database') {
      const positioned = { ...node, position: { x: startX + 450, y: databaseY } };
      databaseY += 300;
      return positioned;
    }
    
    // Default fallback
    return { ...node, position: { x: startX, y: 100 } };
  });
}
