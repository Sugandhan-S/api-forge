import type { Node, Edge } from '@xyflow/react';
import type {
  EndpointNodeData,
  DatabaseNodeData,
  AuthNodeData,
  ColumnDef,
  ForgeNodeData,
} from '../nodes/types';
import type {
  ApiForgeAST,
  ASTEndpoint,
  ASTSchema,
  ASTSchemaProperty,
  ASTSecurityScheme,
  ASTRelationship,
} from './ast.types';

/* ─── Helpers ─── */

/** Convert snake_case or kebab-case to PascalCase for schema names */
function toPascalCase(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/** Sanitize a string for use as an OpenAPI identifier */
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
}

/** Map PostgreSQL column types to OpenAPI type + format */
function mapColumnTypeToOpenAPI(pgType: string): { type: string; format?: string } {
  const normalized = pgType.toLowerCase().replace(/\(.*\)/, '');

  const typeMap: Record<string, { type: string; format?: string }> = {
    uuid: { type: 'string', format: 'uuid' },
    serial: { type: 'integer', format: 'int32' },
    bigserial: { type: 'integer', format: 'int64' },
    varchar: { type: 'string' },
    text: { type: 'string' },
    integer: { type: 'integer', format: 'int32' },
    int: { type: 'integer', format: 'int32' },
    bigint: { type: 'integer', format: 'int64' },
    numeric: { type: 'number', format: 'double' },
    decimal: { type: 'number', format: 'double' },
    float: { type: 'number', format: 'float' },
    real: { type: 'number', format: 'float' },
    boolean: { type: 'boolean' },
    bool: { type: 'boolean' },
    timestamp: { type: 'string', format: 'date-time' },
    timestamptz: { type: 'string', format: 'date-time' },
    date: { type: 'string', format: 'date' },
    time: { type: 'string', format: 'time' },
    json: { type: 'object' },
    jsonb: { type: 'object' },
    bytea: { type: 'string', format: 'binary' },
  };

  return typeMap[normalized] || { type: 'string' };
}

/* ─── Relationship Resolver ─── */

interface ResolvedRelationships {
  /** Map of endpoint ID → security scheme IDs connected to it */
  endpointSecurity: Map<string, string[]>;
  /** Map of endpoint ID → database/model schema IDs connected to it */
  endpointSchemas: Map<string, string[]>;
}

function resolveRelationships(
  nodes: Node<ForgeNodeData>[],
  edges: Edge[]
): ResolvedRelationships {
  const nodeTypeMap = new Map<string, string>();
  nodes.forEach((n) => nodeTypeMap.set(n.id, n.type || ''));

  const endpointSecurity = new Map<string, string[]>();
  const endpointSchemas = new Map<string, string[]>();

  for (const edge of edges) {
    const sourceType = nodeTypeMap.get(edge.source) || '';
    const targetType = nodeTypeMap.get(edge.target) || '';

    // Auth → Endpoint: security requirement
    if (sourceType === 'auth' && targetType === 'endpoint') {
      const existing = endpointSecurity.get(edge.target) || [];
      existing.push(edge.source);
      endpointSecurity.set(edge.target, existing);
    }

    // Endpoint → Database: schema link
    if (sourceType === 'endpoint' && targetType === 'database') {
      const existing = endpointSchemas.get(edge.source) || [];
      existing.push(edge.target);
      endpointSchemas.set(edge.source, existing);
    }

    // Database → Endpoint: also a schema link (reverse direction)
    if (sourceType === 'database' && targetType === 'endpoint') {
      const existing = endpointSchemas.get(edge.target) || [];
      existing.push(edge.source);
      endpointSchemas.set(edge.target, existing);
    }
  }

  return { endpointSecurity, endpointSchemas };
}

/* ─── Column → Schema Property ─── */

function buildSchemaProperty(col: ColumnDef): ASTSchemaProperty {
  const openApiType = mapColumnTypeToOpenAPI(col.type);
  return {
    name: col.name,
    type: openApiType.type,
    format: openApiType.format,
    primaryKey: col.primaryKey || false,
    nullable: col.nullable || false,
    unique: col.unique || false,
    defaultValue: col.defaultValue,
  };
}

/* ─── Main Builder ─── */

export function buildAST(
  nodes: Node<ForgeNodeData>[],
  edges: Edge[],
  projectTitle = 'APIForge Project',
  projectVersion = '1.0.0'
): ApiForgeAST {
  const relationships = resolveRelationships(nodes, edges);

  // ── Build Endpoints ──
  const endpoints: ASTEndpoint[] = nodes
    .filter((n) => n.type === 'endpoint')
    .map((n) => {
      const data = n.data as unknown as EndpointNodeData;
      return {
        id: n.id,
        label: data.label,
        method: data.method,
        path: data.path,
        description: data.description,
        statusCodes: data.statusCodes || [200],
        headers: (data.headers || []).map((h) => ({
          key: h.key,
          value: h.value,
          required: h.required || false,
        })),
        requestBody:
          data.requestBody && data.requestBody.length > 0
            ? {
                contentType: 'application/json',
                fields: data.requestBody.map((f) => ({
                  name: f.name,
                  type: f.type,
                  required: f.required || false,
                  description: f.description,
                })),
              }
            : undefined,
        tags: data.tags || [],
        security: relationships.endpointSecurity.get(n.id) || [],
        linkedSchemas: relationships.endpointSchemas.get(n.id) || [],
      };
    });

  // ── Build Schemas ──
  const schemas: ASTSchema[] = nodes
    .filter((n) => n.type === 'database')
    .map((n) => {
      const data = n.data as unknown as DatabaseNodeData;
      return {
        id: n.id,
        label: data.label,
        name: toPascalCase(data.tableName),
        tableName: data.tableName,
        properties: (data.columns || []).map(buildSchemaProperty),
      };
    });

  // ── Build Security Schemes ──
  const securitySchemes: ASTSecurityScheme[] = nodes
    .filter((n) => n.type === 'auth')
    .map((n) => {
      const data = n.data as unknown as AuthNodeData;
      return {
        id: n.id,
        label: data.label,
        name: sanitizeId(data.label),
        provider: data.provider,
        scopes: data.scopes || [],
        tokenUrl: data.tokenUrl,
        headerName: data.headerName,
        description: data.description,
      };
    });

  // ── Build Relationships ──
  const astRelationships: ASTRelationship[] = edges.map((e) => {
    const sourceType =
      nodes.find((n) => n.id === e.source)?.type || 'unknown';
    const targetType =
      nodes.find((n) => n.id === e.target)?.type || 'unknown';
    return {
      id: e.id,
      sourceId: e.source,
      targetId: e.target,
      sourceType,
      targetType,
    };
  });

  return {
    meta: {
      title: projectTitle,
      version: projectVersion,
      description: `Generated by APIForge from ${endpoints.length} endpoint(s), ${schemas.length} schema(s), ${securitySchemes.length} security scheme(s).`,
      generatedAt: new Date().toISOString(),
    },
    endpoints,
    schemas,
    securitySchemes,
    relationships: astRelationships,
  };
}
