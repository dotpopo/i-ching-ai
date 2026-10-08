/* ============================================================
   AI 配置与调用
   接口约定保持原样（VITE_API_BASE_URL / VITE_API_MODEL_ID /
   VITE_DEEPSEEK_API_KEY），本文件只修调用链上的缺陷。
   ============================================================ */

export interface ApiConfig {
  baseUrl: string
  modelId: string
  apiKey: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const LS_KEY = 'iching_api_key'
const LS_BASE = 'iching_api_base_url'
const LS_MODEL = 'iching_api_model_id'

const DEFAULT_BASE = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'
/** 网关实测可能慢到几十秒（同一密钥从 0.9s 到 55s 都出现过），超时要留足 */
const REQUEST_TIMEOUT_MS = 90_000

/**
 * 从环境变量和 localStorage 构建 API 配置。
 * 优先级：localStorage > 环境变量 > 默认值
 */
export function getApiConfig(): ApiConfig {
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const envModelId = import.meta.env.VITE_API_MODEL_ID || ''
  const envApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || ''

  let storedBaseUrl = ''
  let storedModelId = ''
  let storedApiKey = ''
  try {
    storedBaseUrl = localStorage.getItem(LS_BASE) || ''
    storedModelId = localStorage.getItem(LS_MODEL) || ''
    storedApiKey = localStorage.getItem(LS_KEY) || ''
  } catch {
    // 隐私模式下 localStorage 可能不可用，退回环境变量
  }

  return {
    baseUrl: storedBaseUrl || envBaseUrl || DEFAULT_BASE,
    modelId: storedModelId || envModelId || DEFAULT_MODEL,
    apiKey: storedApiKey || envApiKey || '',
  }
}

export function saveApiConfig(config: Partial<ApiConfig>) {
  try {
    if (config.baseUrl !== undefined) {
      config.baseUrl ? localStorage.setItem(LS_BASE, config.baseUrl) : localStorage.removeItem(LS_BASE)
    }
    if (config.modelId !== undefined) {
      config.modelId ? localStorage.setItem(LS_MODEL, config.modelId) : localStorage.removeItem(LS_MODEL)
    }
    if (config.apiKey !== undefined) {
      config.apiKey ? localStorage.setItem(LS_KEY, config.apiKey) : localStorage.removeItem(LS_KEY)
    }
  } catch {
    /* 存不进去就算了，不影响本次会话 */
  }
}

export function clearApiConfig() {
  try {
    localStorage.removeItem(LS_BASE)
    localStorage.removeItem(LS_MODEL)
    localStorage.removeItem(LS_KEY)
  } catch {
    /* noop */
  }
}

/** 去掉末尾的 /v1 与斜杠，避免代理拼接出 /v1/v1/chat/completions */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/v1$/i, '')
}

/** 从各种形状的错误响应里挖出一句人话 */
function extractErrorMessage(status: number, body: string): string {
  if (!body) return `接口返回 ${status}，响应体为空`
  try {
    const j = JSON.parse(body)
    const msg =
      j?.error?.message ?? j?.message ?? j?.error ?? j?.msg
    if (typeof msg === 'string' && msg) return `接口返回 ${status}：${msg}`
    return `接口返回 ${status}：${body.slice(0, 200)}`
  } catch {
    return `接口返回 ${status}：${body.slice(0, 200)}`
  }
}

/**
 * 调用 OpenAI 兼容的 Chat Completions。
 * 开发环境走 Vite 中间件 /api/proxy，生产环境走 Netlify Function。
 * 两个通道都会自动回退。
 */
export async function callChatCompletion(
  messages: ChatMessage[],
  config?: Partial<ApiConfig>,
  maxTokens = 800
): Promise<string> {
  const merged = { ...getApiConfig(), ...config }
  merged.baseUrl = normalizeBaseUrl(merged.baseUrl)

  if (!merged.apiKey) throw new Error('未配置 API Key')
  if (!merged.modelId) throw new Error('未配置模型 ID')

  const proxyUrls = import.meta.env.DEV
    ? ['/api/proxy', '/.netlify/functions/proxy']
    : ['/.netlify/functions/proxy', '/api/proxy']

  const errors: string[] = []

  for (const proxyUrl of proxyUrls) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${merged.apiKey}`,
        },
        body: JSON.stringify({
          model: merged.modelId,
          baseUrl: merged.baseUrl,
          messages,
          temperature: 0.85,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        errors.push(`${proxyUrl} → ${extractErrorMessage(response.status, body)}`)
        // 只有 404/405 才说明"这个代理通道本身不存在"（例如生产环境里没有 Vite 中间件），
        // 值得换下一个通道再试。上游返回的 401/429/500 换通道也是白试，
        // 而且会把真正的原因埋掉，所以直接跳出。
        if (response.status !== 404 && response.status !== 405) break
        continue
      }

      const data = await response.json().catch(() => null)
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string' && content.trim()) return content.trim()

      // 有些网关把内容放在别处，兜一下
      const alt = data?.choices?.[0]?.text ?? data?.content
      if (typeof alt === 'string' && alt.trim()) return alt.trim()

      errors.push(`${proxyUrl} → 接口返回成功，但没有解析到文本内容`)
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      const reason =
        e?.name === 'AbortError'
          ? `请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒）`
          : e?.message || '网络请求失败'
      errors.push(`${proxyUrl} → ${reason}`)
    } finally {
      clearTimeout(timer)
    }
  }

  // 报第一个错误：主通道的原因比回退通道的 404 有诊断价值得多
  throw new Error(errors[0] ?? '所有代理通道均失败')
}

/** 并发跑多个提示词，失败的那条退回兜底文本 */
export async function callMany(
  prompts: Array<{ key: string; messages: ChatMessage[]; fallback: string; maxTokens?: number }>,
  config?: Partial<ApiConfig>
): Promise<{ results: Record<string, string>; failed: number; lastError: string }> {
  let failed = 0
  let lastError = ''

  const settled = await Promise.all(
    prompts.map(async (p) => {
      try {
        const text = await callChatCompletion(p.messages, config, p.maxTokens ?? 800)
        return { key: p.key, text }
      } catch (err: unknown) {
        failed++
        lastError = (err as Error)?.message || '未知错误'
        return { key: p.key, text: p.fallback }
      }
    })
  )

  const results: Record<string, string> = {}
  settled.forEach((s) => {
    results[s.key] = s.text
  })
  return { results, failed, lastError }
}

/** 探活：拿一条最短的请求确认链路通不通 */
export async function testConnection(config?: Partial<ApiConfig>): Promise<string> {
  return callChatCompletion(
    [
      { role: 'system', content: '你是一个连接测试端点。' },
      { role: 'user', content: '回复「通」一个字即可。' },
    ],
    config,
    16
  )
}
