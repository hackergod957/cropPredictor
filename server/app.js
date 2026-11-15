import cors from 'cors';
import express from 'express';

export function createApp({ mlUrl, timeoutMs = 20000 }) {
  if (!mlUrl) throw new Error('ML_URL must be configured');
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/api/recommend', async (req, res) => {
    try {
      const { lat, lon } = req.body ?? {};
      const response = await fetch(`${mlUrl.replace(/\/$/, '')}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch {
      return res.status(503).json({ detail: 'Prediction service unavailable' });
    }
  });
  return app;
}
