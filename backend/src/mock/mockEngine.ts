import { Router, type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { fakeFromSchema, type OpenAPISchemaObject } from './schemaFaker';

interface OpenAPIResponse {
  description?: string;
  content?: Record<string, { schema?: OpenAPISchemaObject }>;
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  parameters?: Array<{ name: string; in: string; required?: boolean }>;
  requestBody?: { content?: Record<string, { schema?: OpenAPISchemaObject }> };
  responses?: Record<string, OpenAPIResponse>;
}

interface OpenAPISpec {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenAPIOperation>>;
  components?: {
    schemas?: Record<string, OpenAPISchemaObject>;
    securitySchemes?: Record<string, unknown>;
  };
}

/* ─── Mock Session ─── */

export interface MockRoute {
  method: string;
  path: string;          // original OpenAPI path, e.g. /api/v1/users/{id}
  expressPath: string;   // Express-compatible path, e.g. /api/v1/users/:id
  operationId?: string;
  summary?: string;
  statusCode: number;
}

export interface MockSession {
  projectId: string;
  title: string;
  version: string;
  router: Router;
  routes: MockRoute[];
  createdAt: string;
}

/* ─── Helper: OpenAPI path → Express path ─── */

function toExpressPath(openApiPath: string): string {
  // /users/{id} → /users/:id
  return openApiPath.replace(/\{(\w+)\}/g, ':$1');
}

/* ─── Helper: pick success status code from operation responses ─── */

function pickSuccessCode(responses: Record<string, OpenAPIResponse>): number {
  const successCodes = Object.keys(responses)
    .map(Number)
    .filter((c) => c >= 200 && c < 300)
    .sort();
  return successCodes[0] || 200;
}

/* ─── Helper: extract response schema ─── */

function extractResponseSchema(
  responses: Record<string, OpenAPIResponse>,
  statusCode: number
): OpenAPISchemaObject | null {
  const response = responses[String(statusCode)];
  if (!response?.content) return null;

  // Prefer application/json
  const jsonContent = response.content['application/json'];
  return jsonContent?.schema || null;
}

/* ─── Core: Build a Router from an OpenAPI spec ─── */

export function buildMockRouter(spec: OpenAPISpec, projectId: string): MockSession {
  const router = Router();
  const routes: MockRoute[] = [];
  const schemas = spec.components?.schemas || {};

  const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;
  type HttpMethod = (typeof METHODS)[number];

  for (const [openApiPath, pathItem] of Object.entries(spec.paths)) {
    const expressPath = toExpressPath(openApiPath);

    for (const method of METHODS) {
      const operation = pathItem[method] as OpenAPIOperation | undefined;
      if (!operation) continue;

      const responses = operation.responses || {};
      const statusCode = pickSuccessCode(responses);
      const responseSchema = extractResponseSchema(responses, statusCode);

      // Determine mock item count (list endpoints return more)
      const isListEndpoint = method === 'get' && !openApiPath.includes('{');
      const itemCount = isListEndpoint ? 5 : 1;

      // Capture for closure
      const capturedSchema = responseSchema;
      const capturedSchemas = schemas;
      const capturedStatus = statusCode;
      const capturedCount = itemCount;

      // Register the Express route handler
      router[method](expressPath, (_req: Request, res: Response) => {
        try {
          // Add artificial latency to feel realistic (50–200ms)
          const latency = 50 + Math.floor(Math.random() * 150);
          setTimeout(() => {
            if (!capturedSchema) {
              // No response body defined — return empty success
              res.status(capturedStatus).json(
                capturedStatus === 204 ? null : { message: 'Success', _mock: true }
              );
              return;
            }

            const faked = fakeFromSchema(capturedSchema, capturedSchemas, capturedCount);
            res.status(capturedStatus).json(faked);
          }, latency);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Mock generation failed';
          res.status(500).json({ error: message, _mock: true });
        }
      });

      routes.push({
        method: method.toUpperCase(),
        path: openApiPath,
        expressPath,
        operationId: operation.operationId,
        summary: operation.summary,
        statusCode,
      });
    }
  }

  return {
    projectId,
    title: spec.info.title,
    version: spec.info.version,
    router,
    routes,
    createdAt: new Date().toISOString(),
  };
}

/* ─── Session Store ─── */

class MockSessionStore {
  private sessions = new Map<string, MockSession>();

  create(spec: OpenAPISpec, projectId?: string): MockSession {
    const id = projectId || uuidv4();
    // Tear down any existing session for this project
    this.sessions.delete(id);
    const session = buildMockRouter(spec, id);
    this.sessions.set(id, session);
    return session;
  }

  get(projectId: string): MockSession | undefined {
    return this.sessions.get(projectId);
  }

  delete(projectId: string): boolean {
    return this.sessions.delete(projectId);
  }

  list(): Array<Omit<MockSession, 'router'>> {
    return Array.from(this.sessions.values()).map(({ router: _router, ...rest }) => rest);
  }

  has(projectId: string): boolean {
    return this.sessions.has(projectId);
  }
}

export const mockSessionStore = new MockSessionStore();
