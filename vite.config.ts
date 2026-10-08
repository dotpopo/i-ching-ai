import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * 开发环境 API 代理插件
 * 将 /api/proxy 请求转发到用户配置的目标 API（支持动态 baseUrl）
 */
function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/proxy') || req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            // 移除 baseUrl 末尾的 /v1 后缀，避免重复
            let baseUrl = data.baseUrl || 'https://api.deepseek.com';
            baseUrl = baseUrl.replace(/\/v1\/?$/, '');
            const apiKey =
              (req.headers.authorization || '').replace('Bearer ', '') || data.apiKey;

            if (!apiKey) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing API key' }));
              return;
            }

            const targetUrl = `${baseUrl}/v1/chat/completions`;
            console.log('[API Proxy] 目标 URL:', targetUrl);
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: data.model,
                messages: data.messages,
                temperature: data.temperature ?? 0.7,
                max_tokens: data.max_tokens ?? 800,
              }),
            });

            const result = await response.json();
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  root: '.',
  plugins: [apiProxyPlugin()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3000,
    open: false,
  },
});
