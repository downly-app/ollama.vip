use reqwest::{Client, StatusCode};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;
use futures_util::StreamExt;
use crate::config_manager::get_ollama_host;
use tauri::{command, Manager};

// Response type for streaming data
#[derive(Debug, Serialize, Clone)]
pub struct StreamResponse {
    pub content: String,
    pub done: bool,
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
    pub parameters: String,
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
pub async fn pull_model(model_name: String) -> Result<String, String> {
    let base_url = get_ollama_host().map_err(|e| e.to_string())?;
    
    let payload = json!({
        "name": model_name,
        "stream": false
    });
    
    let client = get_client();
    let url = format!("{}/api/pull", base_url);
    
    let response = client.post(&url)
        .json(&payload)
        .send().await
        .map_err(|e| format!("Failed to pull model: {}", e))?;
        
    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }
    
    Ok("Model pulled successfully".to_string())
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
