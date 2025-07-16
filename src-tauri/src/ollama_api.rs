use reqwest::{Client, StatusCode};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use std::sync::Mutex;
use std::collections::HashMap;
use tokio::sync::oneshot;
use futures_util::StreamExt;
use crate::config_manager::get_ollama_host;
use tauri::{command, Manager};
use lazy_static::lazy_static;
use std::fs;
use std::path::PathBuf;

// Response type for streaming data
#[derive(Debug, Serialize, Clone)]
pub struct StreamResponse {
    pub content: String,
    pub done: bool,
}

// Pull model streaming response type
#[derive(Debug, Serialize, Clone)]
pub struct PullModelResponse {
    pub status: String,
    pub digest: Option<String>,
    pub total: Option<i64>,
    pub completed: Option<i64>,
}

// Structure to store download state for pause/resume
struct DownloadState {
    cancel_tx: oneshot::Sender<()>,
    completed_bytes: i64,
}

// Persistent download progress structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadProgress {
    model_name: String,
    channel_id: String,
    completed_bytes: i64,
    total_bytes: i64,
    last_updated: u64, // timestamp
}

lazy_static! {
    // Global map to store active downloads with their state
    static ref ACTIVE_DOWNLOADS: Mutex<HashMap<String, DownloadState>> = Mutex::new(HashMap::new());
    // Global map to store persistent download progress
    static ref DOWNLOAD_PROGRESS: Mutex<HashMap<String, DownloadProgress>> = Mutex::new(HashMap::new());
}

// Helper functions for persistent storage
fn get_progress_file_path() -> PathBuf {
    let app_data_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ollama-pro");
    
    // Ensure directory exists
    if !app_data_dir.exists() {
        let _ = fs::create_dir_all(&app_data_dir);
    }
    
    app_data_dir.join("download_progress.json")
}

fn save_download_progress(channel_id: &str, progress: &DownloadProgress) {
    let progress_file = get_progress_file_path();
    
    // Load existing progress data
    let mut all_progress: HashMap<String, DownloadProgress> = if progress_file.exists() {
        fs::read_to_string(&progress_file)
            .ok()
            .and_then(|content| serde_json::from_str(&content).ok())
            .unwrap_or_default()
    } else {
        HashMap::new()
    };
    
    // Update progress for this channel
    all_progress.insert(channel_id.to_string(), progress.clone());
    
    // Save back to file
    if let Ok(json_content) = serde_json::to_string_pretty(&all_progress) {
        let _ = fs::write(&progress_file, json_content);
        println!("[PROGRESS] Save download progress to file: channel_id={}, completed_bytes={}", 
                 channel_id, progress.completed_bytes);
    }
}

fn load_download_progress(channel_id: &str) -> Option<DownloadProgress> {
    let progress_file = get_progress_file_path();
    
    if !progress_file.exists() {
        return None;
    }
    
    let all_progress: HashMap<String, DownloadProgress> = fs::read_to_string(&progress_file)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default();
    
    let progress = all_progress.get(channel_id).cloned();
    if let Some(ref p) = progress {
        println!("[PROGRESS] Load download progress from file: channel_id={}, completed_bytes={}", 
                 channel_id, p.completed_bytes);
    }
    
    progress
}

fn clear_download_progress(channel_id: &str) {
    let progress_file = get_progress_file_path();
    
    if !progress_file.exists() {
        return;
    }
    
    let mut all_progress: HashMap<String, DownloadProgress> = fs::read_to_string(&progress_file)
        .ok()
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default();
    
    all_progress.remove(channel_id);
    
    if let Ok(json_content) = serde_json::to_string_pretty(&all_progress) {
        let _ = fs::write(&progress_file, json_content);
        println!("[PROGRESS] Clear download progress file: channel_id={}", channel_id);
    }
}

// ---- Model Types ----
#[derive(Debug, Serialize, Deserialize)]
pub struct ModelDetails {
    pub parent_model: String,
    pub format: String,
    pub family: String,
    pub families: Vec<String>,
    pub parameter_size: String,
    pub quantization_level: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub model: String,
    pub modified_at: String,
    pub size: i64,
    pub digest: String,
    pub details: ModelDetails,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModelList {
    pub models: Vec<OllamaModel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaRunningModel {
    pub name: String,
    pub model: String,
    pub size: i64,
    pub digest: String,
    pub details: ModelDetails,
    pub expires_at: String,
    pub size_vram: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaRunningModelList {
    pub models: Vec<OllamaRunningModel>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaVersion {
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelInfo {
    pub modelfile: String,
    pub parameters: Option<String>,
    pub template: String,
    pub details: ModelDetails,
    #[serde(rename = "model_info")]
    pub model_info: Value,
    pub capabilities: Vec<String>,
}

// ---- Chat Types ----
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<Value>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suffix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_alive: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tools: Option<Vec<Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keep_alive: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateResponse {
    pub model: String,
    pub response: String,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatResponse {
    pub model: String,
    pub message: ChatMessage,
    pub done: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbeddingsRequest {
    pub model: String,
    pub input: Value, // Can be a string or array of strings
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbeddingsResponse {
    pub embeddings: Vec<Vec<f64>>,
    pub model: String,
    pub total_duration: i64,
}

// ---- API Implementation ----

fn get_client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .unwrap_or_default()
}

#[command]
pub async fn check_connection() -> Result<bool, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let client = get_client();
    let url = format!("{}/api/version", base_url);
    
    match client.get(&url).timeout(Duration::from_secs(5)).send().await {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[command]
pub async fn get_version() -> Result<OllamaVersion, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let client = get_client();
    let url = format!("{}/api/version", base_url);
    
    let response = client.get(&url).send().await
        .map_err(|e| format!("Failed to get version: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    response.json::<OllamaVersion>().await
        .map_err(|e| format!("Failed to parse version response: {}", e))
}

#[command]
pub async fn list_models() -> Result<Vec<OllamaModel>, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let client = get_client();
    let url = format!("{}/api/tags", base_url);
    
    let response = client.get(&url).send().await
        .map_err(|e| format!("Failed to list models: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    let model_list: OllamaModelList = response.json().await
        .map_err(|e| format!("Failed to parse models response: {}", e))?;
        
    Ok(model_list.models)
}

#[command]
pub async fn list_running_models() -> Result<Vec<OllamaRunningModel>, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let client = get_client();
    let url = format!("{}/api/ps", base_url);
    
    let response = client.get(&url).send().await
        .map_err(|_| "Failed to fetch running models".to_string())?;
        
    if !response.status().is_success() {
        return Err("Failed to fetch running models".to_string());
    }
    
    let model_list: OllamaRunningModelList = response.json().await
        .map_err(|_| "Failed to parse running models response".to_string())?;
        
    Ok(model_list.models)
}

#[command]
pub async fn show_model_info(model_name: String, verbose: bool) -> Result<ModelInfo, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let client = get_client();
    let url = format!("{}/api/show", base_url);
    
    let payload = json!({
        "model": model_name,
        "verbose": verbose
    });
    
    let response = client.post(&url)
        .json(&payload)
        .send().await
        .map_err(|e| format!("Failed to get model info: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    response.json::<ModelInfo>().await
        .map_err(|e| format!("Failed to parse model info response: {}", e))
}

#[command]
pub async fn copy_model(source: String, destination: String) -> Result<bool, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let client = get_client();
    let url = format!("{}/api/copy", base_url);
    
    let payload = json!({
        "source": source,
        "destination": destination
    });
    
    let response = client.post(&url)
        .json(&payload)
        .send().await
        .map_err(|e| format!("Failed to copy model: {}", e))?;
        
    Ok(response.status().is_success())
}

#[command]
pub async fn delete_model(model_name: String) -> Result<bool, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let client = get_client();
    let url = format!("{}/api/delete", base_url);
    
    let payload = json!({
        "model": model_name
    });
    
    let response = client.delete(&url)
        .json(&payload)
        .send().await
        .map_err(|e| format!("Failed to delete model: {}", e))?;
        
    Ok(response.status().is_success() || response.status() == StatusCode::NOT_FOUND)
}

#[command]
pub async fn generate_completion(request: GenerateRequest) -> Result<String, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    // Create a non-streaming request
    let mut req = request;
    req.stream = Some(false);
    
    let client = get_client();
    let url = format!("{}/api/generate", base_url);
    
    let response = client.post(&url)
        .json(&req)
        .send().await
        .map_err(|e| format!("Failed to generate completion: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    let generate_response: GenerateResponse = response.json().await
        .map_err(|e| format!("Failed to parse generate response: {}", e))?;
        
    Ok(generate_response.response)
}

#[command]
pub async fn generate_chat(request: ChatRequest) -> Result<ChatMessage, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    // Create a non-streaming request
    let mut req = request;
    req.stream = Some(false);
    
    let client = get_client();
    let url = format!("{}/api/chat", base_url);
    
    let response = client.post(&url)
        .json(&req)
        .send().await
        .map_err(|e| format!("Failed to generate chat response: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    let chat_response: ChatResponse = response.json().await
        .map_err(|e| format!("Failed to parse chat response: {}", e))?;
        
    Ok(chat_response.message)
}

#[command]
pub async fn generate_embeddings(model: String, input: Value, options: Option<Value>) -> Result<EmbeddingsResponse, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let request = EmbeddingsRequest {
        model,
        input,
        options,
    };
    
    let client = get_client();
    let url = format!("{}/api/embed", base_url);
    
    let response = client.post(&url)
        .json(&request)
        .send().await
        .map_err(|e| format!("Failed to generate embeddings: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    response.json::<EmbeddingsResponse>().await
        .map_err(|e| format!("Failed to parse embeddings response: {}", e))
}

#[command]
pub async fn create_model(model_name: String, from: Option<String>, modelfile: Option<String>) -> Result<String, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let mut payload = json!({
        "model": model_name,
        "stream": false
    });
    
    if let Some(from_val) = from {
        payload["from"] = json!(from_val);
    }
    
    if let Some(modelfile_val) = modelfile {
        payload["modelfile"] = json!(modelfile_val);
    }
    
    let client = get_client();
    let url = format!("{}/api/create", base_url);
    
    let response = client.post(&url)
        .json(&payload)
        .send().await
        .map_err(|e| format!("Failed to create model: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    Ok("Model created successfully".to_string())
}

#[command]
pub async fn load_model(model_name: String) -> Result<bool, String> {
    let generate_request = GenerateRequest {
        model: model_name,
        prompt: "".to_string(),
        stream: Some(false),
        suffix: None,
        images: None,
        format: None,
        options: None,
        system: None,
        template: None,
        raw: None,
        keep_alive: None,
    };
    
    match generate_completion(generate_request).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false)
    }
}

#[command]
pub async fn unload_model(model_name: String) -> Result<bool, String> {
    let generate_request = GenerateRequest {
        model: model_name,
        prompt: "".to_string(),
        stream: Some(false),
        suffix: None,
        images: None,
        format: None,
        options: None,
        system: None,
        template: None,
        raw: None,
        keep_alive: Some(json!(0)),
    };
    
    match generate_completion(generate_request).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false)
    }
}

#[command]
pub async fn pull_model(model_name: String, channel_id: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    // More detailed logging to track each incoming request
    println!("=====================================");
    println!("[PULL_MODEL] Received download request: model={}, channel_id={}, time={:?}", 
             model_name, channel_id, std::time::SystemTime::now());
    println!("=====================================");
    
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    println!("[PULL_MODEL] Using Ollama server address: {}", base_url);
    
    // Check for any existing download state (previous progress)
    // First check active downloads, then check persistent storage
    let completed_bytes = {
        let active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
        if let Some(download_state) = active_downloads.get(&channel_id) {
            println!("[DOWNLOAD] Found active download state: model={}, channel_id={}, completed_bytes={}", 
                     model_name, channel_id, download_state.completed_bytes);
            Some(download_state.completed_bytes)
        } else {
            // Check persistent storage for previous download progress
            if let Some(progress) = load_download_progress(&channel_id) {
                println!("[DOWNLOAD] Restore download progress from persistent storage: model={}, channel_id={}, completed_bytes={}", 
                         model_name, channel_id, progress.completed_bytes);
                Some(progress.completed_bytes)
            } else {
                println!("[DOWNLOAD] No existing download state found, starting fresh download: model={}, channel_id={}", 
                         model_name, channel_id);
                None
            }
        }
    };
    
    // Create a oneshot channel for cancellation
    let (cancel_tx, mut cancel_rx) = oneshot::channel::<()>();
    
    // Always use streaming for model pulls to get progress updates
    let payload = json!({
        "name": model_name.clone(),
        "stream": true
    });
    
    // Store the new download state
    {
        let mut active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
        active_downloads.insert(channel_id.clone(), DownloadState {
            cancel_tx,
            completed_bytes: completed_bytes.unwrap_or(0),
        });
    }

    // Create a separate task for the actual download
    let client = get_client();
    let url = format!("{}/api/pull", base_url);
    
    // Note: Ollama API does not support HTTP Range requests for resumable downloads
    // We rely on Ollama's own incremental download mechanism
    if let Some(bytes) = completed_bytes {
        if bytes > 0 {
            println!("[DOWNLOAD] Detected previous download progress: model={}, channel_id={}, completed_bytes={}", 
                     model_name, channel_id, bytes);
            println!("[DOWNLOAD] Note: Ollama will automatically detect downloaded parts and continue");
        }
    }
    
    // Send request to the Ollama server (without Range headers)
    let response = client.post(&url)
        .json(&payload)
        .timeout(Duration::from_secs(600)) // Longer timeout for model downloads
        .send().await
        .map_err(|e| format!("Failed to pull model: {}", e))?;
    
    // Log the response status and headers for debugging
    println!("[DOWNLOAD] Server response status: model={}, channel_id={}, status={}", 
             model_name, channel_id, response.status());
    println!("[DOWNLOAD] Server response headers: model={}, channel_id={}, headers={:?}", 
             model_name, channel_id, response.headers());
    
    // Check if server supports Range requests
    if completed_bytes.is_some() && completed_bytes.unwrap() > 0 {
        if response.status() == StatusCode::PARTIAL_CONTENT {
            println!("[DOWNLOAD] Server supports resumable downloads! model={}, channel_id={}", 
                     model_name, channel_id);
        } else {
            println!("[DOWNLOAD] Warning: Server may not support resumable downloads, status code={}, model={}, channel_id={}", 
                     response.status(), model_name, channel_id);
        }
    }
        
    if !response.status().is_success() {
        // Clean up our download state
        let mut active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
        active_downloads.remove(&channel_id);
        
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    // Use unique event name provided by frontend
    let event_name = channel_id.clone();
    
    // Create a more concise stream processing logic, similar to the frontend implementation
    let mut buffer = String::new();
    
    // Use byte stream reading method
    let mut stream = response.bytes_stream();
    
    // Process response stream, parse each line of JSON and send to frontend
    loop {
        // Efficiently check for cancellation signal
        if cancel_rx.try_recv().is_ok() {
            println!("[DOWNLOAD] Received cancellation signal, stopping download: model={}, channel_id={}", 
                     model_name, channel_id);
            
            // Save the completed bytes for future resume
            let active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
            if let Some(download_state) = active_downloads.get(&channel_id) {
                println!("[DOWNLOAD] Save download progress state: model={}, channel_id={}, completed_bytes={}", 
                          model_name, channel_id, download_state.completed_bytes);
                // We don't remove the entry to keep track of progress
            } else {
                println!("[DOWNLOAD] Warning: Download state not found during cancellation: model={}, channel_id={}", 
                         model_name, channel_id);
            }
            
            return Ok("Download cancelled by user".to_string());
        }
        
        // Use timeout mechanism to get next data chunk, ensuring timely response to cancellation requests
        let chunk_result = match tokio::time::timeout(
            std::time::Duration::from_millis(100), 
            stream.next()
        ).await {
            Ok(Some(result)) => result,
            Ok(None) => break, // End of stream
            Err(_) => continue, // Timeout, check cancellation again
        };
        
        match chunk_result {
            Ok(bytes) => {
                // Convert bytes to string and add to buffer
                if let Ok(chunk_str) = String::from_utf8(bytes.to_vec()) {
                    buffer.push_str(&chunk_str);
                    
                    // Process buffer line by line, similar to frontend implementation
                    let lines: Vec<&str> = buffer.split('\n').collect();
                    if lines.len() > 1 {
                        // Process all lines except the last one (which may be incomplete)
                        for line in &lines[0..lines.len()-1] {
                            if line.trim().is_empty() {
                                continue;
                            }
                            
                            // Parse JSON response
                            if let Ok(json_value) = serde_json::from_str::<Value>(line) {
                                let status = json_value["status"].as_str().unwrap_or("unknown").to_string();
                                
                                // Extract key information
                                let digest = json_value["digest"].as_str().map(|s| s.to_string());
                                let total = json_value["total"].as_i64();
                                let completed = json_value["completed"].as_i64();
                                
                                // Update completed bytes in download state
                                if let Some(completed_value) = completed {
                                    let mut active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
                                    if let Some(download_state) = active_downloads.get_mut(&channel_id) {
                                        // Only print logs when there are significant changes to avoid too many logs
                                        if completed_value % 10_000_000 == 0 || 
                                           (download_state.completed_bytes / 10_000_000) != (completed_value / 10_000_000) {
                                            println!("[DOWNLOAD] Update download progress: model={}, channel_id={}, completed_bytes={}, total={}", 
                                                     model_name, channel_id, completed_value, 
                                                     total.unwrap_or(-1));
                                        }
                                        download_state.completed_bytes = completed_value;
                                    }
                                }
                                
                                // Create response object
                                let pull_response = PullModelResponse {
                                    status: status.clone(),
                                    digest,
                                    total,
                                    completed,
                                };
                                
                                // Send progress events to frontend
                                let _ = app_handle.emit_all(&event_name, pull_response);
                                
                                // If status is "success", download is complete
                                if status == "success" {
                                    println!("Model {} download completed successfully", model_name);
                                    // Remove from active downloads
                                    let mut active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
                                    active_downloads.remove(&channel_id);
                                    
                                    return Ok("Model download completed successfully".to_string());
                                }
                            } else {
                                // Tolerant handling of JSON parsing errors - consistent with frontend implementation
                                println!("Failed to parse JSON line: {}", line);
                            }
                        }
                        
                        // Keep the last line which may be incomplete
                        buffer = lines[lines.len() - 1].to_string();
                    }
                }
            }
            Err(err) => {
                // Handle errors during stream reading
                println!("Error reading stream for model {}: {}", model_name, err);
                
                // Keep the download state with current progress
                return Err(format!("Failed to read model data: {}", err));
            }
        }
    }
    
    // If we reached the end of the stream but didn't receive a success status
    println!("Model {} download stream ended without explicit success message", model_name);
    
    // On normal stream end, clean up resources
    let mut active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
    if let Some(download_state) = active_downloads.get(&channel_id) {
        println!("Stream ended normally, completed bytes: {}", download_state.completed_bytes);
    }
    
    // Remove download state as it's completed
    active_downloads.remove(&channel_id);
    
    // We assume download completed successfully (consistent with frontend's tolerant approach)
    Ok("Model download completed".to_string())
}

#[command]
pub async fn cancel_pull(model_name: String, channel_id: String, cleanup: bool) -> Result<bool, String> {
    println!("[CANCEL] Start cancelling download: model={}, channel_id={}, cleanup={}", model_name, channel_id, cleanup);
    
    let mut active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
    let state = active_downloads.remove(&channel_id);

    let mut result = false;
    if let Some(download_state) = state {
        // Save the last known progress
        save_download_progress(&channel_id, &DownloadProgress {
                model_name: model_name.clone(),
                channel_id: channel_id.clone(),
            completed_bytes: download_state.completed_bytes,
            total_bytes: 0, // Total is not known here, might need to update this logic if total is needed
            last_updated: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs(),
        });
        
        if download_state.cancel_tx.send(()).is_ok() {
            println!("[CANCEL] Cancel signal sent successfully: model={}, channel_id={}", model_name, channel_id);
            result = true;
    } else {
            println!("[CANCEL] Failed to send cancel signal (receiver closed): model={}, channel_id={}", model_name, channel_id);
        }
    } else {
        println!("[CANCEL] No active download task found: model={}, channel_id={}", model_name, channel_id);
    }

    if cleanup {
        println!("[CLEANUP] Clean up download progress: channel_id={}", channel_id);
        clear_download_progress(&channel_id);
    }

    Ok(result)
}

#[command]
pub async fn push_model(model_name: String, insecure: bool) -> Result<String, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let payload = json!({
        "model": model_name,
        "stream": false,
        "insecure": insecure
    });
    
    let client = get_client();
    let url = format!("{}/api/push", base_url);
    
    let response = client.post(&url)
        .json(&payload)
        .send().await
        .map_err(|e| format!("Failed to push model: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    Ok("Model pushed successfully".to_string())
}

#[tauri::command]
pub async fn validate_host(host: String) -> Result<bool, String> {
    let client = get_client();
    
    // Normalize host URL if needed
    let host_url = if !host.starts_with("http://") && !host.starts_with("https://") {
        format!("http://{}" , host)
    } else {
        host
    };
    
    // Add default port 11434 if no port specified
    let host_url = if !host_url.contains(":") || host_url.matches(":").count() == 1 && host_url.starts_with("http://") {
        format!("{host_url}:11434")
    } else {
        host_url
    };
    
    // Test connection by trying to access the version endpoint
    match client
        .get(&format!("{}/api/version", host_url))
        .timeout(Duration::from_secs(5))
        .send()
        .await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false), // Connection failed, host is invalid
        }
}

#[tauri::command]
pub async fn generate_chat_completion(request: ChatRequest, app_handle: tauri::AppHandle) -> Result<String, String> {
    let client = get_client();
    
    // Use existing get_ollama_host to get Ollama host address
    let host = get_ollama_host().map_err(|e| format!("Failed to get Ollama host: {}", e))?;
    
    // Build complete URL
    let url = format!("{}/api/chat", host);
    
    // Create a new request object, keeping original stream settings
    let mut ollama_request = request.clone();
    // Whether to use streaming
    let should_stream = request.stream.unwrap_or(false);

    if should_stream {
        // Enable streaming
        ollama_request.stream = Some(true);
        
        // Send request and get streaming response
        let response = client.post(&url)
            .json(&ollama_request)
            .timeout(Duration::from_secs(120)) // Increase timeout, streaming responses may need more time
            .send()
            .await
            .map_err(|e| format!("Failed to generate chat completion: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }
        
        // Handle streaming response
        let mut full_response = String::new();
        let mut buffer = String::new();
        
        // Create event name
        let event_name = "ollama-chat-stream";
        
        // Use byte stream reading method
        let mut stream = response.bytes_stream();
        
        // Parse JSON line by line and send events
        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(bytes) => {
                    // Convert bytes to string and add to buffer
                    if let Ok(chunk_str) = String::from_utf8(bytes.to_vec()) {
                        buffer.push_str(&chunk_str);
                        
                        // Process complete lines from buffer
                        while let Some(newline_pos) = buffer.find('\n') {
                            // Extract the part before newline into a new String
                            let before_newline = buffer[..newline_pos].to_string();
                            // Get the part after newline
                            let after_newline = buffer[newline_pos + 1..].to_string();
                            // Clear and reset the buffer with only what's after the newline
                            buffer.clear();
                            buffer.push_str(&after_newline);
                            
                            // Now safely trim the line
                            let line = before_newline.trim();
                            if line.is_empty() {
                                continue;
                            }
                            
                            // Try to parse as ChatResponse
                            match serde_json::from_str::<ChatResponse>(line) {
                                Ok(chat_response) => {
                                    let content = chat_response.message.content.clone();
                                    
                                    // Only send incremental content, not accumulated
                                    if !content.is_empty() {
                                        let _ = app_handle.emit_all(event_name, StreamResponse {
                                            content: content.clone(),
                                            done: false,
                                        });
                                        
                                        // Accumulate complete response
                                        full_response.push_str(&content);
                                    }
                                    
                                    // If done, send final event and break
                                    if chat_response.done {
                                        let _ = app_handle.emit_all(event_name, StreamResponse {
                                            content: String::new(), // Empty content for done event
                                            done: true,
                                        });
                                        return Ok(full_response);
                                    }
                                },
                                Err(e) => {
                                    // Parse error, log but continue processing
                                    eprintln!("Error parsing stream JSON: {}, raw: {}", e, line);
                                }
                            }
                        }
                    }
                },
                Err(e) => {
                    return Err(format!("Stream error: {}", e));
                }
            }
        }
        
        Ok(full_response)
    } else {
        // Non-streaming processing, keep original behavior
        ollama_request.stream = Some(false);
        
        let response = client.post(&url)
            .json(&ollama_request)
            .timeout(Duration::from_secs(60))
            .send()
            .await
            .map_err(|e| format!("Failed to generate chat completion: {}", e))?;
            
        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }
        
        let chat_response = response.json::<ChatResponse>()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;
            
        Ok(chat_response.message.content)
    }
}

#[command]
#[allow(dead_code)]
pub async fn pause_pull(channel_id: String) -> Result<bool, String> {
    println!("[DOWNLOAD] Attempting to pause download for channel_id: {}", channel_id);
    let mut active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
    if let Some(state) = active_downloads.remove(&channel_id) {
        let _ = state.cancel_tx.send(());
        println!("[DOWNLOAD] Paused download for channel_id: {}", channel_id);
        Ok(true)
    } else {
        eprintln!("[DOWNLOAD] No active download found for channel_id to pause: {}", channel_id);
        Ok(false)
    }
}

#[command]
#[allow(dead_code)]
pub async fn resume_pull(model_name: String, channel_id: String, app_handle: tauri::AppHandle) -> Result<String, String> {
    println!("[DOWNLOAD] Attempting to resume download for model: {}, channel_id: {}", model_name, channel_id);
    // Directly call pull_model, it will handle resume logic
    pull_model(model_name, channel_id, app_handle).await
}

#[command]
#[allow(dead_code)]
pub async fn check_download_status(channel_id: String) -> Result<Option<DownloadProgress>, String> {
    let progress_map = DOWNLOAD_PROGRESS.lock().unwrap();
    if let Some(progress) = progress_map.get(&channel_id) {
        // Additional check: is it still actively downloading?
        let active_downloads = ACTIVE_DOWNLOADS.lock().unwrap();
        if active_downloads.contains_key(&channel_id) {
            Ok(Some(progress.clone()))
        } else {
            // If not in active_downloads, it might be paused or finished
            Ok(Some(progress.clone()))
        }
    } else {
        Ok(None)
    }
}
