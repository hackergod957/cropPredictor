import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

dotenv.config({ path: fileURLToPath(new URL('.env', import.meta.url)) });
const port = process.env.PORT || 3000;
createApp({ mlUrl: process.env.ML_URL }).listen(port, () => {
  console.log(`Express listening on http://localhost:${port}`);
});
