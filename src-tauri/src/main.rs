// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Window, PhysicalPosition, LogicalPosition, LogicalSize};
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::PathBuf;
use serde_json::Value;

mod system_monitor;
use system_monitor::{SystemInfo, get_system_info};

mod config_manager;
use config_manager::{get_ollama_host, set_ollama_host, clear_ollama_host, get_config_info};

// Window state structure for serialization and deserialization
#[derive(Serialize, Deserialize, Debug, Clone)]
struct WindowState {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
    maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        // Dynamically read minimum size from tauri config file
        let (default_width, default_height) = get_window_config();
        
        Self {
            x: 100,
            y: 100,
            width: default_width,
            height: default_height,
            maximized: false,
        }
    }
}

// Check if ollama command is available
fn is_ollama_available() -> bool {
    use std::process::Command;
    
    Command::new("ollama")
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

// Check if specified command is available
fn is_command_available(command: &str) -> bool {
    use std::process::Command;
    
    Command::new(command)
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or_else(|_| {
            // If --version fails, try --help
            Command::new(command)
                .arg("--help")
                .output()
                .map(|output| output.status.success())
                .unwrap_or(false)
        })
}



// Windows: Check if running as administrator
#[cfg(target_os = "windows")]
fn is_admin_windows() -> bool {
    use std::process::Command;
    
    // Use net session command to check administrator privileges
    Command::new("net")
        .args(["session"])
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

// Windows: Request administrator privilege restart
#[cfg(target_os = "windows")]
fn request_admin_restart_windows() -> Result<String, String> {
    Err("Administrator privileges are required to restart Ollama service. Please run this application as administrator.\n\nSteps:\n1. Right-click the application icon\n2. Select 'Run as administrator'\n3. Try the restart operation again".to_string())
}

// Unix system: Request sudo privilege restart
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn request_sudo_restart_unix(os_name: &str) -> Result<String, String> {
    Err(format!("Administrator privileges are required to restart Ollama service on {}.\n\nPlease manually execute the following commands in terminal:\n1. sudo pkill -f ollama\n2. ollama serve\n\nOr run this application with administrator privileges.", os_name))
}

// Read window configuration from tauri.conf.json
fn get_window_config() -> (u32, u32) {
    let config_path = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("tauri.conf.json");
    
    if let Ok(content) = fs::read_to_string(&config_path) {
        if let Ok(json) = serde_json::from_str::<Value>(&content) {
            if let (Some(min_width), Some(min_height)) = (
                json["tauri"]["windows"][0]["minWidth"].as_u64(),
                json["tauri"]["windows"][0]["minHeight"].as_u64()
            ) {
                return (min_width as u32, min_height as u32);
            }
        }
    }
    
    // If reading fails, return default values
    (1400, 700)
}

// Get configuration file path
fn get_config_file_path() -> PathBuf {
    let app_data_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ollama-pro");
    
    // Ensure directory exists
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).unwrap_or_else(|_| {
            println!("Unable to create configuration directory");
        });
    }
    
    app_data_dir.join("window_state.json")
}

// Load window state
fn load_window_state() -> WindowState {
    let config_path = get_config_file_path();
    
    if config_path.exists() {
        match fs::read_to_string(&config_path) {
            Ok(content) => {
                match serde_json::from_str::<WindowState>(&content) {
                    Ok(state) => return state,
                    Err(e) => {
                        println!("Failed to parse window state configuration: {}", e);
                    }
                }
            },
            Err(e) => {
                println!("Failed to read window state configuration: {}", e);
            }
        }
    }
    
    // Return default state if unable to load
    WindowState::default()
}

// Save window state
fn save_window_state(window: &Window) {
    // Get current window state
    let is_maximized = window.is_maximized().unwrap_or(false);
    
    let state = if is_maximized {
        let (default_width, default_height) = get_window_config();
        WindowState {
            x: 100,
            y: 100,
            width: default_width,
            height: default_height,
            maximized: true,
        }
    } else if let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) {
        // Get current monitor's scale factor
        let scale_factor = if let Ok(monitor) = window.current_monitor() {
            monitor.map(|m| m.scale_factor()).unwrap_or(1.0)
        } else {
            1.0
        };
        
        // Convert physical coordinates to logical coordinates for saving
        let logical_x = (position.x as f64 / scale_factor) as i32;
        let logical_y = (position.y as f64 / scale_factor) as i32;
        let logical_width = (size.width as f64 / scale_factor) as u32;
        let logical_height = (size.height as f64 / scale_factor) as u32;
        
        println!("Saving window state - Physical: {}x{} at ({}, {}), Scale: {}, Logical: {}x{} at ({}, {})", 
            size.width, size.height, position.x, position.y, scale_factor, 
            logical_width, logical_height, logical_x, logical_y);
        
        WindowState {
            x: logical_x,
            y: logical_y,
            width: logical_width,
            height: logical_height,
            maximized: false,
        }
    } else {
        return; // Unable to get window information, don't save
    };
    
    // Save state to file
    let config_path = get_config_file_path();
    match serde_json::to_string_pretty(&state) {
        Ok(json) => {
            if let Err(e) = fs::write(&config_path, json) {
                println!("Failed to save window state: {}", e);
            }
        },
        Err(e) => {
            println!("Failed to serialize window state: {}", e);
        }
    }
}

// Custom commands to control window behavior
#[tauri::command]
fn minimize_window(window: Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn maximize_window(window: Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[tauri::command]
fn close_window(window: Window) {
    // Save window state before closing
    save_window_state(&window);
    let _ = window.close();
}

#[tauri::command]
fn start_dragging(window: Window) {
    let _ = window.start_dragging();
}

// System monitoring related commands
#[tauri::command]
fn get_system_resources() -> Result<SystemInfo, String> {
    get_system_info().map_err(|e| e.to_string())
}

// Ollama service management commands
#[tauri::command]
fn restart_ollama() -> Result<String, String> {
    use std::process::Command;
    
    // First check if ollama command is available
    if !is_ollama_available() {
        return Err("Ollama is not installed or not in system PATH. Please install Ollama first: https://ollama.ai/download".to_string());
    }
    
    #[cfg(target_os = "windows")]
    {
        // Windows system restart ollama
        // Check if administrator privileges are needed
        if !is_admin_windows() {
            // Try to restart application with administrator privileges
            return request_admin_restart_windows();
        }
        
        // First try to stop ollama service
        let stop_result = Command::new("taskkill")
            .args(["/F", "/IM", "ollama.exe"])
            .output();
            
        match stop_result {
            Ok(output) => {
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    // If process doesn't exist, taskkill returns error, but this is not a real error
                    if !stderr.contains("not found") && !stderr.contains("not running") && !stderr.contains("not found") {
                        return Err(format!("Failed to stop ollama: {}. Administrator privileges may be required", stderr));
                    }
                }
            },
            Err(e) => return Err(format!("Failed to execute stop command: {}. Please run application as administrator", e))
        }
        
        // Wait one second to ensure process completely stops
        std::thread::sleep(std::time::Duration::from_secs(1));
        
        // Start ollama service
        let start_result = Command::new("ollama")
            .arg("serve")
            .spawn();
            
        match start_result {
            Ok(_) => Ok("Ollama service restarted successfully".to_string()),
            Err(e) => Err(format!("Failed to start ollama: {}. Please ensure ollama is properly installed and in PATH", e))
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS system restart ollama
        // Check if pkill command is available
        if !is_command_available("pkill") {
            return Err("pkill command is not available. Please ensure system integrity".to_string());
        }
        
        // First try to stop ollama process
        let stop_result = Command::new("pkill")
            .args(["-f", "ollama"])
            .output();
            
        match stop_result {
            Ok(output) => {
                // Check if failed due to permission issues
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    if stderr.contains("Operation not permitted") || stderr.contains("Permission denied") {
                        return request_sudo_restart_unix("macOS");
                    }
                }
            },
            Err(e) => return Err(format!("Failed to execute stop command: {}. Administrator privileges may be required", e))
        }
        
        // Wait one second to ensure process completely stops
        std::thread::sleep(std::time::Duration::from_secs(1));
        
        // Start ollama service
        let start_result = Command::new("ollama")
            .arg("serve")
            .spawn();
            
        match start_result {
            Ok(_) => Ok("Ollama service restarted successfully".to_string()),
            Err(e) => Err(format!("Failed to start ollama: {}. Please ensure ollama is properly installed and in PATH", e))
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux system restart ollama
        // Check if pkill command is available
        if !is_command_available("pkill") {
            return Err("pkill command is not available. Please install procps package: sudo apt install procps or sudo yum install procps-ng".to_string());
        }
        
        // First try to stop ollama process
        let stop_result = Command::new("pkill")
            .args(["-f", "ollama"])
            .output();
            
        match stop_result {
            Ok(output) => {
                // Check if failed due to permission issues
                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    if stderr.contains("Operation not permitted") || stderr.contains("Permission denied") {
                        return request_sudo_restart_unix("Linux");
                    }
                }
            },
            Err(e) => return Err(format!("Failed to execute stop command: {}. Administrator privileges may be required", e))
        }
        
        // Wait one second to ensure process completely stops
        std::thread::sleep(std::time::Duration::from_secs(1));
        
        // Start ollama service
        let start_result = Command::new("ollama")
            .arg("serve")
            .spawn();
            
        match start_result {
            Ok(_) => Ok("Ollama service restarted successfully".to_string()),
            Err(e) => Err(format!("Failed to start ollama: {}. Please ensure ollama is properly installed and in PATH", e))
        }
    }
}

// Get window size suitable for current screen
fn get_adaptive_window_size(window: &Window) -> (u32, u32) {
    // Try to get primary monitor information
    if let Ok(monitor) = window.primary_monitor() {
        if let Some(monitor) = monitor {
            let size = monitor.size();
            let scale_factor = monitor.scale_factor();
            
            // Calculate logical screen size (considering DPI scaling)
            let logical_width = (size.width as f64 / scale_factor) as u32;
            let logical_height = (size.height as f64 / scale_factor) as u32;
            
            // Calculate suitable window size based on screen size (70-80% of screen)
            let window_width = (logical_width as f64 * 0.75) as u32;
            let window_height = (logical_height as f64 * 0.75) as u32;
            
            // Ensure minimum size
            let min_width = 1000u32;
            let min_height = 700u32;
            
            let final_width = window_width.max(min_width);
            let final_height = window_height.max(min_height);
            
            println!("Screen info - Physical: {}x{}, Scale: {}, Logical: {}x{}, Window: {}x{}", 
                size.width, size.height, scale_factor, logical_width, logical_height, final_width, final_height);
            
            return (final_width, final_height);
        }
    }
    
    // If unable to get monitor information, return default values based on OS
    // Dynamically read minimum size from tauri config file
    get_window_config()
}

// Get suitable window position (centered)
fn get_adaptive_window_position(window: &Window, width: u32, height: u32) -> (i32, i32) {
    if let Ok(monitor) = window.primary_monitor() {
        if let Some(monitor) = monitor {
            let size = monitor.size();
            let scale_factor = monitor.scale_factor();
            let position = monitor.position();
            
            // Calculate logical screen size and position
            let logical_width = (size.width as f64 / scale_factor) as i32;
            let logical_height = (size.height as f64 / scale_factor) as i32;
            let logical_x = (position.x as f64 / scale_factor) as i32;
            let logical_y = (position.y as f64 / scale_factor) as i32;
            
            // Calculate centered position
            let x = logical_x + (logical_width - width as i32) / 2;
            let y = logical_y + (logical_height - height as i32) / 2;
            
            return (x.max(logical_x), y.max(logical_y));
        }
    }
    
    // Default position
    (100, 100)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            minimize_window,
            maximize_window,
            close_window,
            start_dragging,
            get_system_resources,
            get_ollama_host,
            set_ollama_host,
            clear_ollama_host,
            get_config_info,
            restart_ollama
        ])
        .setup(|app| {
            // Get main window
            let window = app.get_window("main").unwrap();
            
            // Force show window
            let _ = window.show();
            let _ = window.set_focus();
            
            // Get adaptive window size
            let (adaptive_width, adaptive_height) = get_adaptive_window_size(&window);
            let (adaptive_x, adaptive_y) = get_adaptive_window_position(&window, adaptive_width, adaptive_height);
            
            // Set adaptive window size and position
            let _ = window.set_size(LogicalSize::new(adaptive_width, adaptive_height));
            let _ = window.set_position(PhysicalPosition::new(adaptive_x, adaptive_y));
            
            // Load saved window state (if exists and reasonable)
            let state = load_window_state();
            
            // Get current monitor information to validate saved state
            let (screen_logical_width, screen_logical_height) = if let Ok(monitor) = window.primary_monitor() {
                if let Some(monitor) = monitor {
                    let size = monitor.size();
                    let scale_factor = monitor.scale_factor();
                    let logical_width = (size.width as f64 / scale_factor) as u32;
                    let logical_height = (size.height as f64 / scale_factor) as u32;
                    (logical_width, logical_height)
                } else {
                    (1920, 1080) // Default values
                }
            } else {
                (1920, 1080) // Default values
            };
            
            // Validate if saved state is within screen bounds and size is reasonable
            let is_position_valid = state.x >= -100 && state.y >= -100 && 
                                  state.x < screen_logical_width as i32 && 
                                  state.y < screen_logical_height as i32;
            let is_size_valid = state.width >= 800 && state.height >= 600 && 
                              state.width <= screen_logical_width + 100 && 
                              state.height <= screen_logical_height + 100;
            
            println!("Validating saved state: {}x{} at ({}, {}), Screen: {}x{}, Position valid: {}, Size valid: {}", 
                state.width, state.height, state.x, state.y, 
                screen_logical_width, screen_logical_height, is_position_valid, is_size_valid);
            
            // Only apply if saved state is reasonable
            if is_position_valid && is_size_valid {
                // Use logical coordinates to set window position and size
                let _ = window.set_size(LogicalSize::new(state.width, state.height));
                let _ = window.set_position(LogicalPosition::new(state.x, state.y));
                
                // If previously maximized, maximize the window
                if state.maximized {
                    let _ = window.maximize();
                }
                
                println!("Applied saved window state: {}x{} at ({}, {})", 
                    state.width, state.height, state.x, state.y);
            } else {
                println!("Saved window state invalid, using adaptive size and position");
            }
            
            // Listen for window close event, save window state
            let window_clone = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    save_window_state(&window_clone);
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
