import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { ChatMessage, Conversation } from '@/types/chat';

interface ChatState {
  conversations: Conversation[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filteredConversations: Conversation[];
}

interface ChatActions {
  // Conversation management
  createConversation: (title?: string, provider?: string, model?: string) => string;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string) => void;
  updateConversationTitle: (chatId: string, title: string) => void;

  // Message management
  addMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => string;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  appendMessageContent: (chatId: string, messageId: string, contentChunk: string) => void;
  updateMessageModel: (chatId: string, messageId: string, model: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  deleteMessagesFrom: (chatId: string, messageId: string) => void;

  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Search and filtering
  setSearchQuery: (query: string) => void;
  searchConversations: (query?: string) => Conversation[];

  // Getters
  getConversation: (chatId: string) => Conversation | undefined;
  getCurrentConversation: () => Conversation | undefined;

  // Batch operations
  batchDeleteConversations: (ids: string[]) => void;
  clearAllConversations: () => void;

  // Analytics and metadata
  getConversationStats: () => {
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    oldestConversation?: Date;
    newestConversation?: Date;
  };
}

type ChatStore = ChatState & ChatActions;

// Helper functions
const convertConversationDates = (conversations: Conversation[]): Conversation[] => {
  return conversations.map(conv => ({
    ...conv,
    createdAt: new Date(conv.createdAt),
    updatedAt: new Date(conv.updatedAt),
    messages: conv.messages.map(msg => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  }));
};

const generateId = (prefix: string = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const logAction = (actionName: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`🏪 [ChatStore] ${actionName}`, data);
  }
};

const handleError = (actionName: string, error: unknown, set: any) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`❌ [ChatStore] Error in ${actionName}:`, error);

  set((state: ChatState) => ({
    ...state,
    error: errorMessage,
    isLoading: false,
  }));

  if (process.env.NODE_ENV === 'production') {
    // Production environment error reporting
    // errorReportingService.captureException(error);
  }
};

const filterConversations = (conversations: Conversation[], query: string): Conversation[] => {
  if (!query.trim()) return conversations;

  const lowercaseQuery = query.toLowerCase();
  return conversations.filter(
    conv =>
      conv.title.toLowerCase().includes(lowercaseQuery) ||
      conv.messages.some(msg => msg.content.toLowerCase().includes(lowercaseQuery))
  );
};

// Performance monitoring decorator
const withPerformanceMonitoring = <T extends (...args: any[]) => any>(
  fn: T,
  actionName: string
): T => {
  return ((...args: any[]) => {
    const startTime = performance.now();
    const result = fn(...args);
    const endTime = performance.now();
    const duration = endTime - startTime;

    if (process.env.NODE_ENV === 'development' && duration > 10) {
      console.warn(`⚠️ [ChatStore] Slow action '${actionName}': ${duration.toFixed(2)}ms`);
    }

    return result;
  }) as T;
};

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        conversations: [],
        currentChatId: null,
        isLoading: false,
        error: null,
        searchQuery: '',
        filteredConversations: [],

        // Conversation management
        createConversation: withPerformanceMonitoring(
          (title?: string, provider?: string, model?: string) => {
            try {
              logAction('createConversation', { title, provider, model });

              const defaultProvider = (provider as 'openai' | 'deepseek') || 'openai';
              const defaultModel = model || 'gpt-4o';
              const id = generateId('chat');
              const now = new Date();

              const newConversation: Conversation = {
                id,
                title: title || `New Chat ${get().conversations.length + 1}`,
                messages: [],
                createdAt: now,
                updatedAt: now,
                provider: defaultProvider,
                model: defaultModel,
              };

              set(state => {
                const newConversations = [newConversation, ...state.conversations];
                return {
                  ...state,
                  conversations: newConversations,
                  currentChatId: id,
                  error: null,
                  filteredConversations: filterConversations(newConversations, state.searchQuery),
                };
              });

              return id;
            } catch (error) {
              handleError('createConversation', error, set);
              throw error;
            }
          },
          'createConversation'
        ),

        deleteConversation: withPerformanceMonitoring((id: string) => {
          try {
            logAction('deleteConversation', { id });

            set(state => {
              const newConversations = state.conversations.filter(conv => conv.id !== id);
              return {
                ...state,
                conversations: newConversations,
                currentChatId: state.currentChatId === id ? null : state.currentChatId,
                error: null,
                filteredConversations: filterConversations(newConversations, state.searchQuery),
              };
            });
          } catch (error) {
            handleError('deleteConversation', error, set);
            throw error;
          }
        }, 'deleteConversation'),

        selectConversation: withPerformanceMonitoring((id: string) => {
          try {
            logAction('selectConversation', { id });

            const conversation = get().conversations.find(conv => conv.id === id);
            if (conversation) {
              set(state => ({ ...state, currentChatId: id, error: null }));
            }
          } catch (error) {
            handleError('selectConversation', error, set);
            throw error;
          }
        }, 'selectConversation'),

        updateConversationTitle: withPerformanceMonitoring((chatId: string, title: string) => {
          try {
            logAction('updateConversationTitle', { chatId, title });

            set(state => {
              const newConversations = state.conversations.map(conv =>
                conv.id === chatId ? { ...conv, title, updatedAt: new Date() } : conv
              );
              return {
                ...state,
                conversations: newConversations,
                filteredConversations: filterConversations(newConversations, state.searchQuery),
              };
            });
          } catch (error) {
            handleError('updateConversationTitle', error, set);
            throw error;
          }
        }, 'updateConversationTitle'),

        // Message management
        addMessage: withPerformanceMonitoring(
          (chatId: string, messageData: Omit<ChatMessage, 'id'>) => {
            try {
              const messageId = generateId('msg');
              const message: ChatMessage = {
                ...messageData,
                id: messageId,
                timestamp: new Date(),
              };

              logAction('addMessage', { chatId, messageId });

              set(state => {
                const newConversations = state.conversations.map(conv =>
                  conv.id === chatId
                    ? {
                        ...conv,
                        messages: [...conv.messages, message],
                        updatedAt: new Date(),
                      }
                    : conv
                );
                return {
                  ...state,
                  conversations: newConversations,
                  error: null,
                  filteredConversations: filterConversations(newConversations, state.searchQuery),
                };
              });

              return messageId;
            } catch (error) {
              handleError('addMessage', error, set);
              throw error;
            }
          },
          'addMessage'
        ),

        updateMessage: withPerformanceMonitoring(
          (chatId: string, messageId: string, content: string) => {
            try {
              logAction('updateMessage', { chatId, messageId });

              set(state => {
                const newConversations = state.conversations.map(conv =>
                  conv.id === chatId
                    ? {
                        ...conv,
                        messages: conv.messages.map(msg =>
                          msg.id === messageId ? { ...msg, content } : msg
                        ),
                        updatedAt: new Date(),
                      }
                    : conv
                );
                return {
                  ...state,
                  conversations: newConversations,
                  error: null,
                  filteredConversations: filterConversations(newConversations, state.searchQuery),
                };
              });
            } catch (error) {
              handleError('updateMessage', error, set);
              throw error;
            }
          },
          'updateMessage'
        ),

        appendMessageContent: withPerformanceMonitoring(
          (chatId: string, messageId: string, contentChunk: string) => {
            try {
              set(state => {
                const newConversations = state.conversations.map(conv =>
                  conv.id === chatId
                    ? {
                        ...conv,
                        messages: conv.messages.map(msg =>
                          msg.id === messageId
                            ? { ...msg, content: msg.content + contentChunk }
                            : msg
                        ),
                        updatedAt: new Date(),
                      }
                    : conv
                );
                return {
                  ...state,
                  conversations: newConversations,
                  filteredConversations: filterConversations(newConversations, state.searchQuery),
                };
              });
            } catch (error) {
              handleError('appendMessageContent', error, set);
              throw error;
            }
          },
          'appendMessageContent'
        ),

        updateMessageModel: withPerformanceMonitoring(
          (chatId: string, messageId: string, model: string) => {
            try {
              logAction('updateMessageModel', { chatId, messageId, model });

              set(state => {
                const newConversations = state.conversations.map(conv =>
                  conv.id === chatId
                    ? {
                        ...conv,
                        messages: conv.messages.map(msg =>
                          msg.id === messageId ? { ...msg, model } : msg
                        ),
                        updatedAt: new Date(),
                      }
                    : conv
                );
                return {
                  ...state,
                  conversations: newConversations,
                  error: null,
                  filteredConversations: filterConversations(newConversations, state.searchQuery),
                };
              });
            } catch (error) {
              handleError('updateMessageModel', error, set);
              throw error;
            }
          },
          'updateMessageModel'
        ),

        deleteMessage: withPerformanceMonitoring((chatId: string, messageId: string) => {
          try {
            logAction('deleteMessage', { chatId, messageId });

            set(state => {
              const newConversations = state.conversations.map(conv =>
                conv.id === chatId
                  ? {
                      ...conv,
                      messages: conv.messages.filter(msg => msg.id !== messageId),
                      updatedAt: new Date(),
                    }
                  : conv
              );
              return {
                ...state,
                conversations: newConversations,
                error: null,
                filteredConversations: filterConversations(newConversations, state.searchQuery),
              };
            });
          } catch (error) {
            handleError('deleteMessage', error, set);
            throw error;
          }
        }, 'deleteMessage'),

        deleteMessagesFrom: withPerformanceMonitoring((chatId: string, messageId: string) => {
          try {
            logAction('deleteMessagesFrom', { chatId, messageId });

            set(state => {
              const newConversations = state.conversations.map(conv => {
                if (conv.id === chatId) {
                  const messageIndex = conv.messages.findIndex(msg => msg.id === messageId);
                  if (messageIndex !== -1) {
                    return {
                      ...conv,
                      messages: conv.messages.slice(0, messageIndex),
                      updatedAt: new Date(),
                    };
                  }
                }
                return conv;
              });
              return {
                ...state,
                conversations: newConversations,
                error: null,
                filteredConversations: filterConversations(newConversations, state.searchQuery),
              };
            });
          } catch (error) {
            handleError('deleteMessagesFrom', error, set);
            throw error;
          }
        }, 'deleteMessagesFrom'),

        // State management
        setLoading: (loading: boolean) => set(state => ({ ...state, isLoading: loading })),
        setError: (error: string | null) => set(state => ({ ...state, error })),
        clearError: () => set(state => ({ ...state, error: null })),

        // Search and filtering
        setSearchQuery: withPerformanceMonitoring((query: string) => {
          try {
            logAction('setSearchQuery', { query });

            set(state => ({
              ...state,
              searchQuery: query,
              filteredConversations: filterConversations(state.conversations, query),
            }));
          } catch (error) {
            handleError('setSearchQuery', error, set);
            throw error;
          }
        }, 'setSearchQuery'),

        searchConversations: (query?: string) => {
          const state = get();
          const searchQuery = query ?? state.searchQuery;
          return filterConversations(state.conversations, searchQuery);
        },

        // Getters
        getConversation: (chatId: string) => {
          return get().conversations.find(conv => conv.id === chatId);
        },

        getCurrentConversation: () => {
          const { currentChatId, conversations } = get();
          return currentChatId ? conversations.find(conv => conv.id === currentChatId) : undefined;
        },

        // Batch operations
        batchDeleteConversations: withPerformanceMonitoring((ids: string[]) => {
          try {
            logAction('batchDeleteConversations', { ids });

            set(state => {
              const newConversations = state.conversations.filter(conv => !ids.includes(conv.id));
              const newCurrentChatId = ids.includes(state.currentChatId || '')
                ? null
                : state.currentChatId;

              return {
                ...state,
                conversations: newConversations,
                currentChatId: newCurrentChatId,
                error: null,
                filteredConversations: filterConversations(newConversations, state.searchQuery),
              };
            });
          } catch (error) {
            handleError('batchDeleteConversations', error, set);
            throw error;
          }
        }, 'batchDeleteConversations'),

        clearAllConversations: withPerformanceMonitoring(() => {
          try {
            logAction('clearAllConversations');

            set(state => ({
              ...state,
              conversations: [],
              currentChatId: null,
              filteredConversations: [],
              searchQuery: '',
              error: null,
            }));
          } catch (error) {
            handleError('clearAllConversations', error, set);
            throw error;
          }
        }, 'clearAllConversations'),

        // Analytics and metadata
        getConversationStats: () => {
          const { conversations } = get();
          const totalConversations = conversations.length;
          const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
          const averageMessagesPerConversation =
            totalConversations > 0 ? totalMessages / totalConversations : 0;

          const dates = conversations.map(conv => conv.createdAt);
          const oldestConversation =
            dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined;
          const newestConversation =
            dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined;

          return {
            totalConversations,
            totalMessages,
            averageMessagesPerConversation,
            oldestConversation,
            newestConversation,
          };
        },
      }),
      {
        name: 'chat-store-enhanced',
        version: 1,
        onRehydrateStorage: () => state => {
          if (state?.conversations) {
            state.conversations = convertConversationDates(state.conversations);
            state.filteredConversations = filterConversations(
              state.conversations,
              state.searchQuery || ''
            );
          }
        },
      }
    ),
    { name: 'ChatStore' }
  )
);
