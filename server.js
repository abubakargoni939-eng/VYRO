import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Supabase config from Render Environment Variables
app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`
window.VYRO_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(process.env.SUPABASE_URL || '')},
  SUPABASE_ANON_KEY: ${JSON.stringify(process.env.SUPABASE_ANON_KEY || '')}
};
`);
});

// Serve index.html, app.js and style.css from root
app.use(express.static(__dirname));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'VYRO',
    version: 'MVP 1.0'
  });
});

// Fallback to VYRO homepage
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VYRO running on port ${PORT}`);
});
