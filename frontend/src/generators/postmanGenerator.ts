import type { ApiForgeAST, ASTEndpoint, ASTSecurityScheme } from './ast.types';

/* ─── Postman Collection v2.1 types ─── */

interface PostmanInfo {
  name: string;
  description?: string;
  schema: string;
  version?: string;
}

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
}

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
}

interface PostmanBody {
  mode: 'raw' | 'formdata' | 'urlencoded' | 'none';
  raw?: string;
  options?: { raw: { language: string } };
}

interface PostmanRequest {
  method: string;
  header: PostmanHeader[];
  body?: PostmanBody;
  url: {
    raw: string;
    protocol: string;
    host: string[];
    path: string[];
    variable?: Array<{ key: string; value: string; description?: string }>;
    query?: Array<{ key: string; value: string; disabled?: boolean }>;
  };
  description?: string;
  auth?: { type: string; bearer?: Array<{ key: string; value: string }> };
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[];
  description?: string;
  event?: unknown[];
}

interface PostmanCollection {
  info: PostmanInfo;
  item: PostmanItem[];
  variable: PostmanVariable[];
  auth?: { type: string };
}

/* ─── Helpers ─── */

function toPathSegments(path: string): string[] {
  return path.split('/').filter(Boolean).map((s) =>
    s.startsWith('{') ? `:${s.slice(1, -1)}` : s
  );
}

function buildSampleBody(endpoint: ASTEndpoint): string {
  if (!endpoint.requestBody || endpoint.requestBody.fields.length === 0) return '';

  const obj: Record<string, unknown> = {};
  for (const field of endpoint.requestBody.fields) {
    switch (field.type) {
      case 'number': obj[field.name] = 0; break;
      case 'boolean': obj[field.name] = false; break;
      case 'array': obj[field.name] = []; break;
      case 'object': obj[field.name] = {}; break;
      default: obj[field.name] = `{{${field.name}}}`;
    }
  }
  return JSON.stringify(obj, null, 2);
}

function buildHeaders(endpoint: ASTEndpoint, schemes: ASTSecurityScheme[]): PostmanHeader[] {
  const headers: PostmanHeader[] = [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Accept', value: 'application/json' },
  ];

  // Add security headers
  for (const secId of endpoint.security) {
    const scheme = schemes.find((s) => s.id === secId);
    if (scheme?.provider === 'jwt') {
      headers.push({ key: 'Authorization', value: 'Bearer {{access_token}}' });
    } else if (scheme?.provider === 'api-key') {
      headers.push({ key: scheme.headerName || 'X-API-Key', value: '{{api_key}}' });
    } else if (scheme?.provider === 'basic') {
      headers.push({ key: 'Authorization', value: 'Basic {{basic_credentials}}' });
    }
  }

  // Custom headers
  for (const h of endpoint.headers) {
    headers.push({ key: h.key, value: h.value || `{{${h.key.toLowerCase().replace(/-/g, '_')}}}` });
  }

  return headers;
}

function buildPathVariables(path: string): Array<{ key: string; value: string; description?: string }> {
  const matches = path.match(/\{(\w+)\}/g) || [];
  return matches.map((m) => {
    const key = m.slice(1, -1);
    return { key, value: `{{${key}}}`, description: `Path parameter: ${key}` };
  });
}

function buildRequest(endpoint: ASTEndpoint, _baseUrl: string, schemes: ASTSecurityScheme[]): PostmanRequest {
  const segments = toPathSegments(endpoint.path);
  const pathVars = buildPathVariables(endpoint.path);
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(endpoint.method);
  const rawBody = hasBody ? buildSampleBody(endpoint) : undefined;

  const request: PostmanRequest = {
    method: endpoint.method,
    header: buildHeaders(endpoint, schemes),
    url: {
      raw: `{{base_url}}${endpoint.path}`,
      protocol: 'https',
      host: ['{{base_url}}'],
      path: segments,
      ...(pathVars.length > 0 ? { variable: pathVars } : {}),
    },
    description: endpoint.description,
  };

  if (hasBody && rawBody) {
    request.body = {
      mode: 'raw',
      raw: rawBody,
      options: { raw: { language: 'json' } },
    };
  }

  return request;
}

/* ─── Test scripts ─── */

function buildTestScript(endpoint: ASTEndpoint): unknown[] {
  const successCodes = endpoint.statusCodes.filter((c) => c >= 200 && c < 300);
  if (successCodes.length === 0) return [];

  const code = successCodes[0];
  const script = `
pm.test("Status code is ${code}", function () {
    pm.response.to.have.status(${code});
});

pm.test("Response is JSON", function () {
    pm.response.to.be.json;
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
`.trim();

  return [
    {
      listen: 'test',
      script: { type: 'text/javascript', exec: script.split('\n') },
    },
  ];
}

/* ─── Group by tag ─── */

function groupByTag(
  endpoints: ASTEndpoint[],
  baseUrl: string,
  schemes: ASTSecurityScheme[]
): PostmanItem[] {
  const tagMap = new Map<string, PostmanItem[]>();

  for (const endpoint of endpoints) {
    const tag = endpoint.tags[0] || endpoint.path.split('/').find((s) => s && !['api', 'v1', 'v2'].includes(s)) || 'Default';
    const items = tagMap.get(tag) || [];

    const item: PostmanItem = {
      name: endpoint.label || `${endpoint.method} ${endpoint.path}`,
      request: buildRequest(endpoint, baseUrl, schemes),
      event: buildTestScript(endpoint),
    };

    items.push(item);
    tagMap.set(tag, items);
  }

  return Array.from(tagMap.entries()).map(([name, items]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    item: items,
    description: `Operations related to ${name}`,
  }));
}

/* ─── Main Generator ─── */

export function generatePostmanCollection(
  ast: ApiForgeAST,
  baseUrl = 'http://localhost:3001'
): PostmanCollection {
  const collection: PostmanCollection = {
    info: {
      name: ast.meta.title,
      description: ast.meta.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: ast.meta.version,
    },
    item: groupByTag(ast.endpoints, baseUrl, ast.securitySchemes),
    variable: [
      { key: 'base_url', value: baseUrl, type: 'string' },
      { key: 'access_token', value: '', type: 'string' },
      { key: 'api_key', value: '', type: 'string' },
    ],
  };

  // Add auth variables for each security scheme
  for (const scheme of ast.securitySchemes) {
    if (scheme.provider === 'basic') {
      collection.variable.push({ key: 'basic_credentials', value: '', type: 'string' });
    }
  }

  return collection;
}

export function postmanToJSON(collection: PostmanCollection): string {
  return JSON.stringify(collection, null, 2);
}
