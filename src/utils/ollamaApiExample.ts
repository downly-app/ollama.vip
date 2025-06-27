// Ollama API usage example file
// This file demonstrates how to use the extended Ollama API

import { ollamaApi, type ChatMessage, type GenerateRequest, type ChatRequest } from '@/services/ollamaApi';
import { activityLogger } from '@/components/dashboard/ActivityLogAndActions';

// Example 1: Check connection status
export async function checkOllamaConnection() {
  try {
    const isConnected = await ollamaApi.checkConnection();
    if (isConnected) {
      activityLogger.addActivity('success', 'Ollama service connected successfully');
      console.log('✅ Ollama service is running normally');
    } else {
      activityLogger.addActivity('error', 'Ollama service connection failed');
      console.log('❌ Ollama service connection failed');
    }
    return isConnected;
  } catch (error) {
    activityLogger.addActivity('error', `Connection check failed: ${error}`);
    console.error('Connection check error:', error);
    return false;
  }
}

// Example 2: Get version information
export async function getOllamaVersion() {
  try {
    const versionInfo = await ollamaApi.getVersion();
    if (versionInfo) {
      activityLogger.addActivity('info', `Ollama version: ${versionInfo.version}`);
      console.log('📋 Version info:', versionInfo);
    }
    return versionInfo;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get version info: ${error}`);
    console.error('Get version info error:', error);
    return null;
  }
}

// Example 3: List all local models
export async function listAllModels() {
  try {
    const models = await ollamaApi.listModels();
    activityLogger.addActivity('info', `Found ${models.length} local models`);
    console.log('📦 Local model list:', models);
    
    // Print model information
    models.forEach(model => {
      console.log(`- ${model.name} (${model.details.parameter_size}, ${(model.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
    });
    
    return models;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get model list: ${error}`);
    console.error('Get model list error:', error);
    return [];
  }
}

// Example 4: List running models
export async function listRunningModels() {
  try {
    const runningModels = await ollamaApi.listRunningModels();
    activityLogger.addActivity('info', `${runningModels.length} models are running`);
    console.log('🏃 Running models:', runningModels);
    return runningModels;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get running models: ${error}`);
    console.error('Get running models error:', error);
    return [];
  }
}

// Example 5: Text generation
export async function generateText(model: string, prompt: string) {
  try {
    activityLogger.addActivity('info', `Starting text generation - Model: ${model}`);
    
    const request: GenerateRequest = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        max_tokens: 100
      }
    };

    const response = await ollamaApi.generateCompletion(request);
    activityLogger.addActivity('success', `Text generation completed - ${response.length} characters`);
    console.log('📝 Generated text:', response);
    return response;
  } catch (error) {
    activityLogger.addActivity('error', `Text generation failed: ${error}`);
    console.error('Text generation error:', error);
    return '';
  }
}

// Example 6: Streaming text generation
export async function generateTextStream(model: string, prompt: string) {
  try {
    activityLogger.addActivity('info', `Starting streaming generation - Model: ${model}`);
    
    const request: GenerateRequest = {
      model,
      prompt,
      stream: true,
      options: {
        temperature: 0.7
      }
    };

    let fullResponse = '';
    const response = await ollamaApi.generateCompletion(
      request,
      (chunk) => {
        fullResponse += chunk;
        console.log('📡 Received chunk:', chunk);
      }
    );

    activityLogger.addActivity('success', `Streaming generation completed - ${fullResponse.length} characters`);
    return fullResponse;
  } catch (error) {
    activityLogger.addActivity('error', `Streaming generation failed: ${error}`);
    console.error('Streaming generation error:', error);
    return '';
  }
}

// Example 7: Chat conversation
export async function chatWithModel(model: string, messages: ChatMessage[]) {
  try {
    activityLogger.addActivity('info', `Starting chat - Model: ${model}, Message count: ${messages.length}`);
    
    const request: ChatRequest = {
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.8
      }
    };

    const response = await ollamaApi.generateChat(request);
    activityLogger.addActivity('success', `Chat reply completed - ${response.content.length} characters`);
    console.log('💬 AI reply:', response);
    return response;
  } catch (error) {
    activityLogger.addActivity('error', `Chat failed: ${error}`);
    console.error('Chat error:', error);
    return null;
  }
}

// Example 8: Get model detailed information
export async function getModelDetails(modelName: string) {
  try {
    activityLogger.addActivity('info', `Getting model details: ${modelName}`);
    
    const modelInfo = await ollamaApi.showModelInfo(modelName, true);
    if (modelInfo) {
      console.log('🔍 Model details:', modelInfo);
      activityLogger.addActivity('success', `Model details retrieved successfully: ${modelName}`);
    }
    return modelInfo;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get model details: ${error}`);
    console.error('Get model details error:', error);
    return null;
  }
}

// Example 9: Download model
export async function downloadModel(modelName: string) {
  try {
    activityLogger.addActivity('info', `Starting model download: ${modelName}`);
    
    await ollamaApi.pullModel(
      modelName,
      (progress) => {
        if (progress.status === 'downloading' && progress.completed && progress.total) {
          const percent = (progress.completed / progress.total * 100).toFixed(1);
          console.log(`📥 Download progress: ${percent}% (${progress.completed}/${progress.total})`);
        } else {
          console.log('📥 Download status:', progress.status);
        }
      }
    );

    activityLogger.addActivity('success', `Model download completed: ${modelName}`);
    console.log('✅ Model download completed');
  } catch (error) {
    activityLogger.addActivity('error', `Model download failed: ${error}`);
    console.error('Model download error:', error);
  }
}

// Example 10: Delete model
export async function removeModel(modelName: string) {
  try {
    activityLogger.addActivity('info', `Deleting model: ${modelName}`);
    
    const success = await ollamaApi.deleteModel(modelName);
    if (success) {
      activityLogger.addActivity('success', `Model deleted successfully: ${modelName}`);
      console.log('🗑️ Model deleted successfully');
    } else {
      activityLogger.addActivity('error', `Model deletion failed: ${modelName}`);
      console.log('❌ Model deletion failed');
    }
    return success;
  } catch (error) {
    activityLogger.addActivity('error', `Delete model error: ${error}`);
    console.error('Delete model error:', error);
    return false;
  }
}

// Example 11: Generate embeddings
export async function generateEmbeddings(model: string, texts: string[]) {
  try {
    activityLogger.addActivity('info', `Generating embeddings - Model: ${model}, Text count: ${texts.length}`);
    
    const result = await ollamaApi.generateEmbeddings(model, texts);
    activityLogger.addActivity('success', `Embedding generation completed - ${result.embeddings.length} vectors`);
    console.log('🧮 Embeddings:', result);
    return result;
  } catch (error) {
    activityLogger.addActivity('error', `Embedding generation failed: ${error}`);
    console.error('Embedding generation error:', error);
    return null;
  }
}

// Example 12: Copy model
export async function copyModel(source: string, destination: string) {
  try {
    activityLogger.addActivity('info', `Copying model: ${source} -> ${destination}`);
    
    const success = await ollamaApi.copyModel(source, destination);
    if (success) {
      activityLogger.addActivity('success', `Model copied successfully: ${destination}`);
      console.log('📋 Model copied successfully');
    } else {
      activityLogger.addActivity('error', `Model copy failed: ${source} -> ${destination}`);
      console.log('❌ Model copy failed');
    }
    return success;
  } catch (error) {
    activityLogger.addActivity('error', `Copy model error: ${error}`);
    console.error('Copy model error:', error);
    return false;
  }
}

// Example 13: Comprehensive demonstration function
export async function demonstrateOllamaAPI() {
  console.log('🚀 Starting Ollama API demonstration...\n');

  // 1. Check connection
  console.log('1️⃣ Checking connection status...');
  const isConnected = await checkOllamaConnection();
  if (!isConnected) {
    console.log('❌ Ollama service not connected, demonstration terminated');
    return;
  }

  // 2. Get version
  console.log('\n2️⃣ Getting version information...');
  await getOllamaVersion();

  // 3. List models
  console.log('\n3️⃣ Listing local models...');
  const models = await listAllModels();
  
  if (models.length === 0) {
    console.log('❌ No available models, please download models first');
    return;
  }

  // 4. Check running models
  console.log('\n4️⃣ Checking running models...');
  await listRunningModels();

  // 5. Use the first available model for conversation
  const firstModel = models[0].name;
  console.log(`\n5️⃣ Using model ${firstModel} for conversation...`);
  
  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello, please briefly introduce yourself.' }
  ];
  
  await chatWithModel(firstModel, messages);

  // 6. Get model details
  console.log(`\n6️⃣ Getting detailed information for model ${firstModel}...`);
  await getModelDetails(firstModel);

  console.log('\n✅ Ollama API demonstration completed!');
}

// Usage examples:
// 
// Import and use in your components:
// import { demonstrateOllamaAPI, checkOllamaConnection, listAllModels } from '@/utils/ollamaApiExample';
// 
// // Call in component
// useEffect(() => {
//   demonstrateOllamaAPI();
// }, []);
//
// // Or use individual functions
// const handleCheckConnection = async () => {
//   const connected = await checkOllamaConnection();
//   if (connected) {
//     const models = await listAllModels();
//     console.log('Available models:', models);
//   }
// };

export default {
  checkOllamaConnection,
  getOllamaVersion,
  listAllModels,
  listRunningModels,
  generateText,
  generateTextStream,
  chatWithModel,
  getModelDetails,
  downloadModel,
  removeModel,
  generateEmbeddings,
  copyModel,
  demonstrateOllamaAPI
};