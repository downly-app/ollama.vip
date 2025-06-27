import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { TitleBar } from '@/components/layouts';
import ModelSelector from '@/components/ModelSelector';
import MessageList from '@/components/MessageList';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import TypingIndicator from '@/components/TypingIndicator';
import AISettings from '@/components/AISettings';
import { useChatStore } from '@/stores/chatStore';
import { aiApiService } from '@/services/aiApi';
import { modelService } from '@/services/modelService';
import { AIConfig, AIProvider, RemoteModelProvider, REMOTE_MODEL_PROVIDERS, ModelSelectValue } from '@/types/ai';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { safeGetFromStorage, safeSetToStorage } from '@/utils/dataUtils';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-white/70 mb-4">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Chat = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentTheme } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentModelValue, setCurrentModelValue] = useState<ModelSelectValue>('openai:gpt-4o');
  const [warningMessage, setWarningMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Safely get store data with error handling
  const store = useChatStore();
  const {
    conversations = [],
    currentChatId = null,
    selectConversation,
    getCurrentConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    deleteMessagesFrom,
    updateConversationTitle,
    setLoading
  } = store || {};

  const currentChat = getCurrentConversation?.() || null;

  // Get AI configuration (async version for API calls)
  const getAIConfig = async (): Promise<AIConfig> => {
    try {
      const parsed = modelService.parseModelSelectValue(currentModelValue);
      const config = safeGetFromStorage<AIConfig>('ai-config', {
        provider: parsed?.provider || 'openai',
        apiKey: '',
        model: parsed?.model || 'gpt-4o',
        temperature: 0.7
      });

      // Ensure using currently selected model
      if (parsed) {
        config.provider = parsed.provider;
        config.model = parsed.model;
      }

      // Get correct baseURL
      config.baseURL = await modelService.getBaseURL(config.provider);

      return config;
    } catch (error) {
      console.warn('Failed to get AI config:', error);
      return {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.7
      };
    }
  };

  const initializeModel = useCallback(async () => {
    try {
      const recommended = await modelService.getRecommendedModel();
      if (recommended) {
        const modelValue = modelService.createModelSelectValue(recommended.provider, recommended.model);
        setCurrentModelValue(modelValue);

        // Save to storage
        const config = await getAIConfig();
        safeSetToStorage('ai-config', {
          ...config,
          provider: recommended.provider,
          model: recommended.model
        });
      }
    } catch (error) {
      console.warn('Failed to get recommended model:', error);
    }
  }, [setCurrentModelValue, getAIConfig]);

  // Initialize with recommended model
  useEffect(() => {
    initializeModel();
  }, [initializeModel]);

  // Scroll to bottom
  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.warn('Scroll to bottom failed:', error);
    }
  };

  useEffect(() => {
    try {
      scrollToBottom();
    } catch (error) {
      console.warn('Effect scroll failed:', error);
    }
  }, [currentChat?.messages]);

  // Get AI configuration (synchronous version for JSX)
  const getAIConfigSync = (): AIConfig => {
    try {
      const parsed = modelService.parseModelSelectValue(currentModelValue);
      return safeGetFromStorage<AIConfig>('ai-config', {
        provider: parsed?.provider || 'openai',
        apiKey: '',
        model: parsed?.model || 'gpt-4o',
        temperature: 0.7
      });
    } catch (error) {
      console.warn('Failed to get AI config:', error);
      return {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.7
      };
    }
  };

  // Handle chat selection
  const handleChatSelect = (chatId: string) => {
    try {
      selectConversation?.(chatId);
      const chat = conversations.find(c => c.id === chatId);
      if (chat) {
        // Restore model information from chat
        if (chat.provider && chat.model) {
          const modelValue = modelService.createModelSelectValue(chat.provider, chat.model);
          setCurrentModelValue(modelValue);
        }
      }
    } catch (error) {
      console.error('Failed to select chat:', error);
    }
  };

  // Check if model is available for use
  const checkModelAvailability = async (provider: AIProvider, model: string): Promise<boolean> => {
    console.log('Checking model availability:', { provider, model });

    try {
      return await modelService.isModelAvailable(provider, model);
    } catch (error) {
      console.error('Failed to check model availability:', error);
      return false;
    }
  };

  // Handle send message
  const handleSendMessage = async (content: string, type?: 'text' | 'image', imageFile?: File) => {
    try {
      if (!currentChatId || !addMessage) return;

      const parsed = modelService.parseModelSelectValue(currentModelValue);
      if (!parsed) {
        console.error('Invalid model selection value:', currentModelValue);
        return;
      }

      // Check model availability
      const isAvailable = await checkModelAvailability(parsed.provider, parsed.model);
      if (!isAvailable) {
        if (parsed.provider === 'ollama') {
          setWarningMessage(t('chat.ollamaServiceNotRunning', 'Ollama service is not running, please start Ollama service'));
        } else {
          setWarningMessage(t('chat.apiKeyRequired', 'Please configure API Key to use this model'));
        }
        setShowApiKeyWarning(true);
        return;
      }

      const config = await getAIConfig();

      // Add user message
      addMessage(currentChatId, {
        content,
        sender: 'user',
        timestamp: new Date(),
        model: parsed.model
      });

      // Update conversation title if it's a new chat
      const currentConversation = getCurrentConversation?.();
      if (currentConversation && currentConversation.title.startsWith('New Chat')) {
        const title = content.length > 30 ? `${content.substring(0, 30)}...` : content;
        console.log('Update conversation title to user\'s first question:', title);
        updateConversationTitle?.(currentChatId, title);
      }

      setIsGenerating(true);
      setLoading?.(true);

      try {
        // Prepare API message format
        const messages = currentChat?.messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: msg.timestamp,
          model: msg.model
        })) || [];

        // Add current user message
        messages.push({
          id: `temp_${Date.now()}`,
          content,
          sender: 'user' as const,
          timestamp: new Date(),
          model: parsed.model
        });

        // Call AI API
        const response = await aiApiService.sendMessage(messages, config);

        // Add AI reply
        addMessage(currentChatId, {
          content: response,
          sender: 'assistant',
          timestamp: new Date(),
          model: parsed.model
        });

      } catch (error) {
        console.error('AI API call failed:', error);

        // Add error message
        addMessage(currentChatId, {
          content: `Sorry, an error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
          sender: 'assistant',
          timestamp: new Date(),
          model: parsed.model
        });
      } finally {
        setIsGenerating(false);
        setLoading?.(false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsGenerating(false);
      setLoading?.(false);
    }
  };

  // Handle message editing
  const handleEditMessage = (messageId: string, newContent: string) => {
    try {
      if (!currentChatId || !updateMessage) return;
      updateMessage(currentChatId, messageId, newContent);
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  // Handle message deletion
  const handleDeleteMessage = (messageId: string) => {
    try {
      if (!currentChatId || !deleteMessage) return;
      deleteMessage(currentChatId, messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  // Handle message resend
  const handleResendMessage = async (messageId: string, content: string) => {
    try {
      if (!currentChatId || !deleteMessagesFrom) return;

      // Delete original message and all subsequent messages
      deleteMessagesFrom(currentChatId, messageId);

      // Resend message
      await handleSendMessage(content);
    } catch (error) {
      console.error('Failed to resend message:', error);
    }
  };

  // Handle model change
  const handleModelChange = async (value: string) => {
    try {
      console.log('Chat handleModelChange:', value);

      const parsed = modelService.parseModelSelectValue(value);
      if (!parsed) {
        console.error('Invalid model format:', value);
        return;
      }

      console.log('Parsed model:', parsed);

      // Check if remote model has API Key configured
      if (parsed.provider !== 'ollama') {
        const isConfigured = modelService.hasRemoteApiConfigured(parsed.provider as RemoteModelProvider);
        if (!isConfigured) {
          setShowSettings(true);
          toast({
            title: t('chat.apiKeyRequired'),
            description: t('chat.pleaseConfigureApiKey', { provider: parsed.provider }),
            variant: 'destructive',
            duration: 5000,
          });
          return;
        }
      }

      setCurrentModelValue(value);

      // Update configuration
      const config = await getAIConfig();
      const updatedConfig = {
        ...config,
        provider: parsed.provider,
        model: parsed.model,
        baseURL: await modelService.getBaseURL(parsed.provider)
      };

      console.log('Chat saving updated config:', updatedConfig);
      safeSetToStorage('ai-config', updatedConfig);
    } catch (error) {
      console.error('Failed to change model:', error);
    }
  };

  // Handle create new chat with availability check
  const handleCreateNewChat = async () => {
    try {
      // Check if there are available models
      const hasLocal = await modelService.hasLocalModels();
      const hasRemoteApi = Object.keys(REMOTE_MODEL_PROVIDERS).some(provider =>
        modelService.hasRemoteApiConfigured(provider as RemoteModelProvider)
      );

      if (!hasLocal && !hasRemoteApi) {
        setWarningMessage(t('chat.noModelsConfigured', 'Please download local models or configure API Key'));
        setShowApiKeyWarning(true);
        return;
      }

      // Check if current model is available
      const parsed = modelService.parseModelSelectValue(currentModelValue);
      if (parsed) {
        const isCurrentAvailable = await checkModelAvailability(parsed.provider, parsed.model);
        if (!isCurrentAvailable) {
          const recommended = await modelService.getRecommendedModel();
          if (recommended) {
            const modelValue = modelService.createModelSelectValue(recommended.provider, recommended.model);
            setCurrentModelValue(modelValue);
          } else {
            setWarningMessage(t('chat.noAvailableModels', 'No available models'));
            setShowApiKeyWarning(true);
            return;
          }
        }
      }

      // Continue with conversation creation logic...
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-full">
        {/* Left message list */}
        <ErrorBoundary>
          <MessageList
            onChatSelect={handleChatSelect}
            currentChatId={currentChatId}
            onShowApiKeyWarning={() => {
              setWarningMessage(t('chat.configureApiKey', 'Please configure API Key or download local models'));
              setShowApiKeyWarning(true);
            }}
          />
        </ErrorBoundary>

        {/* Right chat area */}
        <div className="flex-1 flex flex-col h-full">
          {currentChatId && currentChat ? (
            <ErrorBoundary>
              {/* Chat header */}
              <TitleBar>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-white truncate">
                      {currentChat.title}
                    </h2>
                    <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
                      {t('chat.messageCount', { count: currentChat.messages.length })}
                    </span>
                  </div>

                  {/* Model selector */}
                  <div className="flex items-center space-x-3">
                    <div className="no-drag">
                      <ModelSelector
                        value={currentModelValue}
                        onValueChange={handleModelChange}
                        onShowApiKeyWarning={() => {
                          setWarningMessage(t('chat.configureApiKey', 'Please configure API Key'));
                          setShowApiKeyWarning(true);
                        }}
                        onShowSettings={() => setShowSettings(true)}
                        className="w-64"
                        disabled={isGenerating}
                      />
                    </div>

                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors no-drag"
                      title={t('chat.apiSettings')}
                    >
                      <Settings className="w-5 h-5 text-white/70" />
                    </button>
                  </div>
                </div>
              </TitleBar>

              {/* Message area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
                {currentChat.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/50">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold mb-2">{t('chat.startNewConversation')}</h3>
                      <p className="text-sm">{t('chat.sendMessageToStart')}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {currentChat.messages.map((message) => (
                      <ErrorBoundary key={message.id}>
                        <ChatMessage
                          message={message}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                          onResend={handleResendMessage}
                        />
                      </ErrorBoundary>
                    ))}

                    {/* Show typing indicator when AI is generating */}
                    {isGenerating && (
                      <TypingIndicator model={modelService.parseModelSelectValue(currentModelValue)?.model || 'AI'} />
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <ErrorBoundary>
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isGenerating}
                />
              </ErrorBoundary>
            </ErrorBoundary>
          ) : (
            /* Placeholder when no chat is selected */
            <>
              {/* Title bar for when no chat is selected */}
              <TitleBar>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-white">
                      {t('chat.title', 'Chat')}
                    </h2>
                  </div>

                  {/* Settings button */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowSettings(true)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors no-drag"
                      title={t('chat.apiSettings')}
                    >
                      <Settings className="w-5 h-5 text-white/70" />
                    </button>
                  </div>
                </div>
              </TitleBar>

              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white/50">
                  <h3 className="text-xl font-semibold mb-2">{t('chat.selectConversation')}</h3>
                  <p className="text-sm">{t('chat.selectConversationDescription')}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* API Key/Model warning popup */}
        {showApiKeyWarning && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">{t('chat.modelConfigRequired')}</h3>
              <p className="text-white/70 mb-6">
                {warningMessage || t('chat.modelConfigRequiredDescription')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApiKeyWarning(false);
                    setWarningMessage('');
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => {
                    setShowApiKeyWarning(false);
                    setWarningMessage('');
                    setShowSettings(true);
                  }}
                  className={`flex-1 px-4 py-2 bg-gradient-to-r ${currentTheme?.colors?.primary || 'from-blue-500 to-purple-500'} hover:opacity-90 text-white rounded-lg transition-all duration-200`}
                >
                  {t('common.settings')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings dialog */}
        {showSettings && (
          <AISettings
            open={showSettings}
            onClose={() => setShowSettings(false)}
            onSave={(newSettings) => {
              // Save new settings
              safeSetToStorage('ai-config', newSettings);

              // Update current model value
              const modelValue = modelService.createModelSelectValue(newSettings.provider, newSettings.model);
              setCurrentModelValue(modelValue);

              setShowSettings(false);

              // Refresh model cache
              modelService.clearCache();
            }}
            currentSettings={getAIConfigSync()}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Chat;