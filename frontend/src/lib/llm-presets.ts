/**
 * Provider 预设：与 Desktop 端 defaultConfig.providers 对齐，
 * 用于新建时快速填充 baseUrl、apiType、模型列表。
 */
export type ApiType = 'anthropic' | 'openai';

export type ProviderPreset = {
  providerId: string;
  label: string;
  baseUrl: string;
  apiType: ApiType;
  models: { id: string; name: string }[];
};

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    providerId: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiType: 'openai',
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
    ],
  },
  {
    providerId: 'anthropic',
    label: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiType: 'anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ],
  },
  {
    providerId: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/anthropic',
    apiType: 'anthropic',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
  },
  {
    providerId: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiType: 'openai',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    ],
  },
  {
    providerId: 'moonshot',
    label: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/anthropic',
    apiType: 'anthropic',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot 8K' },
      { id: 'moonshot-v1-32k', name: 'Moonshot 32K' },
    ],
  },
  {
    providerId: 'qwen',
    label: '通义千问 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/apps/anthropic',
    apiType: 'anthropic',
    models: [
      { id: 'qwen-turbo', name: 'Qwen Turbo' },
      { id: 'qwen-plus', name: 'Qwen Plus' },
      { id: 'qwen-max', name: 'Qwen Max' },
    ],
  },
  {
    providerId: 'zhipu',
    label: '智谱 (GLM)',
    baseUrl: 'https://open.bigmodel.cn/api/anthropic',
    apiType: 'anthropic',
    models: [
      { id: 'glm-4-flash', name: 'GLM-4 Flash' },
      { id: 'glm-4', name: 'GLM-4' },
    ],
  },
  {
    providerId: 'minimax',
    label: 'MiniMax',
    baseUrl: 'https://api.minimaxi.com/anthropic',
    apiType: 'anthropic',
    models: [
      { id: 'abab6.5s-chat', name: 'ABAB 6.5s' },
      { id: 'abab5.5s-chat', name: 'ABAB 5.5s' },
    ],
  },
  {
    providerId: 'volcengine',
    label: '火山引擎 (豆包)',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/compatible',
    apiType: 'anthropic',
    models: [
      { id: 'doubao-pro-4-32k', name: 'Doubao Pro 4' },
      { id: 'doubao-pro-32k', name: 'Doubao Pro' },
    ],
  },
  {
    providerId: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiType: 'openai',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
  },
  {
    providerId: 'ollama',
    label: 'Ollama (本地)',
    baseUrl: 'http://localhost:11434/v1',
    apiType: 'openai',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2' },
      { id: 'qwen2.5', name: 'Qwen 2.5' },
    ],
  },
  {
    providerId: 'custom',
    label: '自定义',
    baseUrl: '',
    apiType: 'openai',
    models: [],
  },
];

export function getPresetByProviderId(providerId: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((p) => p.providerId === providerId.toLowerCase());
}
