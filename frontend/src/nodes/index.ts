import { EndpointNode } from './EndpointNode';
import { DatabaseNode } from './DatabaseNode';
import { AuthNode } from './AuthNode';

export { EndpointNode, DatabaseNode, AuthNode };

export const nodeTypes = {
  endpoint: EndpointNode,
  database: DatabaseNode,
  auth: AuthNode,
};
