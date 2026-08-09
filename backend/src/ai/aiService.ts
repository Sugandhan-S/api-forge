/* ─── Template-based AI generation (no API key required) ─── */

interface ASTEndpoint {
  id: string;
  label: string;
  method: string;
  path: string;
  description?: string;
  statusCodes: number[];
  headers: Array<{ key: string; value: string; required: boolean }>;
  requestBody?: {
    contentType: string;
    fields: Array<{ name: string; type: string; required: boolean; description?: string }>;
  };
  tags: string[];
  security: string[];
  linkedSchemas: string[];
}

interface ASTSchema {
  id: string;
  label: string;
  name: string;
  tableName: string;
  properties: Array<{
    name: string;
    type: string;
    format?: string;
    primaryKey: boolean;
    nullable: boolean;
    unique: boolean;
  }>;
}

interface ApiForgeAST {
  meta: { title: string; version: string; description: string; generatedAt: string };
  endpoints: ASTEndpoint[];
  schemas: ASTSchema[];
  securitySchemes: Array<{ id: string; name: string; provider: string }>;
}

/* ─── Resource name extraction ─── */

function extractResource(path: string): string {
  const parts = path.split('/').filter((p) => p && !p.startsWith('{') && !['api', 'v1', 'v2', 'v3'].includes(p));
  return parts[parts.length - 1] || 'resource';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isListEndpoint(method: string, path: string): boolean {
  return method === 'GET' && !path.includes('{');
}

/* ─── Description Generator ─── */

function generateDescription(endpoint: ASTEndpoint): string {
  const resource = extractResource(endpoint.path);
  const isById = endpoint.path.includes('{');
  const resourceCap = capitalize(resource);

  const templates: Record<string, (r: string, byId: boolean) => string> = {
    GET: (r, byId) =>
      byId
        ? `Retrieve a specific ${r} by its unique identifier. Returns a single ${r} object with all associated data.`
        : `Retrieve a paginated list of all ${r}. Supports filtering, sorting, and pagination via query parameters.`,
    POST: (r) =>
      `Create a new ${r} record. Validates the request body against the ${capitalize(r)} schema and persists it to the database.`,
    PUT: (r) =>
      `Fully replace an existing ${r} record. All required fields must be provided in the request body.`,
    PATCH: (r) =>
      `Partially update an existing ${r} record. Only the provided fields will be updated; omitted fields retain their current values.`,
    DELETE: (r) =>
      `Permanently delete a ${r} record by its unique identifier. This action is irreversible.`,
  };

  const template = templates[endpoint.method];
  return template
    ? template(resourceCap, isById)
    : `${endpoint.method} operation on ${resourceCap} resource.`;
}

/* ─── Request Body Suggester ─── */

function suggestRequestBody(
  endpoint: ASTEndpoint,
  schemas: ASTSchema[]
): Array<{ name: string; type: string; required: boolean; description: string }> {
  const resource = extractResource(endpoint.path);

  // Try to find a linked schema for field suggestions
  const linkedSchema = schemas.find((s) =>
    endpoint.linkedSchemas.includes(s.id) ||
    s.tableName.toLowerCase().includes(resource.toLowerCase()) ||
    resource.toLowerCase().includes(s.tableName.toLowerCase())
  );

  if (linkedSchema) {
    return linkedSchema.properties
      .filter((p) => !p.primaryKey && p.name !== 'created_at' && p.name !== 'updated_at')
      .map((p) => ({
        name: p.name,
        type: p.type,
        required: !p.nullable,
        description: p.unique ? `Unique ${p.name}` : `The ${p.name.replace(/_/g, ' ')}`,
      }));
  }

  // Generic fallback based on method + resource
  const genericFields: Record<string, Array<{ name: string; type: string; required: boolean; description: string }>> = {
    POST: [
      { name: 'name', type: 'string', required: true, description: `Name of the ${resource}` },
      { name: 'description', type: 'string', required: false, description: `Optional description` },
      { name: 'status', type: 'string', required: false, description: 'Status (active | inactive)' },
    ],
    PUT: [
      { name: 'name', type: 'string', required: true, description: `Updated name of the ${resource}` },
      { name: 'description', type: 'string', required: false, description: `Updated description` },
    ],
    PATCH: [
      { name: 'status', type: 'string', required: false, description: 'New status value' },
    ],
  };

  return genericFields[endpoint.method] || [];
}

/* ─── Test Generator ─── */

interface GeneratedTest {
  name: string;
  method: string;
  path: string;
  description: string;
  scenarios: Array<{
    name: string;
    statusCode: number;
    description: string;
    assertions: string[];
  }>;
}

function generateTests(endpoints: ASTEndpoint[]): GeneratedTest[] {
  return endpoints.map((endpoint) => {
    const resource = extractResource(endpoint.path);
    const scenarios = endpoint.statusCodes.map((code) => {
      const scenarioMap: Record<number, { name: string; description: string; assertions: string[] }> = {
        200: {
          name: 'Success',
          description: `${endpoint.method} ${endpoint.path} returns 200 with valid data`,
          assertions: [
            'Response status is 200',
            'Response body is JSON',
            ...(isListEndpoint(endpoint.method, endpoint.path)
              ? ['Response contains data array', 'Response contains total count']
              : [`Response contains ${resource} object`, 'Response has required fields']),
          ],
        },
        201: {
          name: 'Created',
          description: `${endpoint.method} ${endpoint.path} creates and returns new resource`,
          assertions: ['Response status is 201', 'Created object is returned', 'Object has a generated id'],
        },
        400: {
          name: 'Bad Request',
          description: 'Returns 400 when request body is invalid or missing required fields',
          assertions: ['Response status is 400', 'Error message is present', 'Validation errors are listed'],
        },
        401: {
          name: 'Unauthorized',
          description: 'Returns 401 when Authorization header is missing or invalid',
          assertions: ['Response status is 401', 'Error message indicates auth failure'],
        },
        403: {
          name: 'Forbidden',
          description: 'Returns 403 when user lacks required permissions',
          assertions: ['Response status is 403', 'Error message indicates insufficient permissions'],
        },
        404: {
          name: 'Not Found',
          description: `Returns 404 when ${resource} with given ID does not exist`,
          assertions: ['Response status is 404', 'Error message is descriptive'],
        },
        409: {
          name: 'Conflict',
          description: 'Returns 409 when a duplicate resource would be created',
          assertions: ['Response status is 409', 'Conflict reason is explained'],
        },
        500: {
          name: 'Server Error',
          description: 'Returns 500 on unexpected server failures',
          assertions: ['Response status is 500', 'Generic error message is returned'],
        },
      };
      return {
        name: scenarioMap[code]?.name || `Status ${code}`,
        statusCode: code,
        description: scenarioMap[code]?.description || `Returns ${code}`,
        assertions: scenarioMap[code]?.assertions || [`Response status is ${code}`],
      };
    });

    return {
      name: `${endpoint.method} ${endpoint.path}`,
      method: endpoint.method,
      path: endpoint.path,
      description: endpoint.description || generateDescription(endpoint),
      scenarios,
    };
  });
}

/* ─── OpenAI integration ─── */

async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  // Dynamic import so it doesn't crash if openai isn't installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content || '';
}

/* ─── AI Service Exports ─── */

export type AIAction = 'describe' | 'suggest-body' | 'generate-tests' | 'detect-issues';

export interface AIRequest {
  action: AIAction;
  ast: ApiForgeAST;
  targetEndpointId?: string;
}

export interface AIResponse {
  action: AIAction;
  result: unknown;
  usedAI: boolean;
  model?: string;
}

export async function runAI(request: AIRequest): Promise<AIResponse> {
  const { action, ast, targetEndpointId } = request;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  const targetEndpoint = targetEndpointId
    ? ast.endpoints.find((e) => e.id === targetEndpointId)
    : undefined;

  switch (action) {
    case 'describe': {
      if (hasOpenAI) {
        try {
          const endpointsText = ast.endpoints.map(
            (e) => `${e.method} ${e.path} (${e.label})`
          ).join('\n');
          const result = await callOpenAI(
            `Generate concise, professional API endpoint descriptions for the following endpoints:\n${endpointsText}\n\nReturn a JSON object mapping each path to its description.`,
            'You are an API documentation expert. Return only valid JSON, no markdown.'
          );
          return { action, result: JSON.parse(result), usedAI: true, model: 'gpt-4o-mini' };
        } catch {
          // Fallback to template
        }
      }
      // Template-based fallback
      const descriptions = Object.fromEntries(
        ast.endpoints.map((e) => [e.id, generateDescription(e)])
      );
      return { action, result: descriptions, usedAI: false };
    }

    case 'suggest-body': {
      if (!targetEndpoint) {
        return { action, result: [], usedAI: false };
      }
      if (hasOpenAI) {
        try {
          const schemaContext = ast.schemas.map(
            (s) => `${s.name}: ${s.properties.map((p) => `${p.name}(${p.type})`).join(', ')}`
          ).join('\n');
          const result = await callOpenAI(
            `For a ${targetEndpoint.method} ${targetEndpoint.path} endpoint, suggest a request body schema.\nAvailable schemas:\n${schemaContext}\nReturn JSON array of { name, type, required, description } fields.`,
            'You are an API design expert. Return only a valid JSON array, no markdown.'
          );
          return { action, result: JSON.parse(result), usedAI: true, model: 'gpt-4o-mini' };
        } catch {
          // Fallback
        }
      }
      const suggested = suggestRequestBody(targetEndpoint, ast.schemas);
      return { action, result: suggested, usedAI: false };
    }

    case 'generate-tests': {
      if (hasOpenAI) {
        try {
          const specSummary = ast.endpoints.map(
            (e) => `${e.method} ${e.path} → ${e.statusCodes.join(', ')}`
          ).join('\n');
          const result = await callOpenAI(
            `Generate test cases for these API endpoints:\n${specSummary}\n\nReturn a JSON array of test suites with scenarios and assertions.`,
            'You are a senior QA engineer. Return only valid JSON, no markdown fences.'
          );
          return { action, result: JSON.parse(result), usedAI: true, model: 'gpt-4o-mini' };
        } catch {
          // Fallback
        }
      }
      const tests = generateTests(ast.endpoints);
      return { action, result: tests, usedAI: false };
    }

    case 'detect-issues': {
      // Static analysis — always runs without AI
      const issues: Array<{ severity: 'error' | 'warning' | 'info'; message: string; endpointId?: string }> = [];

      for (const ep of ast.endpoints) {
        if (!ep.description) {
          issues.push({ severity: 'warning', message: `${ep.method} ${ep.path} has no description`, endpointId: ep.id });
        }
        if (['POST', 'PUT', 'PATCH'].includes(ep.method) && !ep.requestBody) {
          issues.push({ severity: 'warning', message: `${ep.method} ${ep.path} has no request body defined`, endpointId: ep.id });
        }
        if (!ep.statusCodes.some((c) => c >= 400)) {
          issues.push({ severity: 'info', message: `${ep.method} ${ep.path} has no error status codes defined`, endpointId: ep.id });
        }
        if (ep.path.includes('{') && !ep.statusCodes.includes(404)) {
          issues.push({ severity: 'warning', message: `${ep.method} ${ep.path} uses path param but 404 is not defined`, endpointId: ep.id });
        }
        if (ep.security.length === 0 && !ep.path.includes('public') && !ep.path.includes('health')) {
          issues.push({ severity: 'info', message: `${ep.method} ${ep.path} has no security scheme attached`, endpointId: ep.id });
        }
      }

      if (ast.endpoints.length === 0) {
        issues.push({ severity: 'error', message: 'No endpoints defined in the API' });
      }

      if (hasOpenAI && issues.length > 0) {
        try {
          const issueList = issues.map((i) => `[${i.severity}] ${i.message}`).join('\n');
          const result = await callOpenAI(
            `Review these API design issues and suggest fixes:\n${issueList}\nReturn a JSON array with { issue, suggestion } objects.`,
            'You are an API design expert. Return only valid JSON array.'
          );
          return { action, result: { staticIssues: issues, aiSuggestions: JSON.parse(result) }, usedAI: true };
        } catch {
          // Fallback
        }
      }

      return { action, result: { staticIssues: issues, aiSuggestions: [] }, usedAI: false };
    }

    default:
      return { action, result: null, usedAI: false };
  }
}
