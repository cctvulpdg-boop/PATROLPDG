import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwX0ayOTnDMZQi8r10jkz13vfi2531_N687C1xRQd767IIwlHWK2WOd1mzX9Z4taC30/exec';
const LEGACY_SCRIPT_URLS = [
  'https://script.google.com/macros/s/AKfycbwL_M9hjTO5OVupCnVGA-kQh9luXayLeVZfgKZNDn96YHXp9pryhgbqGQPXuwIbCKUj/exec'
];

function gasProxyPlugin() {
  return {
    name: 'gas-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url) return next();
        const parsedUrl = new URL(req.url, 'http://localhost:3000');

        if (parsedUrl.pathname === '/api/data' || parsedUrl.pathname === '/api/gas') {
          let action = parsedUrl.searchParams.get('action') || '';
          let targetUrl = parsedUrl.searchParams.get('scriptUrl') || DEFAULT_SCRIPT_URL;

          // Replace legacy/broken script URLs automatically
          if (LEGACY_SCRIPT_URLS.includes(targetUrl.trim())) {
            targetUrl = DEFAULT_SCRIPT_URL;
          }

          if (req.method === 'GET') {
            const queryAction = action || 'getAll';
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            
            // If direct seed is requested or fallback
            const serveSeed = () => {
              try {
                const seedPath = path.resolve(__dirname, 'data/seedData.json');
                if (fs.existsSync(seedPath)) {
                  const seedContent = fs.readFileSync(seedPath, 'utf8');
                  res.end(seedContent);
                  return true;
                }
              } catch (err) {}
              return false;
            };

            // Attempt live GAS fetch with adequate timeout (30 seconds)
            try {
              const fetchUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=${queryAction}&_=${Date.now()}`;
              const gasRes = await fetch(fetchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                redirect: 'follow',
                signal: AbortSignal.timeout(30000)
              });
              if (gasRes.ok) {
                const text = await gasRes.text();
                if (!text.trim().startsWith('<') && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
                  // Optionally sync seed cache with latest live data
                  try {
                    const parsed = JSON.parse(text);
                    if (parsed.reports && parsed.reports.length > 0) {
                      const seedPath = path.resolve(__dirname, 'data/seedData.json');
                      fs.writeFileSync(seedPath, text, 'utf8');
                    }
                  } catch (e) {}

                  res.end(text);
                  return;
                }
              }
            } catch (err) {
              console.warn("[gas-proxy] GAS GET request timed out or failed, using local seed fallback");
            }

            // Return seed data if remote fails
            if (!serveSeed()) {
              res.end(JSON.stringify({ status: 'ok', reports: [], masterData: {} }));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', async () => {
              try {
                // Determine action from query or body
                let postAction = action;
                if (!postAction) {
                  try {
                    const parsedBody = JSON.parse(body);
                    if (parsedBody.action) postAction = parsedBody.action;
                  } catch (e) {}
                }
                if (!postAction) postAction = 'saveReport';

                const postUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=${postAction}`;

                console.log(`[gas-proxy] Forwarding ${postAction} to Google Apps Script (${body.length} bytes)...`);
                const gasRes = await fetch(postUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                  body,
                  redirect: 'follow',
                  signal: AbortSignal.timeout(90000) // Up to 90 seconds for multiple Drive image uploads
                });

                const responseText = await gasRes.text();
                console.log(`[gas-proxy] GAS responded with HTTP ${gasRes.status}:`, responseText.slice(0, 150));

                res.setHeader('Content-Type', 'application/json');
                if (gasRes.ok) {
                  res.end(responseText.trim().startsWith('{') ? responseText : JSON.stringify({ status: 'success', raw: responseText }));
                } else {
                  res.statusCode = gasRes.status;
                  res.end(JSON.stringify({ status: 'error', message: responseText }));
                }
              } catch (e: any) {
                console.error("[gas-proxy] Error forwarding POST to Google Apps Script:", e);
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 500;
                res.end(JSON.stringify({ status: 'error', message: e.message || 'Koneksi ke Google Apps Script gagal.' }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), gasProxyPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

