import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { AIConfig, MODEL_PROVIDERS, RemoteModelProvider } from '@/types/ai';

import configApi from './configApi';
import { modelService } from './modelService';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  model?: string;
  images?: string[];
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
    onChunk?: (chunk: string, done: boolean) => void
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
    onChunk?: (chunk: string, done: boolean) => void
  ): Promise<string> {
    const apiMessages = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
      images: msg.images || [],
    }));

    // Ensure using complete model name
    const modelName = config.model;
    
    try {
      // Use streaming if callback function is provided
      const useStream = !!onChunk;
      
      // If using streaming, set up listeners first
      let unlisten: (() => void) | undefined;
      let fullResponse = '';
      let responsePromiseResolve: ((value: string) => void) | undefined;
      
      // Create a Promise to track streaming response completion
      const responsePromise = new Promise<string>((resolve) => {
        responsePromiseResolve = resolve;
      });
      
      if (useStream) {
        // Listen for streaming events from Rust backend
        unlisten = await listen<{ content: string; done: boolean }>('ollama-chat-stream', (event) => {
          const { content, done } = event.payload;
          
          // Call callback function to handle each chunk
          if (content && onChunk) {
            onChunk(content, done);
          }
          
          // Accumulate complete response
          if (content) {
            fullResponse += content;
          }
          
          // When done, resolve Promise
          if (done && responsePromiseResolve) {
            responsePromiseResolve(fullResponse);
            // Clean up event listener
            if (unlisten) unlisten();
          }
        });
      }
      
      // Create request body
      const requestBody = {
        model: modelName,
        messages: apiMessages,
        stream: useStream, // Decide whether to use streaming based on callback presence
        options: {
          temperature: config.temperature || 0.7,
        },
      };

      // Call Rust backend command
      const result = await invoke<string>('generate_chat_completion', { request: requestBody });
      
      // If not using streaming, or streaming encounters issues, use returned result
      if (!useStream) {
        if (onChunk) {
          onChunk(result, true);
        }
        return result;
      } else {
        // Wait for streaming to complete
        return await responsePromise;
      }
    } catch (error) {
      console.error('Failed to generate chat completion:', error);
      throw new Error(`Chat completion failed: ${error}`);
    }
  }

  private async sendOpenAIMessage(
    messages: ChatMessage[],
    config: AIConfig,
    onChunk?: (chunk: string, done: boolean) => void
  ): Promise<string> {
    const apiMessages = messages.map(msg => {
      const content: any[] = [{ type: 'text', text: msg.content }];
      if (msg.images && msg.images.length > 0) {
        msg.images.forEach(img => {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${img}`,
            },
          });
        });
      }
      return {
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: content,
      };
    });

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
    onChunk: (chunk: string, done: boolean) => void
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
        if (done) {
          onChunk('', true);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content || '';
            const isDone = parsed.done;
            if (content) {
              fullContent += content;
              onChunk(content, isDone);
            }
            if (isDone) {
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
    onChunk: (chunk: string, done: boolean) => void
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
        if (done) {
          onChunk('', true);
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data.trim() === '[DONE]') {
              onChunk('', true);
              return fullContent;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                fullContent += content;
                onChunk(content, false);
              }
            } catch (e) {
              // Ignore JSON parsing errors
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
