import { cpSync, mkdirSync } from 'node:fs';
// Vercel serves public/ directly; express.static middleware is ignored there.
mkdirSync(new URL('./public/vendor/leaflet/', import.meta.url), { recursive: true });
cpSync(new URL('./node_modules/leaflet/dist/', import.meta.url), new URL('./public/vendor/leaflet/', import.meta.url), { recursive: true });
