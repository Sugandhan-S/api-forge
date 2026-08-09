import type { Node, Edge } from '@xyflow/react';

/* ─── Node Data Types ─── */
export interface HeaderEntry {
  key: string;
  value: string;
  required?: boolean;
}

export interface RequestBodyField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
}

export interface EndpointNodeData {
  label: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description?: string;
  statusCodes?: number[];
  headers?: HeaderEntry[];
  requestBody?: RequestBodyField[];
  tags?: string[];
  [key: string]: unknown;
}

export interface ColumnDef {
  name: string;
  type: string;
  primaryKey?: boolean;
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: string;
}

export interface DatabaseNodeData {
  label: string;
  tableName: string;
  columns: ColumnDef[];
  [key: string]: unknown;
}

export interface ModelNodeData {
  label: string;
  modelName: string;
  fields: Array<{
    name: string;
    type: string;
    required?: boolean;
  }>;
  [key: string]: unknown;
}

export interface AuthNodeData {
  label: string;
  provider: 'jwt' | 'oauth2' | 'api-key' | 'basic';
  scopes?: string[];
  tokenUrl?: string;
  headerName?: string;
  description?: string;
  [key: string]: unknown;
}

export interface ApiGroupNodeData {
  label: string;
  basePath: string;
  version?: string;
  [key: string]: unknown;
}

/* ─── Node Type Union ─── */
export type ForgeNodeData =
  | EndpointNodeData
  | DatabaseNodeData
  | ModelNodeData
  | AuthNodeData
  | ApiGroupNodeData;

/* ─── Typed Nodes ─── */
export type EndpointNode = Node<EndpointNodeData, 'endpoint'>;
export type DatabaseNode = Node<DatabaseNodeData, 'database'>;
export type ModelNode = Node<ModelNodeData, 'model'>;
export type AuthNode = Node<AuthNodeData, 'auth'>;
export type ApiGroupNode = Node<ApiGroupNodeData, 'apiGroup'>;

export type ForgeNode = EndpointNode | DatabaseNode | ModelNode | AuthNode | ApiGroupNode;
export type ForgeEdge = Edge;
