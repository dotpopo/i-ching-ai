import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

/**
 * 开发环境 API 代理
 * 把 /api/proxy 的请求转发到用户配置的 OpenAI 兼容端点，绕开浏览器 CORS。
 *
 * 与 Netlify Function 版本保持同一份契约：请求体带 baseUrl，
 * 密钥走 Authorization 头，末尾 /v1 会被规整掉。
 */
function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/proxy')) return next();

        const send = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify(payload));
        };

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          send(405, { error: 'Method not allowed' });
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');

            // 去掉末尾斜杠与 /v1，避免拼成 /v1/v1/chat/completions
            const baseUrl = (data.baseUrl || 'https://api.deepseek.com').trim()
              .replace(/\/+$/, '')
              .replace(/\/v1$/i, '');
            if (!/^https?:\/\//i.test(baseUrl)) {
              send(400, { error: `baseUrl 不是合法地址：${baseUrl}` });
              return;
            }

            const apiKey = (req.headers.authorization || '').replace('Bearer ', '') || data.apiKey;
            if (!apiKey) {
              send(401, { error: 'Missing API key' });
              return;
            }

            const targetUrl = `${baseUrl}/v1/chat/completions`;
            console.log('[API Proxy] 目标 URL:', targetUrl);

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 60_000);

            let upstream: Response;
            try {
              upstream = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model: data.model,
                  messages: data.messages,
                  temperature: data.temperature ?? 0.85,
                  max_tokens: data.max_tokens ?? 1200,
                }),
                signal: controller.signal,
              });
            } finally {
              clearTimeout(timer);
            }

            const text = await upstream.text();
            let parsed: unknown;
            try {
              parsed = JSON.parse(text);
            } catch {
              // 上游返回非 JSON（网关报错页等）时原样包一层，别让前端拿到 HTML
              send(upstream.status, {
                error: `上游返回了非 JSON 内容（HTTP ${upstream.status}）：${text.slice(0, 300)}`,
              });
              return;
            }

            // 关键：把上游状态码透传给前端。
            // 之前这里固定返回 200，401/429 之类的错误会被前端当成"解析不到内容"，
            // 排查时完全看不出真正原因。
            send(upstream.status, parsed);
          } catch (err) {
            const e = err as { name?: string; message?: string };
            const msg = e?.name === 'AbortError' ? '上游请求超时（60 秒）' : (e?.message || '代理内部错误');
            console.error('[API Proxy] 失败:', msg);
            send(502, { error: msg });
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
