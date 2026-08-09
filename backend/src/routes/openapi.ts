import { Router } from 'express';
import yaml from 'js-yaml';

const router = Router();

/**
 * POST /api/openapi/generate
 *
 * Accepts a canvas state (nodes + edges) and returns an OpenAPI spec.
 * In Phase 3, the heavy lifting is done client-side. This route exists
 * for server-side validation and future server-rendered generation.
 */
router.post('/generate', (req, res) => {
  try {
    const { spec, format = 'json' } = req.body;

    if (!spec) {
      res.status(400).json({ error: 'Missing "spec" in request body' });
      return;
    }

    // Validate it looks like an OpenAPI spec
    if (!spec.openapi || !spec.info || !spec.paths) {
      res.status(400).json({
        error: 'Invalid OpenAPI spec: missing required fields (openapi, info, paths)',
      });
      return;
    }

    if (format === 'yaml') {
      const yamlOutput = yaml.dump(spec, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });
      res.type('text/yaml').send(yamlOutput);
    } else {
      res.json(spec);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: `Failed to process spec: ${message}` });
  }
});

/**
 * POST /api/openapi/validate
 *
 * Accepts an OpenAPI spec and runs basic structural validation.
 */
router.post('/validate', (req, res) => {
  try {
    const { spec } = req.body;

    if (!spec) {
      res.status(400).json({ valid: false, error: 'No spec provided' });
      return;
    }

    const issues: string[] = [];

    // Check required fields
    if (!spec.openapi) issues.push('Missing "openapi" version field');
    if (!spec.info?.title) issues.push('Missing "info.title"');
    if (!spec.info?.version) issues.push('Missing "info.version"');
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      issues.push('No paths defined');
    }

    // Check path structure
    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        if (!path.startsWith('/')) {
          issues.push(`Path "${path}" must start with /`);
        }
        const methodObj = methods as Record<string, unknown>;
        for (const method of Object.keys(methodObj)) {
          const validMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
          if (!validMethods.includes(method)) {
            issues.push(`Invalid HTTP method "${method}" on path "${path}"`);
          }
        }
      }
    }

    // Check $ref resolution
    if (spec.paths) {
      const schemaNames = new Set(Object.keys(spec.components?.schemas || {}));
      const specStr = JSON.stringify(spec);
      const refMatches = specStr.match(/#\/components\/schemas\/(\w+)/g) || [];
      for (const ref of refMatches) {
        const schemaName = ref.replace('#/components/schemas/', '');
        if (!schemaNames.has(schemaName)) {
          issues.push(`Unresolved $ref: ${ref}`);
        }
      }
    }

    res.json({
      valid: issues.length === 0,
      issues,
      stats: {
        paths: Object.keys(spec.paths || {}).length,
        operations: Object.values(spec.paths || {}).reduce(
          (sum: number, methods: unknown) => sum + Object.keys(methods as object).length,
          0
        ),
        schemas: Object.keys(spec.components?.schemas || {}).length,
        securitySchemes: Object.keys(spec.components?.securitySchemes || {}).length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ valid: false, error: message });
  }
});

export default router;
