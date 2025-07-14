import { invoke } from '@tauri-apps/api/tauri';
import { 
  OllamaModel, 
  OllamaRunningModel, 
  OllamaVersion, 
  OllamaModelInfo 
} from './ollamaApi';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  images?: string[];
  tool_calls?: any[];
}

export interface GenerateRequest {
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

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools?: any[];
  format?: string | object;
  options?: Record<string, any>;
  stream?: boolean;
  keep_alive?: string | number;
}

export interface ModelInfo {
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

class OllamaTauriAPI {
  /**
   * Check Ollama service connection
   */
  async checkConnection(): Promise<boolean> {
    try {
      const isConnected = await invoke<boolean>('check_connection');
      return isConnected;
    } catch (error) {
      console.error('Failed to check Ollama connection:', error);
      return false;
    }
  }

  /**
   * Get Ollama version information
   */
  async getVersion(): Promise<OllamaVersion | null> {
    try {
      const version = await invoke<OllamaVersion>('get_version');
      return version;
    } catch (error) {
      console.error('Failed to get Ollama version:', error);
      return null;
    }
  }

  /**
   * Get local model list
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const models = await invoke<OllamaModel[]>('list_models');
      return models || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  /**
   * List running models
   */
  async listRunningModels(): Promise<OllamaRunningModel[]> {
    try {
      const models = await invoke<OllamaRunningModel[]>('list_running_models');
      return models || [];
    } catch (error) {
      console.error('Failed to list running Ollama models:', error);
      return [];
    }
  }

  /**
   * Show model information
   */
  async showModelInfo(modelName: string, verbose: boolean = false): Promise<ModelInfo | null> {
    try {
      const modelInfo = await invoke<ModelInfo>('show_model_info', { 
        modelName, 
        verbose 
      });
      return modelInfo;
    } catch (error) {
      console.error('Failed to get model info:', error);
      return null;
    }
  }

  /**
   * Copy model
   */
  async copyModel(source: string, destination: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('copy_model', { 
        source, 
        destination 
      });
      return success;
    } catch (error) {
      console.error('Failed to copy model:', error);
      return false;
    }
  }

  /**
   * Delete model
   */
  async deleteModel(modelName: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('delete_model', { 
        modelName 
      });
      return success;
    } catch (error) {
      console.error('Failed to delete model:', error);
      return false;
    }
  }

  /**
   * Pull model - non-streaming implementation
   */
  async pullModel(modelName: string): Promise<string> {
    try {
      const result = await invoke<string>('pull_model', { 
        modelName 
      });
      return result;
    } catch (error) {
      console.error('Failed to pull model:', error);
      throw new Error(`Failed to pull model: ${error}`);
    }
  }

  /**
   * Push model - non-streaming implementation
   */
  async pushModel(modelName: string, insecure: boolean = false): Promise<string> {
    try {
      const result = await invoke<string>('push_model', { 
        modelName,
        insecure 
      });
      return result;
    } catch (error) {
      console.error('Failed to push model:', error);
      throw new Error(`Failed to push model: ${error}`);
    }
  }

  /**
   * Generate text completion
   */
  async generateCompletion(request: GenerateRequest): Promise<string> {
    try {
      const response = await invoke<string>('generate_completion', { 
        request 
      });
      return response;
    } catch (error) {
      console.error('Failed to generate completion:', error);
      throw new Error(`Failed to generate completion: ${error}`);
    }
  }

  /**
   * Generate chat response
   */
  async generateChat(request: ChatRequest): Promise<ChatMessage> {
    try {
      const response = await invoke<ChatMessage>('generate_chat', { 
        request 
      });
      return response;
    } catch (error) {
      console.error('Failed to generate chat:', error);
      throw new Error(`Failed to generate chat: ${error}`);
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(
    model: string,
    input: string | string[],
    options?: Record<string, any>
  ): Promise<{ embeddings: number[][]; model: string; total_duration: number }> {
    try {
      // Convert input to the format expected by Rust
      const inputValue = Array.isArray(input) ? input : input;
      
      const response = await invoke<{ embeddings: number[][]; model: string; total_duration: number }>(
        'generate_embeddings', 
        { 
          model,
          input: inputValue,
          options
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Create model
   */
  async createModel(
    modelName: string,
    from?: string,
    modelfile?: string
  ): Promise<string> {
    try {
      const result = await invoke<string>('create_model', {
        modelName,
        from,
        modelfile
      });
      return result;
    } catch (error) {
      console.error('Failed to create model:', error);
      throw new Error(`Failed to create model: ${error}`);
    }
  }

  /**
   * Load model into memory
   */
  async loadModel(modelName: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('load_model', { 
        modelName 
      });
      return success;
    } catch (error) {
      console.error('Failed to load model:', error);
      return false;
    }
  }

  /**
   * Unload model
   */
  async unloadModel(modelName: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('unload_model', { 
        modelName 
      });
      return success;
    } catch (error) {
      console.error('Failed to unload model:', error);
      return false;
    }
  }

  /**
   * Method for backward compatibility
   */
  async generateResponse(
    model: string,
    prompt: string
  ): Promise<string> {
    return this.generateCompletion({
      model,
      prompt
    });
  }

  /**
   * Restart Ollama service
   * This method simply forwards to the existing restart_ollama Tauri command
   */
  async restartOllama(): Promise<string> {
    try {
      const result = await invoke<string>('restart_ollama');
      return result;
    } catch (error) {
      console.error('Failed to restart Ollama:', error);
      throw new Error(`Failed to restart Ollama: ${error}`);
    }
  }
}

export const ollamaTauriApi = new OllamaTauriAPI();
export default OllamaTauriAPI;
