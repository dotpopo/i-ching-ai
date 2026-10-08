/* ===== AI API 配置 ===== */

export interface ApiConfig {
  baseUrl: string
  modelId: string
  apiKey: string
}

/**
 * 从环境变量和 localStorage 构建 API 配置。
 * 优先级：localStorage > 环境变量 > 默认值
 */
export function getApiConfig(): ApiConfig {
  // 环境变量（Vite 在构建时注入，运行时通过 import.meta.env 访问）
  const envBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const envModelId = import.meta.env.VITE_API_MODEL_ID || ''
  const envApiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || ''

  // localStorage 中的用户设置（运行时可修改）
  const storedBaseUrl = localStorage.getItem('iching_api_base_url') || ''
  const storedModelId = localStorage.getItem('iching_api_model_id') || ''
  const storedApiKey = localStorage.getItem('iching_api_key') || ''

  return {
    baseUrl: storedBaseUrl || envBaseUrl || 'https://api.deepseek.com',
    modelId: storedModelId || envModelId || 'deepseek-chat',
    apiKey: storedApiKey || envApiKey || '',
  }
}

/** 保存用户设置到 localStorage */
export function saveApiConfig(config: Partial<ApiConfig>) {
  if (config.baseUrl !== undefined) {
    if (config.baseUrl) localStorage.setItem('iching_api_base_url', config.baseUrl)
    else localStorage.removeItem('iching_api_base_url')
  }
  if (config.modelId !== undefined) {
    if (config.modelId) localStorage.setItem('iching_api_model_id', config.modelId)
    else localStorage.removeItem('iching_api_model_id')
  }
  if (config.apiKey !== undefined) {
    if (config.apiKey) localStorage.setItem('iching_api_key', config.apiKey)
    else localStorage.removeItem('iching_api_key')
  }
}

/** 清除用户设置（恢复为环境变量默认值） */
export function clearApiConfig() {
  localStorage.removeItem('iching_api_base_url')
  localStorage.removeItem('iching_api_model_id')
  localStorage.removeItem('iching_api_key')
}

/** 调用 DeepSeek 兼容的 Chat Completions API（通过 Netlify Function 代理，绕过 CORS）*/
export async function callChatCompletion(
  messages: Array<{ role: string; content: string }>,
  config?: Partial<ApiConfig>
): Promise<string> {
  const apiConfig = getApiConfig()
  const mergedConfig = { ...apiConfig, ...config }

  if (!mergedConfig.apiKey) {
    throw new Error('未配置 API Key')
  }

  // 开发环境用 Vite 中间件代理，生产环境用 Netlify Function
  const proxyUrl = import.meta.env.DEV
    ? '/api/proxy'
    : '/.netlify/functions/proxy'

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mergedConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: mergedConfig.modelId,
      baseUrl: mergedConfig.baseUrl,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`API error ${response.status}: ${errorBody}`)
  }

  const data = await response.json()
  return data.choices[0].message.content || '未能生成回复'
}
