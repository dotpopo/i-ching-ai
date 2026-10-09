import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 开发环境 API 代理
 *
 * 与 netlify/functions/proxy.ts 保持同一份契约：
 *   - GET  /api/proxy  探活，只回"有没有配好"和模型名，绝不回密钥
 *   - POST /api/proxy  转发到 OpenAI 兼容端点
 *   - 凭据优先用客户端带的（UI 里填的），否则用服务端环境变量
 *   - 末尾 /v1 会被规整掉，上游状态码原样透传
 *
 * 服务端环境变量读的是 LLM_KEY / LLM_BASE_URL / LLM_MODEL_ID，
 * 不带 VITE_ 前缀，所以不会被内联进前端 bundle。
 */
const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/v1$/i, '');
}

/**
 * 极简 .env 解析。
 *
 * 为什么不用 Vite 的 loadEnv：实测 `loadEnv(mode, cwd, '')`（前缀传空串以读取
 * 非 VITE_ 变量）返回的仍然是 process.env 的值，`.env` 文件被静默忽略，
 * 于是全局环境变量会盖掉项目自己的开发配置。这里自己解析，行为确定：
 * 项目根的 .env 优先，process.env 只做兜底。
 */
function readDotEnv(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of ['.env', '.env.local']) {
    const file = resolve(dir, name);
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value) out[key] = value;
    }
  }
  return out;
}

function serverCredentials(env: Record<string, string | undefined>) {
  return {
    apiKey: env.LLM_KEY || env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || '',
    baseUrl: normalizeBaseUrl(env.LLM_BASE_URL || env.DEEPSEEK_BASE_URL || DEFAULT_BASE),
    model: env.LLM_MODEL_ID || env.DEEPSEEK_MODEL_ID || DEFAULT_MODEL,
  };
}

function apiProxyPlugin(env: Record<string, string | undefined>): Plugin {
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
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }

        const creds = serverCredentials(env);

        // 探活：前端据此判断"服务端有没有替我配好"，不用把密钥塞进 bundle
        if (req.method === 'GET') {
          send(200, {
            ok: true,
            configured: !!creds.apiKey,
            model: creds.model,
            baseUrl: creds.baseUrl,
          });
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

            const authHeader = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
            const apiKey = authHeader || data.apiKey || creds.apiKey;

            if (!apiKey) {
              send(503, {
                code: 'NO_SERVER_CREDENTIALS',
                error:
                  '服务端未配置模型凭据。请在环境变量里设置 LLM_KEY、LLM_BASE_URL、LLM_MODEL_ID，' +
                  '或在页面右上角「AI」里填入自己的密钥。',
              });
              return;
            }

            const baseUrl = data.baseUrl ? normalizeBaseUrl(data.baseUrl) : creds.baseUrl;
            const model = data.model || creds.model;

            if (!/^https?:\/\//i.test(baseUrl)) {
              send(400, { error: `baseUrl 不是合法地址：${baseUrl}` });
              return;
            }

            const targetUrl = `${baseUrl}/v1/chat/completions`;
            console.log('[API Proxy] 目标 URL:', targetUrl);

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 45_000);

            let upstream: Response;
            try {
              upstream = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  model,
                  messages: data.messages,
                  temperature: data.temperature ?? 0.85,
                  max_tokens: data.max_tokens ?? 800,
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
              send(upstream.status, {
                error: `上游返回了非 JSON 内容（HTTP ${upstream.status}）：${text.slice(0, 300)}`,
              });
              return;
            }

            // 透传上游状态码。固定回 200 会把 401/429 伪装成"解析不到内容"。
            send(upstream.status, parsed);
          } catch (err) {
            const e = err as { name?: string; message?: string };
            const msg = e?.name === 'AbortError' ? '上游请求超时（45 秒）' : (e?.message || '代理内部错误');
            console.error('[API Proxy] 失败:', msg);
            send(502, { error: msg });
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  // 项目根的 .env 优先于全局环境变量，保证 dev 行为可复现。
  // 这些是服务端凭据，只在本机 dev server 进程里用，不会进前端 bundle。
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...readDotEnv(process.cwd()),
  };

  return {
    root: '.',
    plugins: [apiProxyPlugin(env)],
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    server: {
      port: 3000,
      open: false,
      // 绑 0.0.0.0，手机走局域网或 cloudflared 快速隧道都能连
      host: true,
      /**
       * Vite 5.4.12+ 默认开启 Host 头校验（防 DNS rebinding），
       * 隧道域名不在白名单就直接 403「Blocked request. This host is not allowed」。
       * 快速隧道的域名每次随机（xxx.trycloudflare.com），
       * 所以用前导点的通配，只写死一个下次还得改。
       */
      allowedHosts: ['localhost', '127.0.0.1', '.trycloudflare.com'],
    },
  };
});
