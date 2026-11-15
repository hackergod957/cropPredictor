import cors from 'cors';
import { recommend, PredictionError } from './recommend.js';
import express from 'express';
import { fileURLToPath } from 'node:url';

export function createApp({ mlUrl, timeoutMs = 20000 } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/vendor/leaflet', express.static(fileURLToPath(new URL('./node_modules/leaflet/dist/', import.meta.url))));
  app.use(express.static(fileURLToPath(new URL('./public/', import.meta.url))));

  app.post('/api/recommend', async (req, res) => {
    try {
      const { lat, lon } = req.body ?? {};
      if (!mlUrl) return res.json(await recommend(lat, lon));
      const response = await fetch(`${mlUrl.replace(/\/$/, '')}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      if (error instanceof PredictionError) return res.status(error.status).json({ detail: error.message });
      console.error(`Prediction request failed (${error.name}): ${error.message}`);
      return res.status(503).json({ detail: 'Prediction service unavailable' });
    }
  });
  return app;
}
