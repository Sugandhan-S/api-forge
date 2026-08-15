import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

/* ─── Escape Helpers ─── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/<\/script>/gi, '<\\/script>');
}

/* ─── Swagger UI HTML ─── */

function getSwaggerHTML(specUrl: string, title: string): string {
  const escapedTitle = escapeHtml(title);
  const escapedSpecUrl = escapeJsString(specUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle} — API Docs</title>
  <link rel="stylesheet" href="/docs/swagger-ui.css" />
  <style>
    body { margin: 0; background: #0a0b0f; }
    .swagger-ui .topbar { background: #12131a; border-bottom: 1px solid #1e2030; }
    .swagger-ui .topbar-wrapper img { display: none; }
    .swagger-ui .topbar-wrapper::after {
      content: '⚡ APIForge Docs';
      color: #e4e5f1;
      font-size: 1.1rem;
      font-weight: 700;
    }
    .swagger-ui { background: #12131a; }
    .swagger-ui .info { background: #0a0b0f; border-radius: 12px; padding: 1.5rem; border: 1px solid #1e2030; }
    .swagger-ui .info .title { color: #e4e5f1; }
    .swagger-ui .info .description { color: #6e7191; }
    .swagger-ui .scheme-container { background: #12131a; border: 1px solid #1e2030; }
    .swagger-ui section.models { background: #0a0b0f; border: 1px solid #1e2030; border-radius: 8px; }
    .swagger-ui .opblock { border-radius: 8px; margin: 8px 0; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs/swagger-ui-bundle.js"></script>
  <script src="/docs/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${escapedSpecUrl}",
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'StandaloneLayout',
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true,
      });
    };
  </script>
</body>
</html>`;
}

/* ─── Serve Swagger UI static assets ─── */

let swaggerUiDist: string | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  swaggerUiDist = require('swagger-ui-dist').absolutePath();
} catch {
  console.warn('[Docs] swagger-ui-dist not found — /docs will not serve Swagger UI');
}

if (swaggerUiDist) {
  const express = require('express') as typeof import('express');
  router.use('/swagger-ui.css', express.static(path.join(swaggerUiDist, 'swagger-ui.css')));
  router.use('/swagger-ui-bundle.js', express.static(path.join(swaggerUiDist, 'swagger-ui-bundle.js')));
  router.use('/swagger-ui-standalone-preset.js', express.static(path.join(swaggerUiDist, 'swagger-ui-standalone-preset.js')));
}

/* ─── Spec endpoint — accepts POSTed spec and caches it in memory ─── */

interface CachedSpecEntry {
  spec: unknown;
  expiresAt: number;
}
const cachedSpecs = new Map<string, CachedSpecEntry>();
const SPEC_TTL = 3600 * 1000; // 1 hour

// Periodically clean up expired specs
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of cachedSpecs.entries()) {
    if (now > entry.expiresAt) {
      cachedSpecs.delete(id);
    }
  }
}, 15 * 60 * 1000).unref();

router.post('/spec/:projectId', (req, res) => {
  const { projectId } = req.params;
  const { spec } = req.body;
  if (!spec) {
    res.status(400).json({ error: 'Missing spec' });
    return;
  }
  cachedSpecs.set(projectId, { spec, expiresAt: Date.now() + SPEC_TTL });
  res.json({ success: true, specUrl: `/docs/spec/${projectId}/openapi.json` });
});

router.get('/spec/:projectId/openapi.json', (req, res) => {
  const { projectId } = req.params;
  const entry = cachedSpecs.get(projectId);
  if (!entry) {
    res.status(404).json({ error: 'No spec loaded for this project. POST to /docs/spec/:projectId first.' });
    return;
  }
  // Refresh TTL on access
  entry.expiresAt = Date.now() + SPEC_TTL;
  res.json(entry.spec);
});

/* ─── Swagger UI HTML page ─── */

router.get('/ui/:projectId', (req, res) => {
  if (!swaggerUiDist) {
    res.status(503).send('<h1>Swagger UI not available</h1><p>swagger-ui-dist package not installed.</p>');
    return;
  }
  const { projectId } = req.params;
  const entry = cachedSpecs.get(projectId);
  const title = (entry?.spec as { info?: { title?: string } })?.info?.title || 'APIForge Project';
  res.type('text/html').send(getSwaggerHTML(`/docs/spec/${projectId}/openapi.json`, title));
});

export default router;
