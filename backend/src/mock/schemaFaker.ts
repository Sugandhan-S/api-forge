import { v4 as uuidv4 } from 'uuid';

/* ─── OpenAPI SchemaObject (minimal subset) ─── */

export interface OpenAPISchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchemaObject>;
  required?: string[];
  nullable?: boolean;
  description?: string;
  items?: OpenAPISchemaObject;
  default?: unknown;
  $ref?: string;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  example?: unknown;
}

export type ComponentsSchemas = Record<string, OpenAPISchemaObject>;

/* ─── Name-based value heuristics ─── */

const NAME_HINTS: Record<string, () => unknown> = {
  id:           () => uuidv4(),
  uuid:         () => uuidv4(),
  email:        () => pickRandom(['alice', 'bob', 'carol', 'dave', 'eve']) + '@example.com',
  name:         () => pickRandom(['Alice Johnson', 'Bob Smith', 'Carol White', 'Dave Brown']),
  username:     () => pickRandom(['alice', 'bob', 'carol', 'dave']) + Math.floor(Math.random() * 100),
  first_name:   () => pickRandom(['Alice', 'Bob', 'Carol', 'Dave', 'Eve']),
  last_name:    () => pickRandom(['Johnson', 'Smith', 'White', 'Brown', 'Davis']),
  title:        () => pickRandom(['Product Manager', 'Software Engineer', 'Designer', 'Analyst']),
  description:  () => 'Mock description for testing purposes.',
  url:          () => `https://example.com/${randHex(8)}`,
  image:        () => `https://picsum.photos/seed/${randHex(4)}/200/200`,
  avatar:       () => `https://picsum.photos/seed/${randHex(4)}/64/64`,
  phone:        () => `+1-${randInt(200, 999)}-${randInt(100, 999)}-${randInt(1000, 9999)}`,
  address:      () => `${randInt(1, 999)} Main St, Springfield, IL`,
  city:         () => pickRandom(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
  country:      () => pickRandom(['US', 'UK', 'CA', 'AU', 'DE']),
  status:       () => pickRandom(['active', 'inactive', 'pending']),
  role:         () => pickRandom(['admin', 'user', 'moderator', 'viewer']),
  type:         () => pickRandom(['standard', 'premium', 'enterprise']),
  color:        () => pickRandom(['red', 'green', 'blue', 'purple', 'orange']),
  currency:     () => pickRandom(['USD', 'EUR', 'GBP', 'JPY']),
  price:        () => parseFloat((Math.random() * 999 + 1).toFixed(2)),
  amount:       () => parseFloat((Math.random() * 9999 + 1).toFixed(2)),
  quantity:     () => randInt(1, 100),
  count:        () => randInt(0, 1000),
  total:        () => randInt(0, 10000),
  page:         () => 1,
  limit:        () => 20,
  version:      () => `${randInt(1, 3)}.${randInt(0, 9)}.${randInt(0, 20)}`,
  token:        () => randHex(32),
  secret:       () => '***REDACTED***',
  password:     () => '***REDACTED***',
  hash:         () => randHex(64),
  message:      () => pickRandom(['Success', 'Operation completed', 'Record updated']),
  error:        () => pickRandom(['Invalid input', 'Not found', 'Unauthorized']),
  code:         () => randHex(8).toUpperCase(),
  tag:          () => pickRandom(['featured', 'new', 'sale', 'popular']),
  category:     () => pickRandom(['electronics', 'clothing', 'food', 'books', 'sports']),
  label:        () => pickRandom(['Primary', 'Secondary', 'Tertiary']),
  slug:         () => `mock-item-${randHex(4)}`,
  key:          () => `key_${randHex(8)}`,
  value:        () => `value_${randHex(4)}`,
};

/* ─── Format-based fakers ─── */

function fakeByFormat(format: string): unknown {
  switch (format) {
    case 'uuid':        return uuidv4();
    case 'date-time':   return new Date(Date.now() - randInt(0, 1e10)).toISOString();
    case 'date':        return new Date(Date.now() - randInt(0, 1e10)).toISOString().split('T')[0];
    case 'time':        return `${padZ(randInt(0, 23))}:${padZ(randInt(0, 59))}:${padZ(randInt(0, 59))}`;
    case 'email':       return `user${randInt(1, 999)}@example.com`;
    case 'uri':
    case 'url':         return `https://example.com/${randHex(8)}`;
    case 'hostname':    return `host-${randHex(4)}.example.com`;
    case 'ipv4':        return `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
    case 'binary':
    case 'byte':        return Buffer.from('mock-data').toString('base64');
    case 'password':    return '***REDACTED***';
    case 'int32':
    case 'int64':       return randInt(1, 999999);
    case 'float':
    case 'double':      return parseFloat((Math.random() * 1000).toFixed(4));
    default:            return `mock-${randHex(4)}`;
  }
}

/* ─── Small utilities ─── */

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randHex(len: number): string {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function padZ(n: number): string {
  return n.toString().padStart(2, '0');
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ─── $ref Resolution ─── */

function resolveRef(ref: string, schemas: ComponentsSchemas): OpenAPISchemaObject | null {
  const match = ref.match(/^#\/components\/schemas\/(.+)$/);
  if (!match) return null;
  return schemas[match[1]] || null;
}

function dereferenceSchema(
  schema: OpenAPISchemaObject,
  schemas: ComponentsSchemas,
  depth = 0
): OpenAPISchemaObject {
  if (depth > 8) return { type: 'object' };

  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, schemas);
    if (!resolved) return { type: 'object' };
    return dereferenceSchema(resolved, schemas, depth + 1);
  }

  if (schema.type === 'object' && schema.properties) {
    const props: Record<string, OpenAPISchemaObject> = {};
    for (const [k, v] of Object.entries(schema.properties)) {
      props[k] = dereferenceSchema(v, schemas, depth + 1);
    }
    return { ...schema, properties: props };
  }

  if (schema.type === 'array' && schema.items) {
    return { ...schema, items: dereferenceSchema(schema.items, schemas, depth + 1) };
  }

  return schema;
}

/* ─── Core value generator ─── */

function fakeValue(schema: OpenAPISchemaObject, fieldName = '', schemas: ComponentsSchemas = {}): unknown {
  // Use example value if provided
  if (schema.example !== undefined) return schema.example;

  // Use default value if provided
  if (schema.default !== undefined) return schema.default;

  // Enums
  if (schema.enum && schema.enum.length > 0) {
    return pickRandom(schema.enum);
  }

  // Name-based hints (highest specificity)
  const lowerName = fieldName.toLowerCase().replace(/[-\s]/g, '_');
  for (const [hint, fn] of Object.entries(NAME_HINTS)) {
    if (lowerName === hint || lowerName.endsWith(`_${hint}`) || lowerName.startsWith(`${hint}_`)) {
      return fn();
    }
  }

  const type = schema.type || 'string';
  const format = schema.format || '';

  switch (type) {
    case 'string': {
      if (format) return fakeByFormat(format);
      const minLen = schema.minLength || 4;
      const maxLen = schema.maxLength || 16;
      return `mock-${randHex(Math.min(randInt(minLen, maxLen), 12))}`;
    }

    case 'integer':
    case 'number': {
      if (format) {
        const v = fakeByFormat(format);
        if (typeof v === 'number') return v;
      }
      const min = schema.minimum ?? (type === 'integer' ? 1 : 0.1);
      const max = schema.maximum ?? (type === 'integer' ? 9999 : 9999.99);
      if (type === 'integer') return randInt(min as number, max as number);
      return parseFloat((Math.random() * ((max as number) - (min as number)) + (min as number)).toFixed(2));
    }

    case 'boolean':
      return Math.random() > 0.5;

    case 'array': {
      const itemSchema = schema.items
        ? dereferenceSchema(schema.items, schemas)
        : { type: 'string' as const };
      const count = randInt(1, 4);
      return Array.from({ length: count }, () => fakeValue(itemSchema, fieldName, schemas));
    }

    case 'object': {
      if (!schema.properties) return { _mock: true };
      const obj: Record<string, unknown> = {};
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        obj[key] = fakeValue(propSchema, key, schemas);
      }
      return obj;
    }

    case 'null':
      return null;

    default:
      return `mock-${type}`;
  }
}

/* ─── Public API ─── */

/**
 * Generate a fake response value for an OpenAPI schema.
 *
 * Handles:
 *  - $ref resolution
 *  - Pagination wrapper (object with data[] + total/page/limit)
 *  - All primitive types and formats
 *  - Name-based heuristics (email, uuid, created_at, etc.)
 */
export function fakeFromSchema(
  schema: OpenAPISchemaObject,
  schemas: ComponentsSchemas = {},
  count = 1
): unknown {
  const deref = dereferenceSchema(schema, schemas);

  // Detect pagination wrapper (data array + total/page/limit)
  if (
    deref.type === 'object' &&
    deref.properties?.data?.type === 'array'
  ) {
    const itemSchema = deref.properties.data.items
      ? dereferenceSchema(deref.properties.data.items, schemas)
      : { type: 'object' };
    const items = Array.from({ length: count }, () => fakeValue(itemSchema, '', schemas));
    return {
      data: items,
      total: count * 3 + randInt(0, 50),
      page: 1,
      limit: count,
    };
  }

  return fakeValue(deref, '', schemas);
}
