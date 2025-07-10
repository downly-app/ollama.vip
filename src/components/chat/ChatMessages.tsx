import React from 'react';
import { useTranslation } from 'react-i18next';

import ChatMessage from '@/components/ChatMessage';
import ErrorBoundary from '@/components/ErrorBoundary';
import TypingIndicator from '@/components/TypingIndicator';
import { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessagesProps {
  messages: ChatMessageType[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onResendMessage: (messageId: string, content: string) => Promise<void>;
  isTyping?: boolean;
  typingModel?: string;
}

const ChatEmpty: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className='flex flex-col items-center justify-center h-full text-white/50'>
      <div className='text-center max-w-md'>
        <div className='w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center'>
          <svg
            className='w-8 h-8 text-white/30'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
        </div>
        <h3 className='text-xl font-semibold mb-2'>{t('chat.startNewConversation')}</h3>
        <p className='text-sm text-white/40'>{t('chat.sendMessageToStart')}</p>

        <div className='mt-6 space-y-2 text-xs text-white/30'>
          <p>💡 {t('chat.tips.selectModel', 'Select a model from the dropdown above')}</p>
          <p>🚀 {t('chat.tips.typeMessage', 'Type your message and press Enter')}</p>
          <p>⚙️ {t('chat.tips.configure', 'Configure API keys in Settings')}</p>
        </div>
      </div>
    </div>
  );
};

const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  messagesEndRef,
  onEditMessage,
  onDeleteMessage,
  onResendMessage,
  isTyping = false,
  typingModel,
}) => {
  return (
    <div className='flex-1 overflow-y-auto p-4 space-y-4'>
      {messages.length === 0 ? (
        <ChatEmpty />
      ) : (
        <>
          {messages.map(message => (
            <ErrorBoundary key={message.id}>
              <ChatMessage
                message={message}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onResend={onResendMessage}
              />
            </ErrorBoundary>
          ))}
          {isTyping && (
            <ErrorBoundary>
              <TypingIndicator model={typingModel} />
            </ErrorBoundary>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
