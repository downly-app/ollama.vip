use std::fs;
use std::env;
use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use anyhow::{Result, Context};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub ollama_host: Option<String>,
    pub ollama_models_path: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ollama_host: None,
            ollama_models_path: None,
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
    
    /// Get Ollama models storage path
    /// Priority: User configuration > Environment variable > Default value
    pub fn get_ollama_models_path(&self) -> String {
        // 1. Prioritize user-configured path
        if let Some(path) = &self.config.ollama_models_path {
            if !path.is_empty() {
                // User configured path is the base .ollama directory
                return path.clone();
            }
        }
        
        // 2. Then use environment variable OLLAMA_MODELS (base directory)
        if let Ok(env_path) = env::var("OLLAMA_MODELS") {
            if !env_path.is_empty() {
                // Environment variable points to base .ollama directory
                return env_path;
            }
        }
        
        // 3. Finally use default value based on platform
        self.get_default_models_path()
    }
    
    /// Set Ollama models storage path and update environment variable
    pub fn set_ollama_models_path(&mut self, path: String) -> Result<()> {
        let normalized_path = if path.is_empty() {
            None
        } else {
            // Normalize and validate the path
            let normalized = self.normalize_models_path(&path)?;
            // Create directory if it doesn't exist
            self.ensure_models_directory_exists(&normalized)?;
            Some(normalized)
        };

        self.config.ollama_models_path = normalized_path.clone();
        self.save_config()?;

        // Set system-level environment variable
        if let Some(path) = &normalized_path {
            self.set_system_env_var("OLLAMA_MODELS", path)
                .context("Failed to set system environment variable")?;
        } else {
            self.remove_system_env_var("OLLAMA_MODELS")
                .context("Failed to remove system environment variable")?;
        }

        Ok(())
    }
    
    /// Clear user-configured models path
    pub fn clear_ollama_models_path(&mut self) -> Result<()> {
        self.config.ollama_models_path = None;
        self.save_config()?;
        
        // Remove system-level environment variable
        self.remove_system_env_var("OLLAMA_MODELS")
            .context("Failed to remove system environment variable")?;
        
        Ok(())
    }
    
    /// Get default models path based on platform
    fn get_default_models_path(&self) -> String {
        #[cfg(target_os = "windows")]
        {
            // Try multiple ways to get user directory on Windows
            let user_dir = env::var("USERPROFILE")
                .or_else(|_| {
                    // Fallback: construct from USERNAME and system drive
                    if let (Ok(username), Ok(system_drive)) = (env::var("USERNAME"), env::var("SystemDrive")) {
                        Ok(format!("{}/Users/{}", system_drive, username))
                    } else {
                        Err(env::VarError::NotPresent)
                    }
                })
                .or_else(|_| {
                    // Another fallback: use HOMEDRIVE + HOMEPATH
                    if let (Ok(drive), Ok(path)) = (env::var("HOMEDRIVE"), env::var("HOMEPATH")) {
                        Ok(format!("{}{}", drive, path))
                    } else {
                        Err(env::VarError::NotPresent)
                    }
                })
                .unwrap_or_else(|_| "C:/Users/Default".to_string());
            
            // Normalize path separators to forward slashes
            let normalized_user_dir = user_dir.replace('\\', "/");
            format!("{}/.ollama", normalized_user_dir)
        }
        
        #[cfg(target_os = "macos")]
        {
            if let Some(home) = env::var("HOME").ok() {
                format!("{}/.ollama", home)
            } else {
                "/Users/Default/.ollama".to_string()
            }
        }
        
        #[cfg(target_os = "linux")]
        {
            if let Some(home) = env::var("HOME").ok() {
                format!("{}/.ollama", home)
            } else {
                "/home/default/.ollama".to_string()
            }
        }
        
        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            "~/.ollama".to_string()
        }
    }
    
    /// Normalize models path to ensure consistent format
    fn normalize_models_path(&self, path: &str) -> Result<String> {
        let path = path.trim();
        if path.is_empty() {
            return Err(anyhow::anyhow!("Path cannot be empty"));
        }
        
        // Convert backslashes to forward slashes for consistency
        let normalized = path.replace('\\', "/");
        
        // Remove trailing slash if present
        let normalized = normalized.trim_end_matches('/');
        
        // Use the path as-is, don't append .ollama automatically
        Ok(normalized.to_string())
    }
    
    /// Ensure the models directory exists, create if necessary
    fn ensure_models_directory_exists(&self, base_path: &str) -> Result<()> {
        use std::path::Path;
        
        // Create the base directory (user specified path)
        let base_dir = Path::new(base_path);
        if !base_dir.exists() {
            fs::create_dir_all(base_dir)
                .with_context(|| format!("Failed to create directory: {}", base_path))?;
        }
        
        // Create the models subdirectory under user specified path
        let models_dir = base_dir.join("models");
        if !models_dir.exists() {
            fs::create_dir_all(&models_dir)
                .with_context(|| format!("Failed to create models directory: {}", models_dir.display()))?;
        }
        
        Ok(())
    }

    /// Set system-level environment variable
    fn set_system_env_var(&self, key: &str, value: &str) -> Result<()> {
        #[cfg(target_os = "windows")]
        {
            // Use setx command to set system environment variable on Windows
            let output = Command::new("setx")
                .args([key, value])
                .output()
                .context("Failed to execute setx command")?;
            
            if !output.status.success() {
                let error_msg = String::from_utf8_lossy(&output.stderr);
                return Err(anyhow::anyhow!(
                    "Failed to set system environment variable {}: {}", 
                    key, 
                    error_msg
                ));
            }
            
            // Also set for current process to take effect immediately
            env::set_var(key, value);
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            // For Unix systems, we need to modify shell configuration files
            // This is more complex and requires determining the user's shell
            self.set_unix_env_var(key, value)
                .context("Failed to set Unix environment variable")?;
            
            // Also set for current process
            env::set_var(key, value);
        }
        
        Ok(())
    }

    /// Remove system-level environment variable
    fn remove_system_env_var(&self, key: &str) -> Result<()> {
        #[cfg(target_os = "windows")]
        {
            // Use reg command to delete environment variable on Windows
            let _output = Command::new("reg")
                .args(["delete", "HKCU\\Environment", "/v", key, "/f"])
                .output()
                .context("Failed to execute reg delete command")?;
            
            // Note: reg delete may return non-zero exit code if variable doesn't exist
            // This is not necessarily an error, so we don't check the exit status
            
            // Remove from current process
            env::remove_var(key);
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            // For Unix systems, remove from shell configuration files
            self.remove_unix_env_var(key)
                .context("Failed to remove Unix environment variable")?;
            
            // Remove from current process
            env::remove_var(key);
        }
        
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    fn set_unix_env_var(&self, key: &str, value: &str) -> Result<()> {
        use std::path::Path;
        
        // Try to determine user's home directory
        let home_dir = env::var("HOME")
            .context("Failed to get HOME environment variable")?;
        
        // Common shell configuration files to update
        let config_files = [
            ".bashrc",
            ".zshrc",
            ".profile",
        ];
        
        let env_line = format!("export {}=\"{}\"", key, value);
        let mut updated = false;
        
        for config_file in &config_files {
            let config_path = Path::new(&home_dir).join(config_file);
            if config_path.exists() {
                // Read existing content
                let content = fs::read_to_string(&config_path)
                    .with_context(|| format!("Failed to read {}", config_file))?;
                
                // Check if the environment variable is already set
                let lines: Vec<&str> = content.lines().collect();
                let mut new_lines = Vec::new();
                let mut found = false;
                
                for line in lines {
                    if line.trim().starts_with(&format!("export {}=", key)) {
                        // Replace existing line
                        new_lines.push(env_line.clone());
                        found = true;
                    } else {
                        new_lines.push(line.to_string());
                    }
                }
                
                // If not found, append to the end
                if !found {
                    new_lines.push(env_line.clone());
                }
                
                // Write back to file
                let new_content = new_lines.join("\n") + "\n";
                fs::write(&config_path, new_content)
                    .with_context(|| format!("Failed to write {}", config_file))?;
                
                updated = true;
                break; // Only update the first existing config file
            }
        }
        
        // If no existing config file found, create .profile
        if !updated {
            let profile_path = Path::new(&home_dir).join(".profile");
            fs::write(&profile_path, format!("{}\n", env_line))
                .context("Failed to create .profile")?;
        }
        
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    fn remove_unix_env_var(&self, key: &str) -> Result<()> {
        use std::path::Path;
        
        let home_dir = env::var("HOME")
            .context("Failed to get HOME environment variable")?;
        
        let config_files = [
            ".bashrc",
            ".zshrc",
            ".profile",
        ];
        
        for config_file in &config_files {
            let config_path = Path::new(&home_dir).join(config_file);
            if config_path.exists() {
                let content = fs::read_to_string(&config_path)
                    .with_context(|| format!("Failed to read {}", config_file))?;
                
                let lines: Vec<&str> = content.lines().collect();
                let new_lines: Vec<String> = lines
                    .into_iter()
                    .filter(|line| !line.trim().starts_with(&format!("export {}=", key)))
                    .map(|s| s.to_string())
                    .collect();
                
                let new_content = new_lines.join("\n") + "\n";
                fs::write(&config_path, new_content)
                    .with_context(|| format!("Failed to write {}", config_file))?;
            }
        }
        
        Ok(())
    }
    
    /// Get current configuration information (for debugging)
    pub fn get_config_info(&self) -> ConfigInfo {
        ConfigInfo {
            config_path: self.config_path.to_string_lossy().to_string(),
            user_configured_host: self.config.ollama_host.clone(),
            env_host: env::var("OLLAMA_HOST").ok(),
            effective_host: self.get_ollama_host(),
            user_configured_models_path: self.config.ollama_models_path.clone(),
            env_models_path: env::var("OLLAMA_MODELS").ok(),
            effective_models_path: self.get_ollama_models_path(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ConfigInfo {
    pub config_path: String,
    pub user_configured_host: Option<String>,
    pub env_host: Option<String>,
    pub effective_host: String,
    pub user_configured_models_path: Option<String>,
    pub env_models_path: Option<String>,
    pub effective_models_path: String,
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

/// Tauri command: Get Ollama models storage path
#[tauri::command]
pub fn get_ollama_models_path() -> Result<String, String> {
    let manager = get_config_manager().map_err(|e| e.to_string())?;
    let manager = manager.lock().map_err(|e| e.to_string())?;
    Ok(manager.get_ollama_models_path())
}

/// Tauri command: Set Ollama models storage path
#[tauri::command]
pub fn set_ollama_models_path(path: String) -> Result<String, String> {
    let manager = get_config_manager().map_err(|e| e.to_string())?;
    let mut manager = manager.lock().map_err(|e| e.to_string())?;
    manager.set_ollama_models_path(path).map_err(|e| e.to_string())?;
    Ok(manager.get_ollama_models_path())
}

/// Tauri command: Clear user-configured models path
#[tauri::command]
pub fn clear_ollama_models_path() -> Result<String, String> {
    let manager = get_config_manager().map_err(|e| e.to_string())?;
    let mut manager = manager.lock().map_err(|e| e.to_string())?;
    manager.clear_ollama_models_path().map_err(|e| e.to_string())?;
    Ok(manager.get_ollama_models_path())
}

/// Tauri command: Restart Ollama service with new environment variables
#[tauri::command]
pub fn restart_ollama_service() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Stop Ollama service
        let _stop_result = Command::new("taskkill")
            .args(["/F", "/IM", "ollama.exe"])
            .output();
        
        // Wait a moment for the process to terminate
        std::thread::sleep(std::time::Duration::from_secs(2));
        
        // Start Ollama service
        let start_result = Command::new("ollama")
            .args(["serve"])
            .spawn();
        
        match start_result {
            Ok(_) => Ok("Ollama service restarted successfully. Please wait a moment for it to initialize.".to_string()),
            Err(e) => Err(format!("Failed to start Ollama service: {}. Please start it manually.", e))
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // For Unix systems, try to stop and start Ollama
        let stop_result = Command::new("pkill")
            .args(["-f", "ollama"])
            .output();
        
        // Wait a moment for the process to terminate
        std::thread::sleep(std::time::Duration::from_secs(2));
        
        // Start Ollama service
        let start_result = Command::new("ollama")
            .args(["serve"])
            .spawn();
        
        match start_result {
            Ok(_) => Ok("Ollama service restarted successfully. Please wait a moment for it to initialize.".to_string()),
            Err(e) => Err(format!("Failed to start Ollama service: {}. Please start it manually.", e))
        }
    }
}

/// Tauri command: Check if Ollama service is running
#[tauri::command]
pub fn check_ollama_service_status() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("tasklist")
            .args(["/FI", "IMAGENAME eq ollama.exe"])
            .output()
            .map_err(|e| format!("Failed to check service status: {}", e))?;
        
        let output_str = String::from_utf8_lossy(&output.stdout);
        Ok(output_str.contains("ollama.exe"))
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("pgrep")
            .args(["-f", "ollama"])
            .output()
            .map_err(|e| format!("Failed to check service status: {}", e))?;
        
        Ok(output.status.success())
    }
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