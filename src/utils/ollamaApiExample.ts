// Ollama API usage example file
// This file demonstrates how to use the extended Ollama API
import { activityLogger } from '@/components/dashboard/ActivityLogAndActions';
import {
  type ChatMessage,
  type ChatRequest,
  type GenerateRequest,
  ollamaApi,
} from '@/services/ollamaApi';

// Example 1: Check connection status
export async function checkOllamaConnection() {
  try {
    const isConnected = await ollamaApi.checkConnection();
    if (isConnected) {
      activityLogger.addActivity('success', 'Ollama service connected successfully');
      // Ollama service is running normally
    } else {
      activityLogger.addActivity('error', 'Ollama service connection failed');
      // Ollama service connection failed
    }
    return isConnected;
  } catch (error) {
    activityLogger.addActivity('error', `Connection check failed: ${error}`);
    // Connection check error
    return false;
  }
}

// Example 2: Get version information
export async function getOllamaVersion() {
  try {
    const versionInfo = await ollamaApi.getVersion();
    if (versionInfo) {
      activityLogger.addActivity('info', `Ollama version: ${versionInfo.version}`);
      // Version info retrieved
    }
    return versionInfo;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get version info: ${error}`);
    // Get version info error
    return null;
  }
}

// Example 3: List all local models
export async function listAllModels() {
  try {
    const models = await ollamaApi.listModels();
    activityLogger.addActivity('info', `Found ${models.length} local models`);
    // Local model list retrieved

    // Print model information
    models.forEach(model => {
      // Model: ${model.name}
    });

    return models;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get model list: ${error}`);
    // Get model list error
    return [];
  }
}

// Example 4: List running models
export async function listRunningModels() {
  try {
    const runningModels = await ollamaApi.listRunningModels();
    activityLogger.addActivity('info', `${runningModels.length} models are running`);
    // Running models retrieved
    return runningModels;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get running models: ${error}`);
    // Get running models error
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
        max_tokens: 100,
      },
    };

    const response = await ollamaApi.generateCompletion(request);
    activityLogger.addActivity(
      'success',
      `Text generation completed - ${response.length} characters`
    );
    // Text generated successfully
    return response;
  } catch (error) {
    activityLogger.addActivity('error', `Text generation failed: ${error}`);
    // Text generation error
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
        temperature: 0.7,
      },
    };

    let fullResponse = '';
    const response = await ollamaApi.generateCompletion(request, chunk => {
      fullResponse += chunk;
      // Chunk received
    });

    activityLogger.addActivity(
      'success',
      `Streaming generation completed - ${fullResponse.length} characters`
    );
    return fullResponse;
  } catch (error) {
    activityLogger.addActivity('error', `Streaming generation failed: ${error}`);
    // Streaming generation error
    return '';
  }
}

// Example 7: Chat conversation
export async function chatWithModel(model: string, messages: ChatMessage[]) {
  try {
    activityLogger.addActivity(
      'info',
      `Starting chat - Model: ${model}, Message count: ${messages.length}`
    );

    const request: ChatRequest = {
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.8,
      },
    };

    const response = await ollamaApi.generateChat(request);
    activityLogger.addActivity(
      'success',
      `Chat reply completed - ${response.content.length} characters`
    );
    // AI reply received
    return response;
  } catch (error) {
    activityLogger.addActivity('error', `Chat failed: ${error}`);
    // Chat error
    return null;
  }
}

// Example 8: Get model detailed information
export async function getModelDetails(modelName: string) {
  try {
    activityLogger.addActivity('info', `Getting model details: ${modelName}`);

    const modelInfo = await ollamaApi.showModelInfo(modelName, true);
    if (modelInfo) {
      // 🔍 Model details
      activityLogger.addActivity('success', `Model details retrieved successfully: ${modelName}`);
    }
    return modelInfo;
  } catch (error) {
    activityLogger.addActivity('error', `Failed to get model details: ${error}`);
    // Get model details error
    return null;
  }
}

// Example 9: Download model
export async function downloadModel(modelName: string) {
  try {
    activityLogger.addActivity('info', `Starting model download: ${modelName}`);

    await ollamaApi.pullModel(modelName, progress => {
      if (progress.status === 'downloading' && progress.completed && progress.total) {
        const percent = ((progress.completed / progress.total) * 100).toFixed(1);
        // 📥 Download progress
      } else {
        // 📥 Download status
      }
    });

    activityLogger.addActivity('success', `Model download completed: ${modelName}`);
    // ✅ Model download completed
  } catch (error) {
    activityLogger.addActivity('error', `Model download failed: ${error}`);
    // Model download error
  }
}

// Example 10: Delete model
export async function removeModel(modelName: string) {
  try {
    activityLogger.addActivity('info', `Deleting model: ${modelName}`);

    const success = await ollamaApi.deleteModel(modelName);
    if (success) {
      activityLogger.addActivity('success', `Model deleted successfully: ${modelName}`);
      // 🗑️ Model deleted successfully
    } else {
      activityLogger.addActivity('error', `Model deletion failed: ${modelName}`);
      // ❌ Model deletion failed
    }
    return success;
  } catch (error) {
    activityLogger.addActivity('error', `Delete model error: ${error}`);
    // Delete model error
    return false;
  }
}

// Example 11: Generate embeddings
export async function generateEmbeddings(model: string, texts: string[]) {
  try {
    activityLogger.addActivity(
      'info',
      `Generating embeddings - Model: ${model}, Text count: ${texts.length}`
    );

    const result = await ollamaApi.generateEmbeddings(model, texts);
    activityLogger.addActivity(
      'success',
      `Embedding generation completed - ${result.embeddings.length} vectors`
    );
    // 🧮 Embeddings
    return result;
  } catch (error) {
    activityLogger.addActivity('error', `Embedding generation failed: ${error}`);
    // Embedding generation error
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
      // 📋 Model copied successfully
    } else {
      activityLogger.addActivity('error', `Model copy failed: ${source} -> ${destination}`);
      // ❌ Model copy failed
    }
    return success;
  } catch (error) {
    activityLogger.addActivity('error', `Copy model error: ${error}`);
    // Copy model error
    return false;
  }
}

// Example 13: Comprehensive demonstration function
export async function demonstrateOllamaAPI() {
  // 🚀 Starting Ollama API demonstration

  // 1. Check connection
  // 1️⃣ Checking connection status
  const isConnected = await checkOllamaConnection();
  if (!isConnected) {
    // ❌ Ollama service not connected, demonstration terminated
    return;
  }

  // 2. Get version
  // 2️⃣ Getting version information
  await getOllamaVersion();

  // 3. List models
  // 3️⃣ Listing local models
  const models = await listAllModels();

  if (models.length === 0) {
    // ❌ No available models, please download models first
    return;
  }

  // 4. Check running models
  // 4️⃣ Checking running models
  await listRunningModels();

  // 5. Use the first available model for conversation
  const firstModel = models[0].name;
  // 5️⃣ Using model for conversation

  const messages: ChatMessage[] = [
    { role: 'user', content: 'Hello, please briefly introduce yourself.' },
  ];

  await chatWithModel(firstModel, messages);

  // 6. Get model details
  // 6️⃣ Getting detailed information for model
  await getModelDetails(firstModel);

  // ✅ Ollama API demonstration completed
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
  demonstrateOllamaAPI,
};
