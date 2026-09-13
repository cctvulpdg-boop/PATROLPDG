import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwL_M9hjTO5OVupCnVGA-kQh9luXayLeVZfgKZNDn96YHXp9pryhgbqGQPXuwIbCKUj/exec';

function gasProxyPlugin() {
  return {
    name: 'gas-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url) return next();
        const parsedUrl = new URL(req.url, 'http://localhost:3000');

        if (parsedUrl.pathname === '/api/data' || parsedUrl.pathname === '/api/gas') {
          const action = parsedUrl.searchParams.get('action') || 'getAll';
          const targetUrl = parsedUrl.searchParams.get('scriptUrl') || DEFAULT_SCRIPT_URL;

          if (req.method === 'GET' && (action === 'getAll' || parsedUrl.pathname === '/api/data')) {
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

            // Attempt fast GAS fetch (max 4 seconds)
            try {
              const gasRes = await fetch(`${targetUrl}?action=getAll`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                signal: AbortSignal.timeout(4000)
              });
              if (gasRes.ok) {
                const text = await gasRes.text();
                if (!text.trim().startsWith('<') && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
                  res.end(text);
                  return;
                }
              }
            } catch (err) {
              // Fetch timed out or network error
            }

            // Return seed data
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
                await fetch(targetUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain' },
                  body,
                  signal: AbortSignal.timeout(15000)
                });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: 'ok', success: true }));
              } catch (e: any) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ status: 'ok', success: true, local: true }));
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

