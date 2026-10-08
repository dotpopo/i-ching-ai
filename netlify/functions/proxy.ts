// ===== Netlify Function — API 代理（解决 CORS 问题）=====
import type { Handler } from '@netlify/functions';

interface ChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const handler: Handler = async (event) => {
  // 只允许 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // 从请求头获取 API Key（由前端通过 Authorization 头传递）
    const authHeader = event.headers.authorization || '';
    const apiKey = authHeader.replace('Bearer ', '');

    if (!apiKey) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing API key' }),
        headers: corsHeaders(),
      };
    }

    const { model, messages, temperature, max_tokens } = body;

    if (!model || !messages) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing model or messages' }),
        headers: corsHeaders(),
      };
    }

    // 获取目标 API 地址（优先使用请求中的 baseUrl，否则使用默认）
    const baseUrl = body.baseUrl || 'https://api.deepseek.com';
    const targetUrl = `${baseUrl}/v1/chat/completions`;

    // 转发请求到目标 API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 800,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `API error ${response.status}: ${errorBody}` }),
        headers: corsHeaders(),
      };
    }

    const data: ChatResponse = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: corsHeaders(),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
      headers: corsHeaders(),
    };
  }
};

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

export { handler };
