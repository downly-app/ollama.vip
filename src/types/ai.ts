// Base model provider types (remote models only)
export type RemoteModelProvider =
  | 'openai'
  | 'deepseek'
  | 'anthropic'
  | 'google'
  | 'meta'
  | 'xai'
  | 'alibaba';

// All AI provider types (including local)
export type AIProvider = RemoteModelProvider | 'ollama';

// Model information interface
export interface ModelItem {
  name: string; // Display name
  id: string; // ID used for API requests
}

// Remote model provider configuration
export interface RemoteModelProviderConfig {
  name: string; // Provider name
  baseURL: string; // API base URL
  apiKey?: string; // API key
  models: ModelItem[]; // Supported model list
  icon: string; // Icon path
  website?: string; // Official website
  description?: string; // Description
}

// Remote model provider configuration mapping
export const REMOTE_MODEL_PROVIDERS: Record<RemoteModelProvider, RemoteModelProviderConfig> = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1/',
    models: [
      { name: 'GPT-4o', id: 'gpt-4o' },
      { name: 'GPT-4.1', id: 'gpt-4.1' },
      { name: 'GPT-4.1 mini', id: 'gpt-4.1-mini' },
      { name: 'GPT-4.1 nano', id: 'gpt-4.1-nano' },
      { name: 'GPT-4o mini', id: 'gpt-4o-mini' },
      { name: 'o3', id: 'o3' },
      { name: 'o4-mini', id: 'o4-mini' },
    ],
    icon: '/icons/openai-color.svg',
    website: 'https://chatgpt.com/',
    description:
      'OpenAI is a leading AI research company that develops advanced large language models including GPT and o-series, excelling in natural language processing and reasoning capabilities.',
  },
  anthropic: {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1/',
    models: [
      { name: 'Claude 4 Sonnet', id: 'claude-4-sonnet' },
      { name: 'Claude 4 Opus', id: 'claude-4-opus' },
      { name: 'Claude 3.7 Sonnet', id: 'claude-3.7-sonnet' },
      { name: 'Claude 3.5 Sonnet V2', id: 'claude-3.5-sonnet-v2' },
      { name: 'Claude 4 Sonnet Thinking', id: 'claude-4-sonnet-thinking' },
      { name: 'Claude 4 Opus Thinking', id: 'claude-4-opus-thinking' },
      { name: 'Claude 3.7 Sonnet Thinking', id: 'claude-3.7-sonnet-thinking' },
      { name: 'Claude 3.5 Haiku', id: 'claude-3.5-haiku' },
    ],
    icon: '/icons/anthropic-color.svg',
    website: 'https://claude.ai/',
    description:
      'Anthropic focuses on AI safety research and develops Claude series models that excel in conversational understanding, reasoning, and safety, with support for long-context processing.',
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1/',
    models: [
      { name: 'DeepSeek R1', id: 'deepseek-reasoner' },
      { name: 'DeepSeek V3', id: 'deepseek-chat' },
    ],
    icon: '/icons/deepseek-color.svg',
    website: 'https://chat.deepseek.com/',
    description:
      'DeepSeek is a leading Chinese AI company specializing in high-performance large language models with strong capabilities in reasoning, programming, and multilingual processing.',
  },
  google: {
    name: 'Google',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/',
    models: [
      { name: 'Gemini 2.5 Pro', id: 'gemini-2.5-pro' },
      { name: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash' },
      { name: 'Gemini 1.5 Flash-8B', id: 'gemini-1.5-flash-8b' },
    ],
    icon: '/icons/google-color.svg',
    website: 'https://gemini.google.com/',
    description:
      "Google's Gemini series models integrate advanced multimodal capabilities, excelling in text, image, and code understanding across various application scenarios.",
  },
  meta: {
    name: 'Meta',
    baseURL: 'https://api.llama.com/v1/',
    models: [
      { name: 'Llama 3.1 405B', id: 'llama-3.1-405b' },
      { name: 'Llama 3.3 70B', id: 'llama-3.3-70b' },
    ],
    icon: '/icons/meta-color.svg',
    website: 'https://llama.meta.com/',
    description:
      "Meta's Llama series represents leading open-source large language models, excelling in natural language understanding, code generation, and multilingual support.",
  },
  xai: {
    name: 'xAI',
    baseURL: 'https://api.x.ai/v1/',
    models: [{ name: 'Grok 3', id: 'grok-3' }],
    icon: '/icons/xai-color.svg',
    website: 'https://x.ai/',
    description:
      'xAI, founded by Elon Musk, develops Grok models with unique personality and real-time information processing capabilities.',
  },
  alibaba: {
    name: 'Alibaba',
    baseURL: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    models: [
      { name: 'Qwen3 235B', id: 'qwen3-235b' },
      { name: 'Qwen2.5 72B', id: 'qwen2.5-72b' },
    ],
    icon: '/icons/alibaba-color.svg',
    website: 'https://tongyi.aliyun.com/',
    description:
      "Alibaba's Qwen series models demonstrate significant advantages in Chinese language understanding, multimodal processing, and enterprise applications.",
  },
};

// Local model configuration
export const LOCAL_MODEL_CONFIG = {
  provider: 'ollama' as const,
  name: 'Ollama',
  baseURL: 'http://localhost:11434',
  icon: '/icons/ollama-color.svg',
  website: 'https://ollama.ai/',
  description: 'Ollama allows you to run large language models locally on your machine.',
};

// Keep MODEL_PROVIDERS for backward compatibility
export const MODEL_PROVIDERS = REMOTE_MODEL_PROVIDERS;

// Compatibility type
export type ModelProvider = RemoteModelProvider;

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string; // Keep as string type, store model ID
  temperature?: number;
  maxTokens?: number;
  baseURL?: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ModelInfo {
  id: string; // Model ID, used for API requests
  name: string; // Display name
  provider: AIProvider; // Provider
  type: 'local' | 'remote'; // Model type
  requiresApiKey: boolean; // Whether API key is required
  description?: string; // Description
  parameters?: string; // Parameters
  size?: number; // Size
  family?: string; // Model family
  icon?: string; // Icon path
}

export interface ModelGroup {
  title: string;
  models: ModelInfo[];
  type: 'local' | 'remote';
}

export interface LocalModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// Model state type
export interface ModelState {
  provider: AIProvider;
  model: string;
  isAvailable: boolean;
  requiresConfig: boolean;
}

// Model selection value type (format: "provider:modelId")
export type ModelSelectValue = string;
