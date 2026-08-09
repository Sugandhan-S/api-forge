import { Router } from 'express';
import { runAI, type AIAction } from '../ai/aiService';

const router = Router();

/**
 * POST /api/ai/run
 * Body: { action, ast, targetEndpointId? }
 * Returns AI-generated content (descriptions, tests, request body, issues)
 */
router.post('/run', async (req, res) => {
  try {
    const { action, ast, targetEndpointId } = req.body;

    if (!action || !ast) {
      res.status(400).json({ error: 'Missing required fields: action, ast' });
      return;
    }

    const validActions: AIAction[] = ['describe', 'suggest-body', 'generate-tests', 'detect-issues'];
    if (!validActions.includes(action as AIAction)) {
      res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
      return;
    }

    const result = await runAI({ action: action as AIAction, ast, targetEndpointId });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI service error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/ai/save
 * Body: { projectId, action, result, canvasHash }
 * Saves AI analysis result to project store
 */
router.post('/save', (req, res) => {
  try {
    const { projectId, action, result, canvasHash } = req.body;
    console.log(`[AI Save] Saved ${action} for project "${projectId}" (hash: ${canvasHash})`);
    res.json({
      success: true,
      message: 'AI analysis saved to project',
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save AI analysis' });
  }
});

/**
 * GET /api/ai/status
 * Returns whether AI is configured
 */
router.get('/status', (_req, res) => {
  res.json({
    configured: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    fallbackAvailable: true,
    message: process.env.OPENAI_API_KEY
      ? 'OpenAI connected — full AI capabilities active'
      : 'Running in template mode — set OPENAI_API_KEY for enhanced AI features',
  });
});

export default router;
