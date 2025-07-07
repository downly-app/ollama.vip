import { invoke } from '@tauri-apps/api/tauri';

import { safeGetFromStorage } from '@/utils/dataUtils';

import configApi from './configApi';

export interface OllamaModel {
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

export interface OllamaRunningModel {
  name: string;
  model: string;
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
  expires_at: string;
  size_vram: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  tool_calls?: any[];
}

interface GenerateRequest {
  model: string;
  prompt: string;
  suffix?: string;
  images?: string[];
  format?: string | object;
  options?: Record<string, any>;
  system?: string;
  template?: string;
  stream?: boolean;
  raw?: boolean;
  keep_alive?: string | number;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: any[];
  format?: string | object;
  options?: Record<string, any>;
  stream?: boolean;
  keep_alive?: string | number;
}

interface ModelInfo {
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  model_info: Record<string, any>;
  capabilities: string[];
}

export interface OllamaVersion {
  version: string;
}

export interface OllamaModelInfo {
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  model_info: Record<string, any>;
}

export interface OllamaConfig {
  baseUrl: string;
}

class OllamaAPI {
  private config: OllamaConfig = {
    baseUrl: 'http://localhost:11434',
  };

  /**
   * Get current effective base URL
   * Get latest address from configApi before each API call
   */
  private async getBaseUrl(): Promise<string> {
    try {
      const host = await configApi.getOllamaHost();
      // OllamaAPI: Using host from configApi
      return host;
    } catch (error) {
      // OllamaAPI: Failed to get host from configApi, using fallback
      return this.config.baseUrl;
    }
  }

  /**
   * Update configuration (keep this method for compatibility with existing code, but will be overridden by getBaseUrl())
   */
  updateConfig(newConfig: Partial<OllamaConfig>) {
    this.config = { ...this.config, ...newConfig };
    // OllamaAPI: Config updated (will be overridden by configApi)
  }

  /**
   * Check Ollama service connection
   */
  async checkConnection(): Promise<boolean> {
    try {
      const baseUrl = await this.getBaseUrl();
      // OllamaAPI: Checking connection to

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/api/version`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const isConnected = response.ok;
      // OllamaAPI: Connection check result
      return isConnected;
    } catch (error) {
      // OllamaAPI: Connection check failed
      return false;
    }
  }

  /**
   * Get Ollama version information
   */
  async getVersion(): Promise<OllamaVersion | null> {
    try {
      const baseUrl = await this.getBaseUrl();
      // OllamaAPI: Getting version from

      const response = await fetch(`${baseUrl}/api/version`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const version = await response.json();
      // OllamaAPI: Version info
      return version;
    } catch (error) {
      // OllamaAPI: Failed to get version
      return null;
    }
  }

  /**
   * Get local model list
   */
  async listModels(): Promise<OllamaModel[]> {
    const baseUrl = await this.getBaseUrl();
    // OllamaAPI: Listing models from

    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // OllamaAPI: Models list
    return data.models || [];
  }

  // Generate text completion
  async generateCompletion(
    request: GenerateRequest,
    onStreamData?: (data: string) => void
  ): Promise<string> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate completion: ${response.statusText}`);
    }

    if (onStreamData && request.stream !== false) {
      return await this.handleStreamResponse(response, onStreamData, 'generate');
    } else {
      const data = await response.json();
      return data.response || '';
    }
  }

  // Generate chat conversation
  async generateChat(
    request: ChatRequest,
    onStreamData?: (data: string) => void
  ): Promise<ChatMessage> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate chat: ${response.statusText}`);
    }

    if (onStreamData && request.stream !== false) {
      const content = await this.handleStreamResponse(response, onStreamData, 'chat');
      return {
        role: 'assistant',
        content,
      };
    } else {
      const data = await response.json();
      return data.message || { role: 'assistant', content: '' };
    }
  }

  // Show model information
  async showModelInfo(modelName: string, verbose: boolean = false): Promise<ModelInfo | null> {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          verbose,
        }),
      });
      if (!response.ok) throw new Error('Failed to get model info');
      return await response.json();
    } catch (error) {
      // Failed to get model info
      return null;
    }
  }

  // Copy model
  async copyModel(source: string, destination: string): Promise<boolean> {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/copy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          destination,
        }),
      });
      return response.ok;
    } catch (error) {
      // Failed to copy model
      return false;
    }
  }

  // Delete model
  async deleteModel(modelName: string): Promise<boolean> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName }),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete model: ${response.statusText}`);
    }
    return response.ok;
  }

  // Pull model
  async pullModel(
    modelName: string,
    onProgress?: (progress: any) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
      signal, // Pass signal to fetch
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to pull model: ${response.statusText} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last, possibly incomplete, line

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const progressData = JSON.parse(line);
          if (onProgress) {
            onProgress(progressData);
          }
        } catch (error) {
          // Failed to parse progress update
        }
      }
    }
  }

  // Push model
  async pushModel(
    modelName: string,
    onProgress?: (progress: any) => void,
    insecure: boolean = false
  ): Promise<void> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        stream: true,
        insecure,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to push model: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (onProgress) {
              onProgress(data);
            }
          } catch (e) {
            // Ignore invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Generate embeddings
  async generateEmbeddings(
    model: string,
    input: string | string[],
    options?: Record<string, any>
  ): Promise<{ embeddings: number[][]; model: string; total_duration: number }> {
    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate embeddings: ${response.statusText}`);
    }

    return await response.json();
  }

  // List running models
  async listRunningModels(): Promise<OllamaRunningModel[]> {
    try {
      const baseUrl = await this.getBaseUrl();
      const response = await fetch(`${baseUrl}/api/ps`);
      if (!response.ok) throw new Error('Failed to fetch running models');
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      // Failed to fetch running models
      return [];
    }
  }

  // Create model
  async createModel(
    modelName: string,
    from?: string,
    modelfile?: string,
    onProgress?: (progress: any) => void
  ): Promise<void> {
    const body: any = { model: modelName, stream: true };
    if (from) body.from = from;
    if (modelfile) body.modelfile = modelfile;

    const baseUrl = await this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to create model: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (onProgress) {
              onProgress(data);
            }
          } catch (e) {
            // Ignore invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Helper method for handling streaming responses
  private async handleStreamResponse(
    response: Response,
    onStreamData: (data: string) => void,
    type: 'generate' | 'chat' = 'generate'
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            let content = '';

            if (type === 'chat' && data.message?.content) {
              content = data.message.content;
            } else if (type === 'generate' && data.response) {
              content = data.response;
            }

            if (content) {
              fullResponse += content;
              onStreamData(content);
            }
          } catch (e) {
            // Ignore invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  // Load model into memory
  async loadModel(modelName: string): Promise<boolean> {
    try {
      const response = await this.generateCompletion({
        model: modelName,
        prompt: '',
        stream: false,
      });
      return true;
    } catch (error) {
      // Failed to load model
      return false;
    }
  }

  // Unload model
  async unloadModel(modelName: string): Promise<boolean> {
    try {
      const response = await this.generateCompletion({
        model: modelName,
        prompt: '',
        keep_alive: 0,
        stream: false,
      });
      return true;
    } catch (error) {
      // Failed to unload model
      return false;
    }
  }

  // Method for backward compatibility
  async generateResponse(
    model: string,
    prompt: string,
    onStreamData?: (data: string) => void
  ): Promise<string> {
    return this.generateCompletion(
      {
        model,
        prompt,
        stream: !!onStreamData,
      },
      onStreamData
    );
  }

  /**
   * Restart Ollama service
   * Note: This feature only supports local operations, not remote restart
   * @returns Promise<string> Restart result message
   * @throws Error If restart fails
   */
  async restartOllama(): Promise<string> {
    try {
      const result = await invoke<string>('restart_ollama');
      // Ollama restart result
      return result;
    } catch (error) {
      // Failed to restart Ollama

      // Parse error type and provide more friendly error message
      const errorMessage = this.parseRestartError(error as string);
      throw new Error(errorMessage);
    }
  }

  /**
   * Parse restart error and return user-friendly error message
   * @param error Original error message
   * @returns Formatted error message
   */
  private parseRestartError(error: string): string {
    const errorStr = error.toString().toLowerCase();

    // Permission related errors
    if (errorStr.includes('administrator') || errorStr.includes('permission')) {
      return `Insufficient permissions: ${error}\n\nSuggested solutions:\n• Windows: Right-click app icon and select "Run as administrator"\n• macOS/Linux: Use sudo privileges or manually restart Ollama in terminal`;
    }

    // Ollama not installed error
    if (
      errorStr.includes('not found') ||
      errorStr.includes('path') ||
      errorStr.includes('download')
    ) {
      return `Ollama not installed or not found: ${error}\n\nPlease visit https://ollama.ai/download to download and install Ollama`;
    }

    // Command unavailable error
    if (errorStr.includes('command not found') || errorStr.includes('procps')) {
      return `System command missing: ${error}\n\nPlease ensure system integrity or install necessary system tools`;
    }

    // Default error message
    return `Failed to restart Ollama: ${error}\n\nPlease check:\n• Whether Ollama is correctly installed\n• Whether the application has sufficient permissions\n• System firewall settings`;
  }
}

export const ollamaApi = new OllamaAPI();
export default OllamaAPI;
export type { ChatMessage, GenerateRequest, ChatRequest, ModelInfo };
