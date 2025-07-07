import { Plus, Search, Trash2, User } from 'lucide-react';

import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChatStore } from '@/stores/chatStore';
import { AIConfig } from '@/types/ai';
import { safeGetFromStorage } from '@/utils/dataUtils';
import { formatRelativeTime } from '@/utils/dateUtils';

import { getModelIconUrl, handleModelIconError } from '../utils/modelUtils';

interface MessageListProps {
  onChatSelect?: (chatId: string) => void;
  currentChatId?: string | null;
  onShowApiKeyWarning?: () => void;
}

const MessageList = ({ onChatSelect, currentChatId, onShowApiKeyWarning }: MessageListProps) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use chatStore to get conversation data
  const { conversations, createConversation, deleteConversation } = useChatStore();

  // Get the latest used model name from conversation
  const getLatestModelFromConversation = (conversation: any) => {
    if (!conversation || !conversation.messages || conversation.messages.length === 0) {
      return conversation?.model || 'gpt-4o';
    }

    // Prioritize conversation-level model
    if (conversation.model) return conversation.model;

    // If no conversation-level model, use the model from the most recent AI message
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const message = conversation.messages[i];
      if (message.sender === 'assistant' && message.model) {
        return message.model;
      }
    }

    // Default return gpt-4o
    return 'gpt-4o';
  };

  // Get preview of last message
  const getLastMessagePreview = (messages: any[]) => {
    if (messages.length === 0) return t('chat.noConversations');
    const lastMessage = messages[messages.length - 1];
    return lastMessage.content.length > 30
      ? lastMessage.content.substring(0, 30) + '...'
      : lastMessage.content;
  };

  // Convert conversation data to display format
  const chatList = conversations.map(conversation => {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const model = getLatestModelFromConversation(conversation);

    return {
      id: conversation.id,
      name: conversation.title,
      model,
      lastMessage: getLastMessagePreview(conversation.messages),
      time: formatRelativeTime(conversation.updatedAt),
    };
  });

  // Filter chat list
  const filteredChats = chatList.filter(
    chat =>
      chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle chat click
  const handleChatClick = (chatId: string) => {
    onChatSelect?.(chatId);
  };

  // Handle delete conversation
  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering chat selection
    setShowDeleteConfirm(chatId);
  };

  // Confirm delete conversation
  const confirmDeleteChat = () => {
    if (showDeleteConfirm) {
      deleteConversation(showDeleteConfirm);
      // If deleting current conversation, clear current selection
      if (showDeleteConfirm === currentChatId) {
        onChatSelect?.('');
      }
    }
    setShowDeleteConfirm(null);
  };

  // Cancel delete
  const cancelDeleteChat = () => {
    setShowDeleteConfirm(null);
  };

  // Create new chat - check for available models
  const handleCreateNewChat = async () => {
    try {
      // Dynamically import modelService to avoid circular dependencies
      const { modelService } = await import('@/services/modelService');

      // Check if there are available models
      const hasLocal = await modelService.hasLocalModels();
      const hasRemoteApi =
        modelService.hasRemoteApiConfigured('openai') ||
        modelService.hasRemoteApiConfigured('deepseek');

      if (!hasLocal && !hasRemoteApi) {
        onShowApiKeyWarning?.();
        return;
      }

      // Get recommended model
      const recommended = await modelService.getRecommendedModel();
      if (recommended) {
        const newChatId = createConversation(undefined, recommended.provider, recommended.model);
        onChatSelect?.(newChatId);
      } else {
        // If no recommended model, use default configuration
        const aiConfig = safeGetFromStorage<AIConfig>('ai-config', {
          provider: 'openai',
          apiKey: '',
          model: 'gpt-4o',
          temperature: 0.7,
        });

        const newChatId = createConversation(undefined, aiConfig.provider, aiConfig.model);
        onChatSelect?.(newChatId);
      }
    } catch (error) {
      // Failed to create new chat
      onShowApiKeyWarning?.();
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX - 64; // Subtract toolbar width
      if (newWidth >= 200 && newWidth <= 600) {
        // Limit min and max width
        setWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className='bg-white/5 backdrop-blur-sm border-r border-white/10 flex flex-col h-full relative'
      style={{ width: `${width}px` }}
    >
      {/* Search header area */}
      <div className='p-4 border-b border-white/10'>
        <div className='flex items-center space-x-3'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4' />
            <input
              type='text'
              placeholder={t('chat.searchConversations')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full h-9 bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl pl-10 pr-4 py-1 text-white placeholder:text-white/50 hover:bg-white/15 transition-all duration-300 focus:outline-none focus:ring-0 focus:border-primary/60 focus:shadow-none'
              style={{ boxShadow: 'none' }}
            />
          </div>
          <button
            onClick={handleCreateNewChat}
            className='p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-white/20 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl'
            title={t('chat.newConversation')}
          >
            <Plus className='w-4 h-4 text-white' />
          </button>
        </div>
      </div>

      {/* Message list */}
      <div className='flex-1 overflow-y-auto custom-scrollbar-thin'>
        {filteredChats.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-32 text-white/50'>
            <Search className='w-8 h-8 mb-2' />
            <p className='text-sm'>
              {searchQuery ? t('chat.noMatchingConversations') : t('chat.noConversations')}
            </p>
          </div>
        ) : (
          filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => handleChatClick(chat.id)}
              onMouseEnter={() => setHoveredChatId(chat.id)}
              onMouseLeave={() => setHoveredChatId(null)}
              className={`flex items-center px-4 py-4 cursor-pointer transition-all duration-200 border-b border-white/5 relative group ${
                currentChatId === chat.id
                  ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/15'
                  : 'hover:bg-white/8'
              }`}
            >
              {/* Avatar */}
              <div className='relative mr-4 flex-shrink-0'>
                <div className='w-10 h-10 rounded-full flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg'>
                  <User size={20} className='text-white/80' />
                </div>
                {/* Online status indicator */}
                <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white/20 shadow-sm'></div>
              </div>

              {/* Message content */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-white font-medium text-sm truncate pr-2'>{chat.name}</span>
                  <div className='flex items-center space-x-2 flex-shrink-0'>
                    <span className='text-white/50 text-xs'>{chat.time}</span>
                    {/* Delete button - always takes space, only changes opacity */}
                    <button
                      onClick={e => handleDeleteChat(chat.id, e)}
                      className='p-1.5 hover:bg-red-500/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center flex-shrink-0'
                      title={t('common.delete')}
                    >
                      <Trash2 size={14} className='text-white/60 hover:text-red-400' />
                    </button>
                  </div>
                </div>
                <div className='flex items-center justify-between'>
                  <p className='text-white/60 text-xs truncate leading-relaxed'>
                    {chat.lastMessage || t('chat.createFirstConversation')}
                  </p>
                  {/* Unread indicator - always takes space, only changes opacity */}
                  <div className='w-2 h-2 bg-blue-400 rounded-full ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200'></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Right side resize drag area */}
      <div
        className='absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-white/20 transition-colors duration-200'
        onMouseDown={handleMouseDown}
      />

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'>
          <div className='bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>{t('common.confirm')}</h3>
            <p className='text-white/80 mb-6'>{t('chat.deleteConfirmation')}</p>
            <div className='flex space-x-3'>
              <button
                onClick={cancelDeleteChat}
                className='flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200'
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmDeleteChat}
                className='flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200'
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageList;
