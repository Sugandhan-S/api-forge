import * as yaml from 'js-yaml';
import type {
  ApiForgeAST,
  ASTEndpoint,
  ASTSchema,
  ASTSecurityScheme,
} from './ast.types';

/* ─── OpenAPI 3.0 Types (subset for generation) ─── */

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    schemas?: Record<string, OpenAPISchemaObject>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
  };
  tags?: Array<{ name: string; description?: string }>;
}

interface OpenAPIOperation {
  operationId: string;
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
}

interface OpenAPIParameter {
  name: string;
  in: string;
  required: boolean;
  schema: { type: string };
  description?: string;
}

interface OpenAPIRequestBody {
  required: boolean;
  content: Record<string, { schema: OpenAPISchemaObject }>;
}

interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema: OpenAPISchemaObject }>;
}

interface OpenAPISchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchemaObject>;
  required?: string[];
  nullable?: boolean;
  description?: string;
  items?: OpenAPISchemaObject;
  default?: unknown;
  $ref?: string;
}

interface OpenAPISecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
  description?: string;
  flows?: {
    clientCredentials?: {
      tokenUrl: string;
      scopes: Record<string, string>;
    };
  };
}

/* ─── Helpers ─── */

function toOperationId(method: string, path: string): string {
  const segments = path
    .split('/')
    .filter((s) => s && !s.startsWith('{'))
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, ''));

  const verb = method.toLowerCase();
  const resource = segments
    .map((s, i) => (i === 0 ? s.toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))
    .join('');

  return `${verb}${resource.charAt(0).toUpperCase() + resource.slice(1)}`;
}

function getResponseDescription(code: number): string {
  const descriptions: Record<number, string> = {
    200: 'Successful response',
    201: 'Resource created successfully',
    204: 'No content',
    400: 'Bad request — invalid input',
    401: 'Unauthorized — authentication required',
    403: 'Forbidden — insufficient permissions',
    404: 'Not found',
    409: 'Conflict — resource already exists',
    422: 'Unprocessable entity — validation error',
    500: 'Internal server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
  };
  return descriptions[code] || `Response with status ${code}`;
}

/** Map a body field type to an OpenAPI schema fragment */
function bodyFieldToSchema(type: string): OpenAPISchemaObject {
  switch (type) {
    case 'number':
      return { type: 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object':
      return { type: 'object' };
    case 'array':
      return { type: 'array', items: { type: 'string' } };
    default:
      return { type: 'string' };
  }
}

/* ─── Schema Generation ─── */

function buildSchemaObject(schema: ASTSchema): OpenAPISchemaObject {
  const properties: Record<string, OpenAPISchemaObject> = {};
  const required: string[] = [];

  for (const prop of schema.properties) {
    const propSchema: OpenAPISchemaObject = {
      type: prop.type,
    };

    if (prop.format) propSchema.format = prop.format;
    if (prop.nullable) propSchema.nullable = true;
    if (prop.defaultValue) propSchema.default = prop.defaultValue;

    // Add description for special fields
    if (prop.primaryKey) {
      propSchema.description = 'Primary key';
      required.push(prop.name);
    } else if (prop.unique) {
      propSchema.description = 'Unique constraint';
    }

    properties[prop.name] = propSchema;
  }

  // Non-nullable, non-PK properties are also required
  for (const prop of schema.properties) {
    if (!prop.nullable && !prop.primaryKey && prop.name !== 'created_at' && prop.name !== 'updated_at') {
      if (!required.includes(prop.name)) {
        required.push(prop.name);
      }
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/* ─── Security Scheme Generation ─── */

function buildSecurityScheme(scheme: ASTSecurityScheme): OpenAPISecurityScheme {
  switch (scheme.provider) {
    case 'jwt':
      return {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: scheme.description || `JWT Bearer authentication`,
      };

    case 'oauth2':
      return {
        type: 'oauth2',
        description: scheme.description || 'OAuth 2.0 authentication',
        flows: {
          clientCredentials: {
            tokenUrl: scheme.tokenUrl || 'https://auth.example.com/oauth/token',
            scopes: Object.fromEntries(
              scheme.scopes.map((s) => [s, `${s} access`])
            ),
          },
        },
      };

    case 'api-key':
      return {
        type: 'apiKey',
        name: scheme.headerName || 'X-API-Key',
        in: 'header',
        description: scheme.description || 'API key authentication',
      };

    case 'basic':
      return {
        type: 'http',
        scheme: 'basic',
        description: scheme.description || 'Basic HTTP authentication',
      };

    default:
      return {
        type: 'http',
        scheme: 'bearer',
        description: scheme.description || 'Authentication',
      };
  }
}

/* ─── Operation (Endpoint) Generation ─── */

function buildOperation(
  endpoint: ASTEndpoint,
  schemas: ASTSchema[],
  securitySchemes: ASTSecurityScheme[]
): OpenAPIOperation {
  const operation: OpenAPIOperation = {
    operationId: toOperationId(endpoint.method, endpoint.path),
    summary: endpoint.label,
    description: endpoint.description,
    responses: {},
  };

  // Tags — derive from path segments if none specified
  if (endpoint.tags.length > 0) {
    operation.tags = endpoint.tags;
  } else {
    const pathTag = endpoint.path
      .split('/')
      .filter((s) => s && !s.startsWith('{') && !['api', 'v1', 'v2'].includes(s))[0];
    if (pathTag) {
      operation.tags = [pathTag];
    }
  }

  // Headers → parameters
  if (endpoint.headers.length > 0) {
    operation.parameters = endpoint.headers.map((h) => ({
      name: h.key,
      in: 'header',
      required: h.required,
      schema: { type: 'string' },
      description: h.value ? `Default: ${h.value}` : undefined,
    }));
  }

  // Path parameters (e.g., /users/{id})
  const pathParams = endpoint.path.match(/\{(\w+)\}/g);
  if (pathParams) {
    const params = operation.parameters || [];
    for (const param of pathParams) {
      const name = param.replace(/[{}]/g, '');
      params.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' },
      });
    }
    operation.parameters = params;
  }

  // Request body
  if (endpoint.requestBody && endpoint.requestBody.fields.length > 0) {
    const bodyProperties: Record<string, OpenAPISchemaObject> = {};
    const bodyRequired: string[] = [];

    for (const field of endpoint.requestBody.fields) {
      bodyProperties[field.name] = {
        ...bodyFieldToSchema(field.type),
        ...(field.description ? { description: field.description } : {}),
      };
      if (field.required) bodyRequired.push(field.name);
    }

    operation.requestBody = {
      required: bodyRequired.length > 0,
      content: {
        [endpoint.requestBody.contentType]: {
          schema: {
            type: 'object',
            properties: bodyProperties,
            ...(bodyRequired.length > 0 ? { required: bodyRequired } : {}),
          },
        },
      },
    };
  }

  // Responses
  for (const code of endpoint.statusCodes) {
    const response: OpenAPIResponse = {
      description: getResponseDescription(code),
    };

    // For success codes on linked schemas, add response body
    if (code >= 200 && code < 300 && code !== 204 && endpoint.linkedSchemas.length > 0) {
      const linkedSchema = schemas.find((s) => endpoint.linkedSchemas.includes(s.id));
      if (linkedSchema) {
        const isListEndpoint =
          endpoint.method === 'GET' && !endpoint.path.includes('{');
        const schemaRef: OpenAPISchemaObject = {
          $ref: `#/components/schemas/${linkedSchema.name}`,
        };

        response.content = {
          'application/json': {
            schema: isListEndpoint
              ? {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: schemaRef,
                    },
                    total: { type: 'integer', description: 'Total number of records' },
                    page: { type: 'integer', description: 'Current page number' },
                    limit: { type: 'integer', description: 'Number of records per page' },
                  },
                }
              : schemaRef,
          },
        };
      }
    }

    operation.responses[String(code)] = response;
  }

  // Ensure at least a default response
  if (Object.keys(operation.responses).length === 0) {
    operation.responses['200'] = { description: 'Successful response' };
  }

  // Security requirements
  if (endpoint.security.length > 0) {
    operation.security = endpoint.security
      .map((secId) => {
        const scheme = securitySchemes.find((s) => s.id === secId);
        if (!scheme) return null;
        return { [scheme.name]: scheme.scopes };
      })
      .filter((s): s is Record<string, string[]> => s !== null);
  }

  return operation;
}

/* ─── Main Generator ─── */

export function generateOpenAPISpec(ast: ApiForgeAST): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.3',
    info: {
      title: ast.meta.title,
      version: ast.meta.version,
      description: ast.meta.description,
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Local development' },
      { url: 'https://api.example.com', description: 'Production' },
    ],
    paths: {},
    components: {
      schemas: {},
      securitySchemes: {},
    },
  };

  // Collect tags for deduplication
  const tagSet = new Set<string>();

  // ── Build Paths ──
  for (const endpoint of ast.endpoints) {
    const method = endpoint.method.toLowerCase();
    const path = endpoint.path;

    if (!spec.paths[path]) {
      spec.paths[path] = {};
    }

    const operation = buildOperation(endpoint, ast.schemas, ast.securitySchemes);
    spec.paths[path][method] = operation;

    // Collect tags
    if (operation.tags) {
      operation.tags.forEach((t) => tagSet.add(t));
    }
  }

  // ── Build Schemas ──
  for (const schema of ast.schemas) {
    spec.components!.schemas![schema.name] = buildSchemaObject(schema);
  }

  // ── Build Security Schemes ──
  for (const scheme of ast.securitySchemes) {
    spec.components!.securitySchemes![scheme.name] = buildSecurityScheme(scheme);
  }

  // ── Tags ──
  if (tagSet.size > 0) {
    spec.tags = Array.from(tagSet).map((name) => ({
      name,
      description: `Operations related to ${name}`,
    }));
  }

  // Clean up empty sections
  if (Object.keys(spec.components!.schemas!).length === 0) {
    delete spec.components!.schemas;
  }
  if (Object.keys(spec.components!.securitySchemes!).length === 0) {
    delete spec.components!.securitySchemes;
  }
  if (
    spec.components &&
    !spec.components.schemas &&
    !spec.components.securitySchemes
  ) {
    delete spec.components;
  }

  return spec;
}

/* ─── Output Formatters ─── */

export function specToJSON(spec: OpenAPISpec): string {
  return JSON.stringify(spec, null, 2);
}

export function specToYAML(spec: OpenAPISpec): string {
  return yaml.dump(spec, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
    forceQuotes: false,
  });
}

/* ─── Convenience: One-shot from AST ─── */

export function generateFromAST(
  ast: ApiForgeAST,
  format: 'json' | 'yaml' = 'yaml'
): string {
  const spec = generateOpenAPISpec(ast);
  return format === 'json' ? specToJSON(spec) : specToYAML(spec);
}
