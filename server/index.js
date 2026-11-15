import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) });
const port = process.env.PORT || 3000;
const app = createApp({ mlUrl: process.env.VERCEL ? undefined : process.env.ML_URL });
export default app;
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Express listening on http://localhost:${port}`));
}
