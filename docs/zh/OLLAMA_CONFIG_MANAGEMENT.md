# Ollama 配置管理系统

## 概述

本系统实现了完整的Ollama API地址配置管理功能，支持多层级的配置优先级和持久化存储。

## 功能特性 ✨

### 🎯 配置优先级
1. **用户配置** (最高优先级) - 通过前端界面设置的地址
2. **环境变量** - 系统环境变量 `OLLAMA_HOST`
3. **默认值** (最低优先级) - `http://127.0.0.1:11434`

### 📁 配置存储
- **配置文件位置**: `~/.config/ollama-pro/config.toml` (Linux/macOS) 或 `%APPDATA%\ollama-pro\config.toml` (Windows)
- **格式**: TOML格式，易于阅读和编辑
- **自动创建**: 配置目录和文件会自动创建

### 🔧 地址格式支持
支持多种输入格式，自动标准化：
- **完整URL**: `http://192.168.1.100:11434`
- **IP:端口**: `192.168.1.100:11434` → `http://192.168.1.100:11434`
- **仅IP地址**: `192.168.1.100` → `http://192.168.1.100:11434`
- **域名**: `api.example.com` → `http://api.example.com:11434`

## 技术架构 🏗️

### Rust 后端 (src-tauri/src/config_manager.rs)

#### 核心结构
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub ollama_host: Option<String>,
}

pub struct ConfigManager {
    config_path: PathBuf,
    config: AppConfig,
}
```

#### 主要功能
- ✅ **配置加载**: 从TOML文件加载配置
- ✅ **配置保存**: 持久化配置到文件
- ✅ **地址标准化**: 统一地址格式
- ✅ **优先级处理**: 按优先级获取有效地址
- ✅ **线程安全**: 使用Mutex保护全局实例

#### Tauri 命令
```rust
#[tauri::command]
pub fn get_ollama_host() -> Result<String, String>

#[tauri::command]
pub fn set_ollama_host(host: String) -> Result<String, String>

#[tauri::command]
pub fn clear_ollama_host() -> Result<String, String>

#[tauri::command]
pub fn get_config_info() -> Result<ConfigInfo, String>
```

### TypeScript 前端 (src/services/configApi.ts)

#### 核心接口
```typescript
export interface ConfigInfo {
  config_path: string;
  user_configured_host: string | null;
  env_host: string | null;
  effective_host: string;
}

class ConfigApi {
  async getOllamaHost(): Promise<string>
  async setOllamaHost(host: string): Promise<string>
  async clearOllamaHost(): Promise<string>
  async getConfigInfo(): Promise<ConfigInfo>
  async validateHost(host: string): Promise<boolean>
}
```

#### 主要功能
- ✅ **地址获取**: 获取当前有效的API地址
- ✅ **地址设置**: 设置并验证新的API地址
- ✅ **地址清除**: 清除用户配置，回退到环境变量或默认值
- ✅ **连接验证**: 验证地址是否可访问
- ✅ **错误处理**: 完善的错误处理和降级机制

## 使用示例 📝

### 环境变量配置
```bash
# Linux/macOS
export OLLAMA_HOST=10.10.99.33:11434

# Windows
set OLLAMA_HOST=10.10.99.33:11434
```

### 前端使用
```typescript
import configApi from '@/services/configApi';

// 获取当前地址
const currentHost = await configApi.getOllamaHost();

// 设置新地址
const newHost = await configApi.setOllamaHost('192.168.1.100:11434');

// 验证地址
const isValid = await configApi.validateHost('192.168.1.100:11434');

// 获取配置详情
const configInfo = await configApi.getConfigInfo();
```

### 配置文件示例
```toml
# ~/.config/ollama-pro/config.toml
ollama_host = "http://192.168.1.100:11434"
```

## 集成说明 🔗

### OllamaServiceStatus 组件集成

#### 初始化流程
1. **获取配置地址**: 从Rust后端获取有效的API地址
2. **更新API配置**: 设置ollamaApi的baseUrl
3. **检查连接**: 验证API连接状态
4. **获取数据**: 获取模型和系统资源数据

#### 地址修改流程
1. **用户输入**: 在界面中输入新的API地址
2. **保存配置**: 调用configApi.setOllamaHost()保存
3. **地址标准化**: 后端自动标准化地址格式
4. **更新API**: 更新ollamaApi配置
5. **重新连接**: 自动检查新地址的连接状态

## 错误处理 🛡️

### 后端错误处理
```rust
// 配置加载失败时使用默认配置
fn load_config(config_path: &PathBuf) -> Result<AppConfig> {
    if config_path.exists() {
        // 尝试加载配置文件
        let content = fs::read_to_string(config_path)?;
        let config: AppConfig = toml::from_str(&content)?;
        Ok(config)
    } else {
        // 文件不存在时使用默认配置
        Ok(AppConfig::default())
    }
}
```

### 前端错误处理
```typescript
async getOllamaHost(): Promise<string> {
  try {
    return await invoke<string>('get_ollama_host');
  } catch (error) {
    console.error('Failed to get Ollama host:', error);
    // 降级到默认值
    return 'http://127.0.0.1:11434';
  }
}
```

## 测试策略 🧪

### 单元测试
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_normalize_host() {
        let manager = ConfigManager { /* ... */ };
        
        // 测试各种地址格式
        assert_eq!(manager.normalize_host("192.168.1.100:11434"), 
                   "http://192.168.1.100:11434");
        assert_eq!(manager.normalize_host("192.168.1.100"), 
                   "http://192.168.1.100:11434");
    }
}
```

### 集成测试场景
1. **默认配置测试**: 无配置文件和环境变量时使用默认值
2. **环境变量测试**: 设置OLLAMA_HOST环境变量
3. **用户配置测试**: 通过界面设置自定义地址
4. **优先级测试**: 验证配置优先级正确性
5. **地址格式测试**: 测试各种输入格式的标准化
6. **错误恢复测试**: 测试配置文件损坏时的恢复机制

## 部署注意事项 📋

### 权限要求
- **配置目录**: 需要在用户配置目录创建文件夹的权限
- **文件读写**: 需要读写配置文件的权限

### 跨平台兼容性
- ✅ **Windows**: 使用 `%APPDATA%\ollama-pro\`
- ✅ **macOS**: 使用 `~/Library/Application Support/ollama-pro/`
- ✅ **Linux**: 使用 `~/.config/ollama-pro/`

### 环境变量
```bash
# 生产环境建议设置
OLLAMA_HOST=your-ollama-server:11434

# 开发环境
OLLAMA_HOST=localhost:11434
```

## 故障排除 🔧

### 常见问题

#### 1. 配置文件无法创建
**症状**: 启动时报错"Failed to create config directory"
**解决**: 检查用户目录权限，确保应用有写入权限

#### 2. 环境变量不生效
**症状**: 设置了OLLAMA_HOST但仍使用默认地址
**解决**: 
- 检查环境变量是否正确设置
- 重启应用程序
- 确认没有用户配置覆盖环境变量

#### 3. 地址格式错误
**症状**: 设置地址后无法连接
**解决**: 
- 检查地址格式是否正确
- 确认端口号是否正确
- 使用validateHost()方法验证连接

#### 4. 配置文件损坏
**症状**: 启动时报错"Failed to parse config file"
**解决**: 
- 删除配置文件让应用重新创建
- 或手动修复TOML格式错误

### 调试工具
```typescript
// 获取详细配置信息用于调试
const debugInfo = await configApi.getConfigInfo();
console.log('Config Debug Info:', debugInfo);
```

## 未来扩展 🚀

### 计划功能
- [ ] **多服务器配置**: 支持配置多个Ollama服务器
- [ ] **自动发现**: 局域网内自动发现Ollama服务
- [ ] **健康检查**: 定期检查服务器健康状态
- [ ] **负载均衡**: 多服务器间的负载均衡
- [ ] **配置导入导出**: 支持配置的备份和恢复

### 性能优化
- [ ] **配置缓存**: 减少文件读取频率
- [ ] **连接池**: 复用HTTP连接
- [ ] **异步验证**: 后台验证服务器状态

## 总结 📊

本配置管理系统提供了：

✅ **完整的配置层级**: 用户配置 > 环境变量 > 默认值
✅ **持久化存储**: TOML格式配置文件
✅ **地址标准化**: 支持多种输入格式
✅ **错误处理**: 完善的降级和恢复机制
✅ **跨平台支持**: Windows/macOS/Linux
✅ **类型安全**: Rust + TypeScript 全栈类型安全
✅ **易于使用**: 简洁的API接口
✅ **可扩展性**: 为未来功能预留扩展空间

这个系统确保了Ollama API地址的灵活配置和可靠管理，为用户提供了良好的使用体验。 