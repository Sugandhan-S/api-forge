import { Router } from 'express';
import { mockSessionStore } from '../mock/mockEngine';

const router = Router();

/**
 * POST /api/mock/start
 *
 * Body: { spec: OpenAPISpec, projectId?: string }
 * Creates a new mock session from the provided OpenAPI spec.
 * Returns the mock base URL and list of registered routes.
 */
router.post('/start', (req, res) => {
  try {
    const { spec, projectId } = req.body;

    if (!spec) {
      res.status(400).json({ error: 'Missing "spec" in request body' });
      return;
    }

    if (!spec.openapi || !spec.info || !spec.paths) {
      res.status(400).json({
        error: 'Invalid OpenAPI spec — missing required fields (openapi, info, paths)',
      });
      return;
    }

    const session = mockSessionStore.create(spec, projectId);

    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3001';
    const mockBaseUrl = `${protocol}://${host}/mock/${session.projectId}`;

    res.status(201).json({
      projectId: session.projectId,
      mockBaseUrl,
      title: session.title,
      version: session.version,
      routes: session.routes,
      createdAt: session.createdAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('capacity reached')) {
      res.status(429).json({ error: message });
    } else {
      res.status(500).json({ error: `Failed to start mock server: ${message}` });
    }
  }
});

/**
 * DELETE /api/mock/stop/:projectId
 *
 * Tears down the mock session for the given project.
 */
router.delete('/stop/:projectId', (req, res) => {
  const { projectId } = req.params;

  if (!mockSessionStore.has(projectId)) {
    res.status(404).json({ error: `No active mock session for project "${projectId}"` });
    return;
  }

  mockSessionStore.delete(projectId);
  res.json({ success: true, projectId, message: 'Mock session stopped' });
});

/**
 * GET /api/mock/status
 *
 * Lists all active mock sessions (without the internal Express router).
 */
router.get('/status', (_req, res) => {
  const sessions = mockSessionStore.list();
  res.json({
    activeSessions: sessions.length,
    sessions,
  });
});

/**
 * GET /api/mock/status/:projectId
 *
 * Returns status of a specific mock session.
 */
router.get('/status/:projectId', (req, res) => {
  const { projectId } = req.params;
  const session = mockSessionStore.get(projectId);

  if (!session) {
    res.status(404).json({ error: `No active mock session for project "${projectId}"` });
    return;
  }

  const { router: _router, ...rest } = session;
  res.json(rest);
});

export default router;
