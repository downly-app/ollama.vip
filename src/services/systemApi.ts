import { invoke } from '@tauri-apps/api/tauri';
import { SystemInfo } from '../types/system';

export class SystemApi {
  /**
   * Get system resource information
   */
  static async getSystemResources(): Promise<SystemInfo> {
    try {
      const result = await invoke<SystemInfo>('get_system_resources');
      return result;
    } catch (error) {
      console.error('Failed to get system resources:', error);
      throw new Error(`Failed to get system resources: ${error}`);
    }
  }

  /**
   * Format bytes to human readable format
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format memory size (from GB)
   */
  static formatMemoryFromGB(gb: number): string {
    return `${gb.toFixed(1)} GB`;
  }

  /**
   * Format GPU memory (from MB)
   */
  static formatGpuMemoryFromMB(mb: number): string {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  }

  /**
   * Get color class for usage rate
   */
  static getUsageColorClass(usage: number): string {
    if (usage >= 80) return 'text-red-400';
    if (usage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  }

  /**
   * Get progress bar color for usage rate
   */
  static getUsageProgressColor(usage: number): string {
    if (usage >= 80) return 'from-red-500 to-red-600';
    if (usage >= 60) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  }
}

export default SystemApi;