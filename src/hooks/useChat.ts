import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { aiApiService } from '@/services/aiApi';
import { modelService } from '@/services/modelService';
import { useChatStore } from '@/stores/chatStore';
import { AIConfig, AIProvider } from '@/types/ai';
import { safeGetFromStorage } from '@/utils/dataUtils';

interface UseChatOptions {
  currentModelValue: string;
  onError?: (error: Error) => void;
  onWarning?: (message: string) => void;
}

interface UseChatReturn {
  // Store data
  conversations: any[];
  currentChatId: string | null;
  currentChat: any;
  isLoading: boolean;
  isTyping: boolean;
  typingModel?: string;

  // Store actions
  selectConversation: (id: string) => void;
  addMessage: (chatId: string, message: any) => string;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  appendMessageContent: (chatId: string, messageId: string, contentChunk: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  deleteMessagesFrom: (chatId: string, messageId: string) => void;
  updateConversationTitle: (chatId: string, title: string) => void;
  getCurrentConversation: () => any;
  setLoading: (loading: boolean) => void;
  setTyping: (typing: boolean, model?: string) => void;
  clearTyping: () => void;

  // Chat handlers
  handleChatSelect: (chatId: string) => void;
  handleSendMessage: (content: string, type?: 'text' | 'image', imageFile?: File) => Promise<void>;
  handleEditMessage: (messageId: string, newContent: string) => void;
  handleDeleteMessage: (messageId: string) => void;
  handleResendMessage: (messageId: string, content: string) => Promise<void>;

  // Utilities
  checkModelAvailability: (provider: AIProvider, model: string) => Promise<boolean>;
  getAIConfig: () => Promise<AIConfig>;
  scrollToBottom: () => void;

  // Refs
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const useChat = ({
  currentModelValue,
  onError,
  onWarning,
}: UseChatOptions): UseChatReturn => {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get store data with error handling
  const store = useChatStore();
  const {
    conversations = [],
    currentChatId = null,
    selectConversation,
    getCurrentConversation,
    addMessage,
    updateMessage,
    appendMessageContent,
    deleteMessage,
    deleteMessagesFrom,
    updateConversationTitle,
    setLoading,
    isLoading = false,
    isTyping = false,
    typingModel,
    setTyping,
    clearTyping,
  } = store || {};

  const currentChat = getCurrentConversation?.() || null;

  // Get AI configuration
  const getAIConfig = useCallback(async (): Promise<AIConfig> => {
    try {
      const parsed = modelService.parseModelSelectValue(currentModelValue);
      const config = safeGetFromStorage<AIConfig>('ai-config', {
        provider: parsed?.provider || 'openai',
        apiKey: '',
        model: parsed?.model || 'gpt-4o',
        temperature: 0.7,
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
      const fallbackConfig: AIConfig = {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-4o',
        temperature: 0.7,
      };

      onError?.(error as Error);
      return fallbackConfig;
    }
  }, [currentModelValue, onError]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      onError?.(error as Error);
    }
  }, [onError]);

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, scrollToBottom]);

  // Check model availability
  const checkModelAvailability = useCallback(
    async (provider: AIProvider, model: string): Promise<boolean> => {
      try {
        return await modelService.isModelAvailable(provider, model);
      } catch (error) {
        onError?.(error as Error);
        return false;
      }
    },
    [onError]
  );

  // Handle chat selection
  const handleChatSelect = useCallback(
    (chatId: string) => {
      try {
        selectConversation?.(chatId);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [selectConversation, onError]
  );

  // Handle send message
  const handleSendMessage = useCallback(
    async (content: string, type?: 'text' | 'image', imageFile?: File) => {
      try {
        if (!currentChatId || !addMessage) return;

        const parsed = modelService.parseModelSelectValue(currentModelValue);
        if (!parsed) {
          onError?.(new Error('Invalid model selection value'));
          return;
        }

        // Check model availability
        const isAvailable = await checkModelAvailability(parsed.provider, parsed.model);
        if (!isAvailable) {
          const warningMessage =
            parsed.provider === 'ollama'
              ? t(
                  'chat.ollamaServiceNotRunning',
                  'Ollama service is not running, please start Ollama service'
                )
              : t('chat.apiKeyRequired', 'Please configure API Key to use this model');
          onWarning?.(warningMessage);
          return;
        }

        const config = await getAIConfig();

        // Add user message
        addMessage(currentChatId, {
          content,
          sender: 'user',
          timestamp: new Date(),
          model: parsed.model,
        });

        // Update conversation title if it's a new chat
        const currentConversation = getCurrentConversation?.();
        if (currentConversation && currentConversation.title.startsWith('New Chat')) {
          const title = content.length > 30 ? `${content.substring(0, 30)}...` : content;
          updateConversationTitle?.(currentChatId, title);
        }

        // Immediately show typing status for better UX
        setTyping?.(true, parsed.model);
        setLoading?.(true);

        try {
          // Prepare API message format
          const messages =
            currentChat?.messages.map(msg => ({
              id: msg.id,
              content: msg.content,
              sender: msg.sender,
              timestamp: msg.timestamp,
              model: msg.model,
            })) || [];

          // Add current user message
          messages.push({
            id: `temp_${Date.now()}`,
            content,
            sender: 'user' as const,
            timestamp: new Date(),
            model: parsed.model,
          });

          // Callback function for handling stream data
          let aiMessageId: string | null = null;
          const handleStreamChunk = (chunk: string) => {
            // Clear typing indicator when first chunk arrives
            if (aiMessageId === null) {
              clearTyping?.();
              // Create AI message when first chunk arrives
              aiMessageId = addMessage(currentChatId, {
                content: chunk,
                sender: 'assistant',
                timestamp: new Date(),
                model: parsed.model,
              });
            } else if (currentChatId && aiMessageId) {
              // Append subsequent chunks
              appendMessageContent(currentChatId, aiMessageId, chunk);
            }
          };

          // Call AI API in stream mode
          await aiApiService.sendMessage(messages, config, handleStreamChunk);
        } catch (error) {
          // Add error message
          addMessage(currentChatId, {
            content: `Sorry, an error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
            sender: 'assistant',
            timestamp: new Date(),
            model: parsed.model,
          });

          onError?.(error as Error);
        } finally {
          // Clear typing and loading states
          clearTyping?.();
          setLoading?.(false);
        }
      } catch (error) {
        clearTyping?.();
        setLoading?.(false);
        onError?.(error as Error);
      }
    },
    [
      currentChatId,
      addMessage,
      currentModelValue,
      checkModelAvailability,
      getAIConfig,
      getCurrentConversation,
      updateConversationTitle,
      currentChat?.messages,
      appendMessageContent,
      setLoading,
      onError,
      onWarning,
      t,
    ]
  );

  // Handle message editing
  const handleEditMessage = useCallback(
    (messageId: string, newContent: string) => {
      try {
        if (!currentChatId || !updateMessage) return;
        updateMessage(currentChatId, messageId, newContent);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [currentChatId, updateMessage, onError]
  );

  // Handle message deletion
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      try {
        if (!currentChatId || !deleteMessage) return;
        deleteMessage(currentChatId, messageId);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [currentChatId, deleteMessage, onError]
  );

  // Handle message resend
  const handleResendMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        if (!currentChatId || !deleteMessagesFrom) return;

        // Delete original message and all subsequent messages
        deleteMessagesFrom(currentChatId, messageId);

        // Resend message
        await handleSendMessage(content);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [currentChatId, deleteMessagesFrom, handleSendMessage, onError]
  );

  return {
    // Store data
    conversations,
    currentChatId,
    currentChat,
    isLoading,
    isTyping,
    typingModel,

    // Store actions
    selectConversation,
    addMessage,
    updateMessage,
    appendMessageContent,
    deleteMessage,
    deleteMessagesFrom,
    updateConversationTitle,
    getCurrentConversation,
    setLoading,
    setTyping,
    clearTyping,

    // Chat handlers
    handleChatSelect,
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleResendMessage,

    // Utilities
    checkModelAvailability,
    getAIConfig,
    scrollToBottom,

    // Refs
    messagesEndRef,
  };
};
