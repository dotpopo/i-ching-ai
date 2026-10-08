/* ============================================================
   AI 配置与调用

   凭据来源分两层：
     1. 用户在 UI 里填的（存 localStorage），自带密钥的场景
     2. 部署平台的服务端环境变量（LLM_KEY / LLM_BASE_URL / LLM_MODEL_ID）

   为什么不再从 import.meta.env 读密钥：
     VITE_ 前缀的变量会被 Vite 内联进公开的 JS bundle。任何人 curl 一下
     bundle 就能拿到密钥。这里只保留 localStorage 这一条客户端路径，
     其余交给代理服务端去处理。
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

/** 服务端代理探活结果 */
export interface ServerProbe {
  configured: boolean
  model: string
  baseUrl: string
}

const LS_KEY = 'iching_api_key'
const LS_BASE = 'iching_api_base_url'
const LS_MODEL = 'iching_api_model_id'

const DEFAULT_BASE = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'
/** 网关实测可能慢到几十秒（同一密钥从 0.9s 到 55s 都出现过），超时要留足 */
const REQUEST_TIMEOUT_MS = 90_000

/**
 * 从 localStorage 构建用户自带配置。
 *
 * 注意 baseUrl / modelId / apiKey 是**一套**凭据，必须整组取用。
 * 之前按字段各自回退到环境变量，会拼出「A 家的地址 + B 家的密钥」这种
 * 组合，然后被上游判 401，排查时极难看出。
 */
export function getApiConfig(): ApiConfig {
  let storedBaseUrl = ''
  let storedModelId = ''
  let storedApiKey = ''
  try {
    storedBaseUrl = localStorage.getItem(LS_BASE) || ''
    storedModelId = localStorage.getItem(LS_MODEL) || ''
    storedApiKey = localStorage.getItem(LS_KEY) || ''
  } catch {
    // 隐私模式下 localStorage 可能不可用
  }

  // 有自带密钥才认为用户配置生效，三个字段同进同出
  if (storedApiKey) {
    return {
      baseUrl: storedBaseUrl || DEFAULT_BASE,
      modelId: storedModelId || DEFAULT_MODEL,
      apiKey: storedApiKey,
    }
  }

  // 没填密钥：地址与模型留空，交给服务端代理决定用哪套凭据
  return {
    baseUrl: storedBaseUrl,
    modelId: storedModelId,
    apiKey: '',
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

/** 代理通道：开发环境走 Vite 中间件，生产环境走 Netlify Function */
function proxyChannels(): string[] {
  return import.meta.env.DEV
    ? ['/api/proxy', '/.netlify/functions/proxy']
    : ['/.netlify/functions/proxy', '/api/proxy']
}

/**
 * 问服务端「你有没有替我配好凭据」。
 * 全新设备（比如手机第一次打开）没有 localStorage，靠这个判断能不能用 AI。
 * 返回 null 表示两个通道都不可达。
 */
export async function probeServer(): Promise<ServerProbe | null> {
  for (const url of proxyChannels()) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(url, { method: 'GET', signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) continue
      const data = await res.json().catch(() => null)
      if (data && typeof data.configured === 'boolean') {
        return {
          configured: data.configured,
          model: typeof data.model === 'string' ? data.model : '',
          baseUrl: typeof data.baseUrl === 'string' ? data.baseUrl : '',
        }
      }
    } catch {
      // 换下一个通道
    }
  }
  return null
}

/** 去掉末尾的 /v1 与斜杠，避免代理拼接出 /v1/v1/chat/completions */
function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, '').replace(/\/v1$/i, '')
}

/** 从各种形状的错误响应里挖出一句人话 */
function extractErrorMessage(status: number, body: string): string {
  let detail = ''
  let code = ''
  if (body) {
    try {
      const j = JSON.parse(body)
      const msg = j?.error?.message ?? j?.message ?? j?.error ?? j?.msg
      if (typeof msg === 'string' && msg) detail = msg
      else detail = body.slice(0, 200)
      if (typeof j?.code === 'string') code = j.code
    } catch {
      detail = body.slice(0, 200)
    }
  }

  // 401/403 是最常见的坑，直接告诉用户下一步做什么
  if (status === 401 || status === 403) {
    return `密钥被上游拒绝（HTTP ${status}）。点右上角「AI」重新填写密钥，或检查部署平台里的 LLM_KEY。${detail ? ` 上游原话：${detail}` : ''}`
  }
  if (status === 429) {
    return `请求太频繁被限流（HTTP 429）。稍等一会儿再试。${detail ? ` 上游原话：${detail}` : ''}`
  }
  // 只有代理自己发的 503（带 NO_SERVER_CREDENTIALS 标记）才是"没配凭据"。
  // 上游也可能返回 503，那种要按上游原话报，别误导。
  if (status === 503 && code === 'NO_SERVER_CREDENTIALS') {
    return `服务端还没有配好模型凭据。${detail || '请设置 LLM_KEY / LLM_BASE_URL / LLM_MODEL_ID。'}`
  }
  if (!detail) return `接口返回 ${status}，响应体为空`
  return `接口返回 ${status}：${detail}`
}

/**
 * 调用 OpenAI 兼容的 Chat Completions。
 * 客户端有自带密钥就带上去，没有就留给服务端凭据，两条通道自动回退。
 */
export async function callChatCompletion(
  messages: ChatMessage[],
  config?: Partial<ApiConfig>,
  maxTokens = 800
): Promise<string> {
  const merged = { ...getApiConfig(), ...config }
  if (merged.baseUrl) merged.baseUrl = normalizeBaseUrl(merged.baseUrl)

  const errors: string[] = []

  for (const proxyUrl of proxyChannels()) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      // 只在确实有自带密钥时才带 Authorization，让服务端凭据有机会生效
      if (merged.apiKey) headers.Authorization = `Bearer ${merged.apiKey}`

      const payload: Record<string, unknown> = {
        messages,
        temperature: 0.85,
        max_tokens: maxTokens,
      }
      // 关键：只有客户端确实有自带配置时才带 model / baseUrl。
      // 之前这里填了默认值 deepseek-chat，把服务端配好的模型盖掉了，
      // 结果上游报「模型 deepseek-chat 无可用渠道」，看着像凭据问题，其实不是。
      if (merged.modelId) payload.model = merged.modelId
      if (merged.baseUrl) payload.baseUrl = merged.baseUrl

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        errors.push(extractErrorMessage(response.status, body))
        // 只有 404/405 才说明"这个代理通道本身不存在"，值得换通道再试。
        // 上游返回的 401/429/500 换通道也是白试，而且会把真正的原因埋掉。
        if (response.status !== 404 && response.status !== 405) break
        continue
      }

      const data = await response.json().catch(() => null)
      const content = data?.choices?.[0]?.message?.content
      if (typeof content === 'string' && content.trim()) return content.trim()

      // 有些网关把内容放在别处，兜一下
      const alt = data?.choices?.[0]?.text ?? data?.content
      if (typeof alt === 'string' && alt.trim()) return alt.trim()

      errors.push('接口返回成功，但没有解析到文本内容')
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string }
      errors.push(
        e?.name === 'AbortError'
          ? `请求超时（超过 ${REQUEST_TIMEOUT_MS / 1000} 秒）`
          : e?.message || '网络请求失败'
      )
    } finally {
      clearTimeout(timer)
    }
  }

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
