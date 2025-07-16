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
  handleSendMessage: (content: string, imageFiles?: File[]) => Promise<void>;
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

// Helper function to read file as base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]); // Return only the base64 part
      } else {
        reject(new Error('Failed to read file as base64 string.'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const useChat = ({
  currentModelValue,
  onError,
  onWarning,
}: UseChatOptions): UseChatReturn => {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true); // To track if the component is mounted

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
    isStopping = false,
  } = store || {};

  const currentChat = getCurrentConversation?.() || null;

  // Effect to handle component unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, [currentChatId]); // Re-run when chat ID changes

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

  const handleStreamEnd = useCallback(
    (chatId: string, messageId: string) => {
      if (!isMounted.current) return;
      console.log('Stream ended for message:', messageId);
      // Perform any state updates needed when the stream is complete
      // For example, re-enabling UI elements if they were disabled
    },
    [isMounted]
  );

  const handleStreamError = useCallback(
    (error: Error, chatId: string, messageId: string) => {
      if (!isMounted.current) return;
      console.error('Streaming error for message:', messageId, error);
      // Update the message with an error state
      // updateMessageError(chatId, messageId, error.message);
      setLoading(false);
      setTyping(false, undefined);
    },
    [isMounted, setLoading, setTyping]
  );

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
    async (content: string, imageFiles?: File[]) => {
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

        // Process images
        let imageBase64s: string[] = [];
        if (imageFiles && imageFiles.length > 0) {
          imageBase64s = await Promise.all(imageFiles.map(file => fileToBase64(file)));
        }

        // Add user message
        addMessage(currentChatId, {
          content,
          sender: 'user',
          model: parsed.model,
          images: imageBase64s,
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
              images: msg.images,
            })) || [];

          // Add current user message
          messages.push({
            id: `temp_${Date.now()}`,
            content,
            sender: 'user' as const,
            timestamp: new Date(),
            model: parsed.model,
            images: imageBase64s,
          });

          // Callback function for handling stream data
          let aiMessageId: string | null = null;
          const handleStreamChunk = (chunk: string, done: boolean) => {
            if (useChatStore.getState().isStopping) {
              useChatStore.setState({ isStopping: false, isLoading: false, isTyping: false });
              return;
            }

            if (aiMessageId === null) {
              clearTyping?.();
              aiMessageId = addMessage(currentChatId, {
                content: chunk,
                sender: 'assistant',
                model: parsed.model,
              });
            } else {
              appendMessageContent?.(currentChatId, aiMessageId, chunk);
            }

            if (done && aiMessageId) {
              handleStreamEnd(currentChatId, aiMessageId);
            }
          };

          // Send to API
          await aiApiService.sendMessage(messages, config, handleStreamChunk);
        } catch (error: any) {
          if (!isMounted.current) return;
          setLoading?.(false);
          setTyping?.(false);
          addMessage(currentChatId, {
            content: `Error: ${error.message}`,
            sender: 'assistant',
            model: parsed.model,
          });
          onError?.(error);
        } finally {
          if (isMounted.current) {
            setLoading?.(false);
            setTyping?.(false);
            clearTyping?.();
          }
        }
      } catch (e: any) {
        onError?.(e);
      }
    },
    [
      currentChatId,
      addMessage,
      currentModelValue,
      checkModelAvailability,
      getAIConfig,
      getCurrentConversation,
      setTyping,
      setLoading,
      onError,
      t,
      onWarning,
      updateConversationTitle,
      currentChat?.messages,
      clearTyping,
      appendMessageContent,
      isMounted,
      handleStreamEnd,
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
