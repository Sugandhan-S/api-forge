import type { ApiForgeAST, ASTEndpoint, ASTSchema, ASTSecurityScheme } from './ast.types';

/* ─── Helpers ─── */

function badge(method: string): string {
  const map: Record<string, string> = {
    GET: '🟢', POST: '🔵', PUT: '🟡', PATCH: '🟠', DELETE: '🔴',
  };
  return map[method] || '⚪';
}

function codeBlock(code: string, lang = 'json'): string {
  return `\`\`\`${lang}\n${code}\n\`\`\``;
}

function heading(level: number, text: string): string {
  return `${'#'.repeat(level)} ${text}`;
}

function table(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const divRow = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataRows = rows.map((r) => `| ${r.join(' | ')} |`);
  return [headerRow, divRow, ...dataRows].join('\n');
}

function codeInline(s: string): string {
  return `\`${s}\``;
}

/* ─── Status code table ─── */

const STATUS_DESCRIPTIONS: Record<number, string> = {
  200: 'OK', 201: 'Created', 204: 'No Content',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 409: 'Conflict', 422: 'Unprocessable Entity', 500: 'Internal Server Error',
};

/* ─── Endpoint documentation ─── */

function documentEndpoint(ep: ASTEndpoint, schemas: ASTSchema[], securitySchemes: ASTSecurityScheme[]): string {
  const lines: string[] = [];

  lines.push(heading(3, `${badge(ep.method)} \`${ep.method}\` ${ep.path}`));
  lines.push('');

  if (ep.description) {
    lines.push(`> ${ep.description}`);
    lines.push('');
  }

  // Security
  if (ep.security.length > 0) {
    const schemeNames = ep.security
      .map((id) => securitySchemes.find((s) => s.id === id)?.name)
      .filter(Boolean);
    lines.push(`**Security:** ${schemeNames.map(codeInline).join(', ')}`);
    lines.push('');
  }

  // Path parameters
  const pathParams = ep.path.match(/\{(\w+)\}/g);
  if (pathParams && pathParams.length > 0) {
    lines.push(heading(4, 'Path Parameters'));
    lines.push('');
    lines.push(table(
      ['Parameter', 'Type', 'Required', 'Description'],
      pathParams.map((p) => {
        const name = p.slice(1, -1);
        return [codeInline(name), 'string', '✅', `Unique identifier of the ${name}`];
      })
    ));
    lines.push('');
  }

  // Custom headers
  if (ep.headers.length > 0) {
    lines.push(heading(4, 'Request Headers'));
    lines.push('');
    lines.push(table(
      ['Header', 'Value', 'Required'],
      ep.headers.map((h) => [
        codeInline(h.key),
        h.value ? codeInline(h.value) : '_any_',
        h.required ? '✅' : '—',
      ])
    ));
    lines.push('');
  }

  // Request body
  if (ep.requestBody && ep.requestBody.fields.length > 0) {
    lines.push(heading(4, 'Request Body'));
    lines.push('');
    lines.push(`Content-Type: ${codeInline(ep.requestBody.contentType)}`);
    lines.push('');
    lines.push(table(
      ['Field', 'Type', 'Required', 'Description'],
      ep.requestBody.fields.map((f) => [
        codeInline(f.name),
        codeInline(f.type),
        f.required ? '✅' : '—',
        f.description || '',
      ])
    ));
    lines.push('');

    // Example body
    const exampleBody: Record<string, unknown> = {};
    for (const f of ep.requestBody.fields) {
      switch (f.type) {
        case 'number': exampleBody[f.name] = 0; break;
        case 'boolean': exampleBody[f.name] = false; break;
        case 'array': exampleBody[f.name] = []; break;
        default: exampleBody[f.name] = `string`;
      }
    }
    lines.push(heading(4, 'Example Request'));
    lines.push('');
    lines.push(codeBlock(
      `curl -X ${ep.method} https://api.example.com${ep.path} \\\n` +
      `  -H "Content-Type: application/json" \\\n` +
      (ep.security.length > 0 ? `  -H "Authorization: Bearer <token>" \\\n` : '') +
      `  -d '${JSON.stringify(exampleBody, null, 2)}'`,
      'bash'
    ));
    lines.push('');
  }

  // Responses
  lines.push(heading(4, 'Responses'));
  lines.push('');
  lines.push(table(
    ['Status', 'Description'],
    ep.statusCodes.map((code) => [
      codeInline(String(code)),
      STATUS_DESCRIPTIONS[code] || `HTTP ${code}`,
    ])
  ));
  lines.push('');

  // Linked schema reference
  if (ep.linkedSchemas.length > 0) {
    const schemaNames = ep.linkedSchemas
      .map((id) => schemas.find((s) => s.id === id)?.name)
      .filter(Boolean);
    if (schemaNames.length > 0) {
      lines.push(`**Response Schema:** See [${schemaNames.join(', ')}](#schemas) section below.`);
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/* ─── Schema documentation ─── */

function documentSchema(schema: ASTSchema): string {
  const lines: string[] = [];

  lines.push(heading(3, schema.name));
  lines.push('');
  lines.push(`Database table: ${codeInline(schema.tableName)}`);
  lines.push('');

  if (schema.properties.length > 0) {
    lines.push(table(
      ['Property', 'Type', 'Format', 'Constraints'],
      schema.properties.map((p) => {
        const constraints: string[] = [];
        if (p.primaryKey) constraints.push('🔑 PK');
        if (p.unique) constraints.push('unique');
        if (!p.nullable) constraints.push('not null');
        return [
          codeInline(p.name),
          codeInline(p.type),
          p.format ? codeInline(p.format) : '—',
          constraints.join(', ') || '—',
        ];
      })
    ));

    // JSON example
    const example: Record<string, unknown> = {};
    for (const p of schema.properties) {
      if (p.format === 'uuid') example[p.name] = '550e8400-e29b-41d4-a716-446655440000';
      else if (p.format === 'date-time') example[p.name] = '2024-01-15T10:30:00Z';
      else if (p.type === 'integer') example[p.name] = 1;
      else if (p.type === 'boolean') example[p.name] = true;
      else example[p.name] = `example_${p.name}`;
    }
    lines.push('');
    lines.push(codeBlock(JSON.stringify({ [schema.tableName]: example }, null, 2)));
  }

  lines.push('');

  return lines.join('\n');
}

/* ─── Security docs ─── */

function documentSecurity(scheme: ASTSecurityScheme): string {
  const lines: string[] = [];

  lines.push(heading(3, scheme.label));
  lines.push('');

  const providerMap: Record<string, string> = {
    jwt: 'JWT Bearer Token',
    oauth2: 'OAuth 2.0',
    'api-key': 'API Key',
    basic: 'HTTP Basic Auth',
  };

  lines.push(`**Type:** ${providerMap[scheme.provider] || scheme.provider}`);
  lines.push('');

  if (scheme.provider === 'jwt') {
    lines.push(codeBlock('Authorization: Bearer <your-jwt-token>', 'http'));
  } else if (scheme.provider === 'api-key') {
    lines.push(codeBlock(`${scheme.headerName || 'X-API-Key'}: <your-api-key>`, 'http'));
  } else if (scheme.provider === 'basic') {
    lines.push(codeBlock('Authorization: Basic <base64(username:password)>', 'http'));
  } else if (scheme.provider === 'oauth2' && scheme.tokenUrl) {
    lines.push(`Token URL: ${codeInline(scheme.tokenUrl)}`);
    lines.push('');
    if (scheme.scopes.length > 0) {
      lines.push(`Scopes: ${scheme.scopes.map(codeInline).join(', ')}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

/* ─── Main Generator ─── */

export function generateMarkdownDocs(ast: ApiForgeAST): string {
  const now = new Date(ast.meta.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const lines: string[] = [];

  // Title
  lines.push(heading(1, ast.meta.title));
  lines.push('');
  lines.push(`> ${ast.meta.description}`);
  lines.push('');
  lines.push(`**Version:** ${ast.meta.version} | **Generated:** ${now}`);
  lines.push('');

  // Table of contents
  lines.push(heading(2, 'Table of Contents'));
  lines.push('');
  lines.push('- [Endpoints](#endpoints)');
  if (ast.schemas.length > 0) lines.push('- [Schemas](#schemas)');
  if (ast.securitySchemes.length > 0) lines.push('- [Authentication](#authentication)');
  lines.push('');

  // Endpoints
  lines.push(heading(2, 'Endpoints'));
  lines.push('');

  if (ast.endpoints.length === 0) {
    lines.push('_No endpoints defined._');
  } else {
    // Quick reference table
    lines.push(table(
      ['Method', 'Path', 'Description'],
      ast.endpoints.map((ep) => [
        `${badge(ep.method)} **${ep.method}**`,
        codeInline(ep.path),
        ep.description?.slice(0, 80) || ep.label,
      ])
    ));
    lines.push('');
    lines.push('---');
    lines.push('');

    // Detailed docs per endpoint
    for (const ep of ast.endpoints) {
      lines.push(documentEndpoint(ep, ast.schemas, ast.securitySchemes));
    }
  }

  // Schemas
  if (ast.schemas.length > 0) {
    lines.push(heading(2, 'Schemas'));
    lines.push('');
    for (const schema of ast.schemas) {
      lines.push(documentSchema(schema));
    }
  }

  // Authentication
  if (ast.securitySchemes.length > 0) {
    lines.push(heading(2, 'Authentication'));
    lines.push('');
    for (const scheme of ast.securitySchemes) {
      lines.push(documentSecurity(scheme));
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`_Generated by [APIForge](https://github.com/apiforge) on ${now}_`);
  lines.push('');

  return lines.join('\n');
}
