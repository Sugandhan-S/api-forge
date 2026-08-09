/* ─── APIForge Intermediate AST ───
 *
 * This is the canonical intermediate representation between the visual
 * canvas and any output format (OpenAPI, GraphQL, gRPC, etc.).
 *
 * Canvas Nodes → AST → OpenAPI / Mock Server / Test Suite
 */

/* ─── Endpoint ─── */
export interface ASTEndpoint {
  id: string;
  label: string;
  method: string;
  path: string;
  description?: string;
  statusCodes: number[];
  headers: ASTHeader[];
  requestBody?: ASTRequestBody;
  tags: string[];
  security: string[];           // IDs of linked auth nodes
  linkedSchemas: string[];      // IDs of linked database/model nodes
}

export interface ASTHeader {
  key: string;
  value: string;
  required: boolean;
}

export interface ASTRequestBody {
  contentType: string;
  fields: ASTBodyField[];
}

export interface ASTBodyField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/* ─── Schema (from Database / Model nodes) ─── */
export interface ASTSchema {
  id: string;
  label: string;
  name: string;                 // PascalCase schema name for OpenAPI
  tableName: string;            // Original DB table name
  properties: ASTSchemaProperty[];
}

export interface ASTSchemaProperty {
  name: string;
  type: string;                 // OpenAPI-compatible type
  format?: string;              // OpenAPI format (e.g., uuid, date-time)
  primaryKey: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue?: string;
}

/* ─── Security Scheme ─── */
export interface ASTSecurityScheme {
  id: string;
  label: string;
  name: string;                 // Sanitized name for OpenAPI
  provider: string;
  scopes: string[];
  tokenUrl?: string;
  headerName?: string;
  description?: string;
}

/* ─── Relationship (edge) ─── */
export interface ASTRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: string;
  targetType: string;
}

/* ─── Root AST ─── */
export interface ApiForgeAST {
  meta: {
    title: string;
    version: string;
    description: string;
    generatedAt: string;
  };
  endpoints: ASTEndpoint[];
  schemas: ASTSchema[];
  securitySchemes: ASTSecurityScheme[];
  relationships: ASTRelationship[];
}
