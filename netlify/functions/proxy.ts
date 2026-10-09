// ===== Netlify Function — API 代理 =====
//
// 设计要点：密钥优先走服务端环境变量，而不是打包进前端。
//
// 之前的做法是把密钥放在 VITE_DEEPSEEK_API_KEY 里，Vite 会把它内联进公开的
// JS bundle。任何人 curl 一下 bundle 就能拿到密钥，等于把密钥公开了。
//
// 现在：
//   - 服务端读 LLM_KEY / LLM_BASE_URL / LLM_MODEL_ID（不带 VITE_ 前缀，不会进 bundle）
//   - 客户端若在 UI 里填了自己的配置，走 Authorization 头覆盖（自带密钥的场景）
//   - 两边都没有，返回 503 并说清怎么配
import type { Handler } from '@netlify/functions';

interface ChatRequest {
  model?: string;
  baseUrl?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

/** 去掉末尾斜杠与 /v1，避免拼成 /v1/v1/chat/completions */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/v1$/i, '');
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

/** 服务端凭据（永远不返回给客户端） */
function serverCredentials() {
  const env = process.env;
  return {
    apiKey: env.LLM_KEY || env.DEEPSEEK_API_KEY || env.OPENAI_API_KEY || '',
    baseUrl: normalizeBaseUrl(env.LLM_BASE_URL || env.DEEPSEEK_BASE_URL || DEFAULT_BASE),
    model: env.LLM_MODEL_ID || env.DEEPSEEK_MODEL_ID || DEFAULT_MODEL,
  };
}

const handler: Handler = async (event) => {
  // 预检必须最先处理
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, body: '', headers: corsHeaders() };
  }

  const creds = serverCredentials();

  // GET：探活。只回"有没有配好"和用哪个模型，绝不回密钥。
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        configured: !!creds.apiKey,
        model: creds.model,
        baseUrl: creds.baseUrl,
      }),
      headers: corsHeaders(),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: corsHeaders(),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}') as ChatRequest;

    // 客户端自带配置优先（用户在 UI 里填的），否则用服务端凭据
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const clientKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    const apiKey = clientKey || creds.apiKey;

    if (!apiKey) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          code: 'NO_SERVER_CREDENTIALS',
          error:
            '服务端未配置模型凭据。请在部署平台的 Environment variables 里设置 LLM_KEY、' +
            'LLM_BASE_URL、LLM_MODEL_ID，或在页面右上角「AI」里填入自己的密钥。',
        }),
        headers: corsHeaders(),
      };
    }

    const baseUrl = body.baseUrl ? normalizeBaseUrl(body.baseUrl) : creds.baseUrl;
    const model = body.model || creds.model;

    if (!body.messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing messages' }),
        headers: corsHeaders(),
      };
    }

    if (!/^https?:\/\//i.test(baseUrl)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `baseUrl 不是合法地址：${baseUrl}` }),
        headers: corsHeaders(),
      };
    }

    const targetUrl = `${baseUrl}/v1/chat/completions`;

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
          messages: body.messages,
          temperature: body.temperature ?? 0.85,
          max_tokens: body.max_tokens ?? 800,
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
      return {
        statusCode: upstream.status,
        body: JSON.stringify({
          error: `上游返回了非 JSON 内容（HTTP ${upstream.status}）：${text.slice(0, 300)}`,
        }),
        headers: corsHeaders(),
      };
    }

    // 透传上游状态码。固定回 200 会把 401/429 伪装成"解析不到内容"。
    return {
      statusCode: upstream.status,
      body: JSON.stringify(parsed),
      headers: corsHeaders(),
    };
  } catch (err: unknown) {
    const e = err as { name?: string; message?: string };
    const msg = e?.name === 'AbortError' ? '上游请求超时（45 秒）' : e?.message || '代理内部错误';
    return {
      statusCode: 502,
      body: JSON.stringify({ error: msg }),
      headers: corsHeaders(),
    };
  }
};

export { handler };
