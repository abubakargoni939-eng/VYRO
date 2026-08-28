import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// IMPORTANT: send Supabase config to browser
app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`
    window.VYRO_CONFIG = {
      SUPABASE_URL: ${JSON.stringify(process.env.SUPABASE_URL || '')},
      SUPABASE_ANON_KEY: ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')}
    };
  `);
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'VYRO', version: 'MVP 1.0' });
});

app.get('*splat', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VYRO running on port ${PORT}`);
});
