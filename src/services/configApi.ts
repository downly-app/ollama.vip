import { invoke } from '@tauri-apps/api/tauri';

export interface ConfigInfo {
  config_path: string;
  user_configured_host: string | null;
  env_host: string | null;
  effective_host: string;
  user_configured_models_path: string | null;
  env_models_path: string | null;
  effective_models_path: string;
}

class ConfigApi {
  /**
   * Get the current effective Ollama host address
   * Priority: User configuration > Environment variables > Default value
   */
  async getOllamaHost(): Promise<string> {
    try {
      return await invoke<string>('get_ollama_host');
    } catch (error) {
      // Failed to get Ollama host
      // Fallback to default value
      return 'http://127.0.0.1:11434';
    }
  }

  /**
   * Set Ollama host address
   * @param host Host address, supports multiple formats:
   *   - Complete URL: http://192.168.1.100:11434
   *   - IP:Port: 192.168.1.100:11434
   *   - IP only: 192.168.1.100 (will automatically add default port 11434)
   * @returns Normalized address after setting
   */
  async setOllamaHost(host: string): Promise<string> {
    try {
      return await invoke<string>('set_ollama_host', { host });
    } catch (error) {
      // Failed to set Ollama host
      throw new Error(`Failed to set Ollama address: ${error}`);
    }
  }

  /**
   * Clear user-configured host address
   * After clearing, will fallback to environment variables or default value
   * @returns Effective address after clearing
   */
  async clearOllamaHost(): Promise<string> {
    try {
      return await invoke<string>('clear_ollama_host');
    } catch (error) {
      // Failed to clear Ollama host
      throw new Error(`Failed to clear Ollama address: ${error}`);
    }
  }

  /**
   * Get detailed configuration information (for debugging and display)
   */
  async getConfigInfo(): Promise<ConfigInfo> {
    try {
      return await invoke<ConfigInfo>('get_config_info');
    } catch (error) {
      // Failed to get config info
      throw new Error(`Failed to get configuration information: ${error}`);
    }
  }

  /**
   * Validate if the host address is accessible
   * @param host Host address to validate
   */
  async validateHost(host: string): Promise<boolean> {
    try {
      // Use Tauri backend to validate host - this avoids CORS issues
      // and centralizes the host validation logic in Rust
      return await invoke<boolean>('validate_host', { host });
    } catch (error) {
      // Host validation failed
      console.error('Host validation failed:', error);
      return false;
    }
  }

  /**
   * Frontend address normalization (consistent with backend logic)
   */
  private normalizeHost(host: string): string {
    const trimmedHost = host.trim();

    // If protocol is already included, return directly
    if (trimmedHost.startsWith('http://') || trimmedHost.startsWith('https://')) {
      return trimmedHost;
    }

    // If it's just IP:port format, add http:// prefix
    if (trimmedHost.includes(':')) {
      return `http://${trimmedHost}`;
    }

    // If it's just IP address, add default port
    return `http://${trimmedHost}:11434`;
  }

  /**
   * Get display name of host address (remove protocol prefix)
   */
  getDisplayHost(host: string): string {
    return host.replace(/^https?:\/\//, '');
  }

  /**
   * Parse host address components
   */
  parseHost(host: string): { protocol: string; hostname: string; port: string } {
    try {
      const url = new URL(host);
      return {
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
        port: url.port || '11434',
      };
    } catch (error) {
      // If not a valid URL, try to parse IP:port format
      const parts = host.split(':');
      if (parts.length === 2) {
        return {
          protocol: 'http',
          hostname: parts[0],
          port: parts[1],
        };
      }

      // Default return
      return {
        protocol: 'http',
        hostname: host,
        port: '11434',
      };
    }
  }

  /**
   * Get Ollama models storage path
   * Priority: User configuration > Environment variables > Default value
   */
  async getOllamaModelsPath(): Promise<string> {
    try {
      return await invoke<string>('get_ollama_models_path');
    } catch (error) {
      // Failed to get Ollama models path
      // Fallback to default base directory based on platform
      const isWindows = navigator.platform.toLowerCase().includes('win');
      if (isWindows) {
        return 'C:/Users/Default/.ollama';
      } else {
        return '~/.ollama';
      }
    }
  }

  /**
   * Set Ollama models storage path and update OLLAMA_MODELS environment variable
   * @param path Storage path for Ollama models
   * @returns Effective path after setting
   */
  async setOllamaModelsPath(path: string): Promise<string> {
    try {
      return await invoke<string>('set_ollama_models_path', { path });
    } catch (error) {
      // Failed to set Ollama models path
      throw new Error(`Failed to set Ollama models path: ${error}`);
    }
  }

  /**
   * Clear user-configured models path
   * After clearing, will fallback to environment variables or default value
   * @returns Effective path after clearing
   */
  async clearOllamaModelsPath(): Promise<string> {
    try {
      return await invoke<string>('clear_ollama_models_path');
    } catch (error) {
      // Failed to clear Ollama models path
      throw new Error(`Failed to clear Ollama models path: ${error}`);
    }
  }

  /**
   * Validate if the models path format is valid
   * @param path Models path to validate
   */
  async validateModelsPath(path: string): Promise<boolean> {
    try {
      // Basic path validation
      if (!path || path.trim().length === 0) {
        return false;
      }

      const trimmedPath = path.trim();

      // Check if path format is valid for the current platform
      const isWindows = navigator.platform.toLowerCase().includes('win');
      if (isWindows) {
        // Windows path validation
        // Accept: C:/path, C:\path, D:/path, etc.
        // Also accept UNC paths: //server/share or \\server\share
        const windowsAbsolutePattern = /^[a-zA-Z]:[\\//]/;
        const uncPattern = /^[\\//]{2}[^\\//]+[\\//][^\\//]/;
        return windowsAbsolutePattern.test(trimmedPath) || uncPattern.test(trimmedPath);
      } else {
        // Unix-like path validation
        // Accept: /absolute/path or ~/relative/path
        return trimmedPath.startsWith('/') || trimmedPath.startsWith('~/');
      }
    } catch (error) {
      // Models path validation failed
      return false;
    }
  }

  /**
   * Normalize models path for display and consistency
   */
  normalizeModelsPath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) return trimmed;

    // Convert backslashes to forward slashes for consistency
    let normalized = trimmed.replace(/\\/g, '/');

    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');

    return normalized;
  }

  /**
   * Restart Ollama service
   * This will stop the current Ollama service and start it again
   * @returns Success message or error
   */
  async restartOllamaService(): Promise<string> {
    try {
      return await invoke<string>('restart_ollama_service');
    } catch (error) {
      // Failed to restart Ollama service
      throw new Error(`Failed to restart Ollama service: ${error}`);
    }
  }

  /**
   * Check Ollama service status
   * @returns Service status information
   */
  async checkOllamaServiceStatus(): Promise<string> {
    try {
      return await invoke<string>('check_ollama_service_status');
    } catch (error) {
      // Failed to check Ollama service status
      throw new Error(`Failed to check Ollama service status: ${error}`);
    }
  }
}

// Export singleton instance
export const configApi = new ConfigApi();
export default configApi;
