import { invoke } from '@tauri-apps/api/tauri';

export interface ConfigInfo {
  config_path: string;
  user_configured_host: string | null;
  env_host: string | null;
  effective_host: string;
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
      console.error('Failed to get Ollama host:', error);
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
      console.error('Failed to set Ollama host:', error);
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
      console.error('Failed to clear Ollama host:', error);
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
      console.error('Failed to get config info:', error);
      throw new Error(`Failed to get configuration information: ${error}`);
    }
  }

  /**
   * Validate if the host address is accessible
   * @param host Host address to validate
   */
  async validateHost(host: string): Promise<boolean> {
    try {
      // Normalize address
      const normalizedHost = this.normalizeHost(host);
      
      // Use AbortController to implement timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Try to access /api/version endpoint
      const response = await fetch(`${normalizedHost}/api/version`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
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
        port: url.port || '11434'
      };
    } catch (error) {
      // If not a valid URL, try to parse IP:port format
      const parts = host.split(':');
      if (parts.length === 2) {
        return {
          protocol: 'http',
          hostname: parts[0],
          port: parts[1]
        };
      }
      
      // Default return
      return {
        protocol: 'http',
        hostname: host,
        port: '11434'
      };
    }
  }
}

// Export singleton instance
export const configApi = new ConfigApi();
export default configApi;