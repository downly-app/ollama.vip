import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ChatMessage, Conversation } from '@/types/chat';
import { convertDatesToObjects } from '@/utils/dataUtils';

interface ChatState {
  conversations: Conversation[];
  currentChatId: string | null;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
  typingModel?: string;
}

interface ChatActions {
  createConversation: (title?: string, provider?: string, model?: string) => string;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string) => void;
  addMessage: (chatId: string, message: Omit<ChatMessage, 'id'>) => string;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  appendMessageContent: (chatId: string, messageId: string, contentChunk: string) => void;
  updateMessageModel: (chatId: string, messageId: string, model: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  deleteMessagesFrom: (chatId: string, messageId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  updateConversationTitle: (chatId: string, title: string) => void;
  getConversation: (chatId: string) => Conversation | undefined;
  getCurrentConversation: () => Conversation | undefined;
  searchConversations: (query: string) => Conversation[];
  setTyping: (typing: boolean, model?: string) => void;
  clearTyping: () => void;
}

type ChatStore = ChatState & ChatActions;

// Helper function to convert date fields
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

// Recursively handle nested objects
const processStorageData = (data: any) => {
  if (data?.state?.conversations) {
    return {
      ...data,
      state: {
        ...data.state,
        conversations: convertConversationDates(data.state.conversations),
      },
    };
  }
  return data;
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentChatId: null,
      isLoading: false,
      error: null,
      isTyping: false,
      typingModel: undefined,

      createConversation: (title, provider, model) => {
        // If no provider and model specified, use default values
        const defaultProvider = (provider as 'openai' | 'deepseek') || 'openai';
        const defaultModel = model || 'gpt-4o';

        const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

        set(state => ({
          conversations: [newConversation, ...state.conversations],
          currentChatId: id,
          error: null,
        }));

        return id;
      },

      deleteConversation: id => {
        set(state => ({
          conversations: state.conversations.filter(conv => conv.id !== id),
          currentChatId: state.currentChatId === id ? null : state.currentChatId,
          error: null,
        }));
      },

      selectConversation: id => {
        const conversation = get().conversations.find(conv => conv.id === id);
        if (conversation) {
          set({ currentChatId: id, error: null });
        }
      },

      addMessage: (chatId, messageData) => {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const message: ChatMessage = {
          ...messageData,
          id: messageId,
          timestamp: new Date(),
        };

        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === chatId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  updatedAt: new Date(),
                }
              : conv
          ),
          error: null,
        }));
        return messageId;
      },

      updateMessage: (chatId, messageId, content) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === chatId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                  updatedAt: new Date(),
                }
              : conv
          ),
          error: null,
        }));
      },

      appendMessageContent: (chatId, messageId, contentChunk) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === chatId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === messageId ? { ...msg, content: msg.content + contentChunk } : msg
                  ),
                  updatedAt: new Date(),
                }
              : conv
          ),
        }));
      },

      updateMessageModel: (chatId, messageId, model) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === chatId
              ? {
                  ...conv,
                  messages: conv.messages.map(msg =>
                    msg.id === messageId ? { ...msg, model } : msg
                  ),
                  updatedAt: new Date(),
                }
              : conv
          ),
          error: null,
        }));
      },

      deleteMessage: (chatId, messageId) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === chatId
              ? {
                  ...conv,
                  messages: conv.messages.filter(msg => msg.id !== messageId),
                  updatedAt: new Date(),
                }
              : conv
          ),
          error: null,
        }));
      },

      deleteMessagesFrom: (chatId, messageId) => {
        set(state => ({
          conversations: state.conversations.map(conv => {
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
          }),
          error: null,
        }));
      },

      setLoading: loading => set({ isLoading: loading }),
      setError: error => set({ error }),
      clearError: () => set({ error: null }),

      updateConversationTitle: (chatId, title) => {
        set(state => ({
          conversations: state.conversations.map(conv =>
            conv.id === chatId ? { ...conv, title, updatedAt: new Date() } : conv
          ),
        }));
      },

      getConversation: chatId => {
        return get().conversations.find(conv => conv.id === chatId);
      },

      getCurrentConversation: () => {
        const { currentChatId, conversations } = get();
        return currentChatId ? conversations.find(conv => conv.id === currentChatId) : undefined;
      },

      searchConversations: query => {
        const { conversations } = get();
        if (!query.trim()) return conversations;

        const lowercaseQuery = query.toLowerCase();
        return conversations.filter(
          conv =>
            conv.title.toLowerCase().includes(lowercaseQuery) ||
            conv.messages.some(msg => msg.content.toLowerCase().includes(lowercaseQuery))
        );
      },

      setTyping: (typing, model) => {
        set({ isTyping: typing, typingModel: model });
      },

      clearTyping: () => {
        set({ isTyping: false, typingModel: undefined });
      },
    }),
    {
      name: 'chat-store',
      // Use onRehydrateStorage to handle data recovery
      onRehydrateStorage: () => state => {
        if (state?.conversations) {
          // Convert date fields
          state.conversations = convertConversationDates(state.conversations);
        }
      },
    }
  )
);
