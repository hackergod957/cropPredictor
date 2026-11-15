import { recommend, PredictionError } from '../recommend.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ detail: 'Use POST /api/recommend' });
  }
  try {
    const { lat, lon } = req.body ?? {};
    return res.status(200).json(await recommend(lat, lon));
  } catch (error) {
    if (error instanceof PredictionError) return res.status(error.status).json({ detail: error.message });
    console.error('Prediction failed:', error);
    return res.status(503).json({ detail: 'Prediction service unavailable' });
  }
}
