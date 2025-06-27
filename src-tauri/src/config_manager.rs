use std::fs;
use std::env;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use anyhow::{Result, Context};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub ollama_host: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ollama_host: None,
        }
    }
}

pub struct ConfigManager {
    config_path: PathBuf,
    config: AppConfig,
}

impl ConfigManager {
    pub fn new() -> Result<Self> {
        let config_dir = dirs::config_dir()
            .context("Failed to get config directory")?
            .join("ollama-pro");
        
        // Ensure config directory exists
        fs::create_dir_all(&config_dir)
            .context("Failed to create config directory")?;
        
        let config_path = config_dir.join("config.toml");
        let config = Self::load_config(&config_path)?;
        
        Ok(Self {
            config_path,
            config,
        })
    }
    
    fn load_config(config_path: &PathBuf) -> Result<AppConfig> {
        if config_path.exists() {
            let content = fs::read_to_string(config_path)
                .context("Failed to read config file")?;
            let config: AppConfig = toml::from_str(&content)
                .context("Failed to parse config file")?;
            Ok(config)
        } else {
            Ok(AppConfig::default())
        }
    }
    
    pub fn save_config(&self) -> Result<()> {
        let content = toml::to_string_pretty(&self.config)
            .context("Failed to serialize config")?;
        fs::write(&self.config_path, content)
            .context("Failed to write config file")?;
        Ok(())
    }
    
    /// Get Ollama API address
    /// Priority: User configuration > Environment variable > Default value
    pub fn get_ollama_host(&self) -> String {
        // 1. Prioritize user-configured address
        if let Some(host) = &self.config.ollama_host {
            if !host.is_empty() {
                return self.normalize_host(host);
            }
        }
        
        // 2. Then use environment variable OLLAMA_HOST
        if let Ok(env_host) = env::var("OLLAMA_HOST") {
            if !env_host.is_empty() {
                return self.normalize_host(&env_host);
            }
        }
        
        // 3. Finally use default value
        "http://127.0.0.1:11434".to_string()
    }
    
    /// Set Ollama API address
    pub fn set_ollama_host(&mut self, host: String) -> Result<()> {
        let normalized_host = if host.is_empty() {
            None
        } else {
            Some(self.normalize_host(&host))
        };
        
        self.config.ollama_host = normalized_host;
        self.save_config()?;
        Ok(())
    }
    
    /// Clear user-configured address (fallback to environment variable or default value)
    pub fn clear_ollama_host(&mut self) -> Result<()> {
        self.config.ollama_host = None;
        self.save_config()?;
        Ok(())
    }
    
    /// Normalize host address format
    fn normalize_host(&self, host: &str) -> String {
        let host = host.trim();
        
        // If already contains protocol, return directly
        if host.starts_with("http://") || host.starts_with("https://") {
            return host.to_string();
        }
        
        // If only IP:port format, add http:// prefix
        if host.contains(':') {
            return format!("http://{}", host);
        }
        
        // If only IP address, add default port
        format!("http://{}:11434", host)
    }
    
    /// Get current configuration information (for debugging)
    pub fn get_config_info(&self) -> ConfigInfo {
        ConfigInfo {
            config_path: self.config_path.to_string_lossy().to_string(),
            user_configured_host: self.config.ollama_host.clone(),
            env_host: env::var("OLLAMA_HOST").ok(),
            effective_host: self.get_ollama_host(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ConfigInfo {
    pub config_path: String,
    pub user_configured_host: Option<String>,
    pub env_host: Option<String>,
    pub effective_host: String,
}

// Global configuration manager instance
use std::sync::{Mutex, OnceLock};

static CONFIG_MANAGER: OnceLock<Mutex<ConfigManager>> = OnceLock::new();

pub fn get_config_manager() -> Result<&'static Mutex<ConfigManager>, String> {
    CONFIG_MANAGER.get_or_init(|| {
        match ConfigManager::new() {
            Ok(manager) => Mutex::new(manager),
            Err(e) => {
                eprintln!("Failed to initialize config manager: {}", e);
                // If initialization fails, create a default configuration manager
                Mutex::new(ConfigManager {
                    config_path: std::path::PathBuf::from("config.toml"),
                    config: AppConfig::default(),
                })
            }
        }
    });
    
    Ok(CONFIG_MANAGER.get().unwrap())
}

/// Tauri command: Get Ollama host address
#[tauri::command]
pub fn get_ollama_host() -> Result<String, String> {
    let manager = get_config_manager().map_err(|e| e.to_string())?;
    let manager = manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.get_ollama_host())
}

/// Tauri command: Set Ollama host address
#[tauri::command]
pub fn set_ollama_host(host: String) -> Result<String, String> {
    let manager = get_config_manager().map_err(|e| e.to_string())?;
    let mut manager = manager.lock().map_err(|e| e.to_string())?;
    manager.set_ollama_host(host).map_err(|e| e.to_string())?;
    Ok(manager.get_ollama_host())
}

/// Tauri command: Clear user-configured host address
#[tauri::command]
pub fn clear_ollama_host() -> Result<String, String> {
    let manager = get_config_manager().map_err(|e| e.to_string())?;
    let mut manager = manager.lock().map_err(|e| e.to_string())?;
    manager.clear_ollama_host().map_err(|e| e.to_string())?;
    Ok(manager.get_ollama_host())
}

/// Tauri command: Get configuration information
#[tauri::command]
pub fn get_config_info() -> Result<ConfigInfo, String> {
    let manager = get_config_manager().map_err(|e| e.to_string())?;
    let manager = manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.get_config_info())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_normalize_host() {
        let manager = ConfigManager {
            config_path: PathBuf::new(),
            config: AppConfig::default(),
        };
        
        // Test complete URL
        assert_eq!(manager.normalize_host("http://192.168.1.100:11434"), "http://192.168.1.100:11434");
        assert_eq!(manager.normalize_host("https://api.example.com:8080"), "https://api.example.com:8080");
        
        // Test IP:port format
        assert_eq!(manager.normalize_host("192.168.1.100:11434"), "http://192.168.1.100:11434");
        assert_eq!(manager.normalize_host("10.10.99.33:11434"), "http://10.10.99.33:11434");
        
        // Test IP only case
        assert_eq!(manager.normalize_host("192.168.1.100"), "http://192.168.1.100:11434");
        assert_eq!(manager.normalize_host("localhost"), "http://localhost:11434");
    }
    
    #[test]
    fn test_host_priority() {
        // This test needs to run in actual environment as it involves file system operations
        // Here just showing the test structure
    }
}