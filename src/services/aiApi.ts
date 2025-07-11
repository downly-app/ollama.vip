import { AIConfig, MODEL_PROVIDERS, RemoteModelProvider } from '@/types/ai';

import configApi from './configApi';
import { modelService } from './modelService';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
}

export interface StreamResponse {
  content: string;
  done: boolean;
}

class AIApiService {
  private async makeRequest(
    url: string,
    options: RequestInit,
    config: AIConfig
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Only remote APIs need authentication headers
    if (config.provider !== 'ollama') {
      // Get API configuration from new configuration system
      const apiConfig = modelService.getRemoteApiConfig(config.provider as RemoteModelProvider);

      if (apiConfig?.apiKey) {
        // Set different authentication headers for different providers
        switch (config.provider) {
          case 'anthropic':
            headers['x-api-key'] = apiConfig.apiKey;
            break;
          case 'google':
            headers['x-goog-api-key'] = apiConfig.apiKey;
            break;
          default:
            // OpenAI, DeepSeek, Meta, xAI, Alibaba etc. use Bearer token
            headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
            break;
        }

        // Adding authentication header
      } else {
        // Missing API Key configuration
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    return response;
  }

  async sendMessage(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    // Choose different API formats based on provider
    if (config.provider === 'ollama') {
      return this.sendOllamaMessage(messages, config, onChunk);
    } else {
      return this.sendOpenAIMessage(messages, config, onChunk);
    }
  }

  private async sendOllamaMessage(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const apiMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Ensure using complete model name
    const modelName = config.model;
    // Original model name logged

    // If model name doesn't contain colon, it might be incomplete, need to log warning
    if (!modelName.includes(':')) {
      // Model name might be incomplete
    }

    const requestBody = {
      model: modelName,
      messages: apiMessages,
      stream: !!onChunk,
      options: {
        temperature: config.temperature || 0.7,
      },
    };

    const baseURL = await this.getBaseURL(config);
    const url = `${baseURL}/api/chat`;

    const response = await this.makeRequest(
      url,
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      config
    );

    if (onChunk) {
      return await this.handleOllamaStreamResponse(response, onChunk);
    } else {
      const data = await response.json();
      return data.message?.content || '';
    }
  }

  private async sendOpenAIMessage(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const apiMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const requestBody = {
      model: config.model,
      messages: apiMessages,
      stream: !!onChunk,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 4000,
    };

    const baseURL = await this.getBaseURL(config);
    // Using API address
    const url = `${baseURL}/chat/completions`;

    const response = await this.makeRequest(
      url,
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      config
    );

    if (onChunk) {
      return await this.handleOpenAIStreamResponse(response, onChunk);
    } else {
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    }
  }

  private async handleOllamaStreamResponse(
    response: Response,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content || '';
            if (content) {
              fullContent += content;
              onChunk(content);
            }
            if (parsed.done) {
              return fullContent;
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async handleOpenAIStreamResponse(
    response: Response,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return fullContent;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async getBaseURL(config: AIConfig): Promise<string> {
    // Ensure we use correct API address based on different providers

    // If it's local Ollama, always get latest address from configApi
    if (config.provider === 'ollama') {
      try {
        const ollamaHost = await configApi.getOllamaHost();
        // Using ollama host from configApi
        return ollamaHost.replace(/\/$/, '');
      } catch (error) {
        // Failed to get ollama host from configApi
        // If there's baseURL in config, use it as fallback option
        if (config.baseURL) {
          return config.baseURL.replace(/\/$/, '');
        }
        return 'http://127.0.0.1:11434';
      }
    }

    // For remote API providers, get custom API URL from new configuration system
    const apiConfig = modelService.getRemoteApiConfig(config.provider as RemoteModelProvider);
    if (apiConfig?.baseURL) {
      // Using configured API URL
      return apiConfig.baseURL.replace(/\/$/, '');
    }

    // For remote API providers, prioritize baseURL in config (if available)
    if (config.baseURL) {
      // Using configured baseURL
      return config.baseURL.replace(/\/$/, '');
    }

    // Get default API address from MODEL_PROVIDERS
    if (MODEL_PROVIDERS[config.provider]) {
      const baseURL = MODEL_PROVIDERS[config.provider].baseURL;
      // Using default API address
      return baseURL.replace(/\/$/, '');
    }

    throw new Error(`Unsupported AI provider: ${config.provider}`);
  }

  // Streaming response support (optional implementation)
  async *streamMessage(
    messages: ChatMessage[],
    config: AIConfig
  ): AsyncGenerator<string, void, unknown> {
    const apiMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const requestBody = {
      model: config.model,
      messages: apiMessages,
      stream: true,
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 4000,
    };

    const baseURL = await this.getBaseURL(config);
    const url = `${baseURL}/chat/completions`;

    const response = await this.makeRequest(
      url,
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      },
      config
    );

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body reader available');
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Validate if API Key is valid
  async validateApiKey(config: AIConfig): Promise<boolean> {
    try {
      const baseURL = await this.getBaseURL(config);
      const url = `${baseURL}/models`;

      const response = await this.makeRequest(
        url,
        {
          method: 'GET',
        },
        config
      );

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get available model list
  async getModels(config: AIConfig): Promise<string[]> {
    try {
      const baseURL = await this.getBaseURL(config);
      const url = `${baseURL}/models`;

      const response = await this.makeRequest(
        url,
        {
          method: 'GET',
        },
        config
      );

      const data = await response.json();
      return data.data?.map((model: { id: string }) => model.id) || [];
    } catch (error) {
      // Failed to fetch models
      return [];
    }
  }

  // Get recommended models for different providers
  getRecommendedModels(provider: string): string[] {
    switch (provider) {
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
      case 'deepseek':
        return ['deepseek-chat', 'deepseek-reasoner'];
      default:
        return [];
    }
  }

  // Filter models based on provider
  filterModelsByProvider(models: string[], provider: string): string[] {
    switch (provider) {
      case 'openai': {
        // Extract model ID and filter related models
        // Only return GPT models
        return models.filter(
          model =>
            model.toLowerCase().includes('gpt') || model.toLowerCase().includes('text-davinci')
        );
      }
      case 'deepseek':
        // Return all DeepSeek models
        return models.filter(model => model.toLowerCase().includes('deepseek'));
      default:
        return models;
    }
  }
}

export const aiApiService = new AIApiService();
