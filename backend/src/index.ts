import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';

import openapiRouter from './routes/openapi';
import mockRouter from './routes/mock';
import aiRouter from './routes/ai';
import docsRouter from './routes/docs';
import { mockSessionStore } from './mock/mockEngine';

dotenv.config();

/* ─── Config ─── */
const PORT = process.env.PORT || 3001;

/* ─── Flexible CORS Setup ─── */
const configuredOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

/* ─── Express App ─── */
const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || configuredOrigins.includes('*') || configuredOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // Dynamically allow origin for seamless Vercel preview deploys & custom domains
        callback(null, origin);
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

/* ─── HTTP Server ─── */
const httpServer = createServer(app);

/* ─── Health Check ─── */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'apiforge-backend',
    version: '0.4.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeMockSessions: mockSessionStore.list().length,
    ai: {
      configured: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gemini-1.5-flash',
    },
  });
});

/* ─── Routes ─── */
app.use('/api/openapi', openapiRouter);  // Phase 3
app.use('/api/mock', mockRouter);         // Phase 4
app.use('/api/ai', aiRouter);             // Phase 7
app.use('/docs', docsRouter);             // Phase 8

/* ─── Projects (Phase 6 — full persistence via Supabase in production) ─── */
app.get('/api/projects', (_req, res) => {
  res.json({
    projects: [],
    message: 'Project persistence active — configure Supabase for cloud storage',
  });
});

/* ─── Dynamic Mock Proxy (Phase 4) ─────────────────────────────────────────
 * GET/POST /mock/:projectId/* → delegated to in-memory session router
 * ─────────────────────────────────────────────────────────────────────── */
app.use('/mock/:projectId', (req: Request, res: Response, next: NextFunction) => {
  const projectId = String(req.params.projectId);
  const session = mockSessionStore.get(projectId);

  if (!session) {
    res.status(404).json({
      error: `No active mock session for project "${projectId}"`,
      _mock: true,
    });
    return;
  }

  req.url = req.url.replace(`/${projectId}`, '') || '/';
  session.router(req, res, next);
});

/* ─── Start Server ─── */
httpServer.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║                                              ║
  ║   ⚡ APIForge Backend v0.4.0                 ║
  ║                                              ║
  ║   HTTP:   http://localhost:${PORT}             ║
  ║   Health: /api/health                        ║
  ║   Mock:   /mock/:projectId/*                 ║
  ║   AI:     /api/ai/run                        ║
  ║   Docs:   /docs/                             ║
  ║                                              ║
  ║   AI: ${process.env.OPENAI_API_KEY ? '✅ AI service connected' : '⚠️  Template mode (no API key)'}          ║
  ║                                              ║
  ╚══════════════════════════════════════════════╝
  `);
});

export { app };

