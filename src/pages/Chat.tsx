import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AISettings from '@/components/AISettings';
import ChatInput from '@/components/ChatInput';
import ErrorBoundary from '@/components/ErrorBoundary';
import MessageList from '@/components/MessageList';
import ChatApiKeyWarning from '@/components/chat/ChatApiKeyWarning';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatMessages from '@/components/chat/ChatMessages';
import { useChat } from '@/hooks/useChat';
import { useModelSelection } from '@/hooks/useModelSelection';
import { modelService } from '@/services/modelService';
import { safeSetToStorage } from '@/utils/dataUtils';
import { addBreadcrumb } from '@/utils/errorHandler';
import { useDebounce, useRenderPerformance } from '@/utils/performanceUtils';

const Chat = () => {
  const { t } = useTranslation();

  // Performance monitoring
  useRenderPerformance('Chat');

  // State for UI modals
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Error and warning handlers
  const handleError = (error: Error) => {
    console.error('Chat error:', error);
    // Add breadcrumb for error tracking
    addBreadcrumb(`Chat error: ${error.message}`, 'error', {
      errorType: error.name,
      stack: error.stack,
    });
  };

  const handleWarning = (message: string) => {
    setWarningMessage(message);
    setShowApiKeyWarning(true);
  };

  // Model selection hook
  const {
    currentModelValue,
    showSettings,
    setCurrentModelValue,
    setShowSettings,
    handleModelChange,
    getAIConfigSync,
  } = useModelSelection({
    onError: handleError,
    onWarning: handleWarning,
  });

  // Chat hook
  const {
    conversations,
    currentChatId,
    currentChat,
    isLoading,
    isTyping,
    typingModel,
    handleChatSelect,
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleResendMessage,
    messagesEndRef,
  } = useChat({
    currentModelValue,
    onError: handleError,
    onWarning: handleWarning,
  });

  // Enhanced send message with generation state
  const handleSendMessageWithState = async (
    content: string,
    type?: 'text' | 'image',
    imageFile?: File
  ) => {
    setIsGenerating(true);

    // Add breadcrumb for message sending
    addBreadcrumb(`Sending message: ${content.substring(0, 50)}...`, 'user_action', {
      messageLength: content.length,
      type: type || 'text',
      hasImage: !!imageFile,
    });

    try {
      await handleSendMessage(content, type, imageFile);
      addBreadcrumb('Message sent successfully', 'success');
    } catch (error) {
      addBreadcrumb(`Message sending failed: ${error.message}`, 'error');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced resend message with generation state
  const handleResendMessageWithState = async (messageId: string, content: string) => {
    setIsGenerating(true);
    try {
      await handleResendMessage(messageId, content);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle API key warning from message list
  const handleShowApiKeyWarning = (message?: string) => {
    setWarningMessage(
      message || t('chat.configureApiKey', 'Please configure API Key or download local models')
    );
    setShowApiKeyWarning(true);
  };

  // Handle settings save
  const handleSettingsSave = (newSettings: any) => {
    addBreadcrumb('Settings saved', 'user_action', {
      provider: newSettings.provider,
      model: newSettings.model,
    });

    // Save new settings
    safeSetToStorage('ai-config', newSettings);

    // Update current model value
    const modelValue = modelService.createModelSelectValue(newSettings.provider, newSettings.model);
            setCurrentModelValue(modelValue);

    setShowSettings(false);

    // Refresh model cache
    modelService.clearCache();

    addBreadcrumb('Settings applied and cache refreshed', 'system');
  };

  return (
    <ErrorBoundary onError={handleError}>
      <div className='flex h-full'>
        {/* Left message list */}
        <ErrorBoundary onError={handleError}>
          <MessageList
            onChatSelect={handleChatSelect}
            currentChatId={currentChatId}
            onShowApiKeyWarning={handleShowApiKeyWarning}
          />
        </ErrorBoundary>

        {/* Right chat area */}
        <div className='flex-1 flex flex-col h-full'>
          {currentChatId && currentChat ? (
            <ErrorBoundary onError={handleError}>
              {/* Chat header */}
              <ChatHeader
                title={currentChat.title}
                messageCount={currentChat.messages.length}
                currentModelValue={currentModelValue}
                onModelChange={handleModelChange}
                isGenerating={isGenerating || isLoading}
                        onShowSettings={() => setShowSettings(true)}
                onShowApiKeyWarning={() => handleShowApiKeyWarning()}
              />

              {/* Message area */}
              <ChatMessages
                messages={currentChat.messages}
                messagesEndRef={messagesEndRef}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onResendMessage={handleResendMessageWithState}
                isTyping={isTyping}
                typingModel={typingModel}
              />

              {/* Input area */}
              <ErrorBoundary onError={handleError}>
                <ChatInput
                  onSendMessage={handleSendMessageWithState}
                  disabled={isGenerating || isLoading}
                />
              </ErrorBoundary>
            </ErrorBoundary>
          ) : (
            /* Empty state when no chat is selected */
            <ErrorBoundary onError={handleError}>
              <ChatHeader
                currentModelValue={currentModelValue}
                onModelChange={handleModelChange}
                onShowSettings={() => setShowSettings(true)}
                onShowApiKeyWarning={() => handleShowApiKeyWarning()}
              />

              <div className='flex-1 flex items-center justify-center'>
                <div className='text-center text-white/50 max-w-md'>
                  <div className='w-20 h-20 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center'>
                    <svg
                      className='w-10 h-10 text-white/20'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-2-2V10a2 2 0 012-2h2m2-4h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V6a2 2 0 012-2z'
                      />
                    </svg>
                  </div>
                  <h3 className='text-xl font-semibold mb-2'>{t('chat.selectConversation')}</h3>
                  <p className='text-sm text-white/40 mb-6'>
                    {t('chat.selectConversationDescription')}
                  </p>
                  <div className='space-y-2 text-xs text-white/30'>
                    <p>
                      💬{' '}
                      {t('chat.tips.createNew', 'Click the + button to start a new conversation')}
                    </p>
                    <p>
                      📋{' '}
                      {t(
                        'chat.tips.selectExisting',
                        'Or select an existing conversation from the list'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          )}
        </div>

        {/* API Key/Model warning popup */}
        <ChatApiKeyWarning
          isOpen={showApiKeyWarning}
          message={warningMessage}
          onCancel={() => {
                    setShowApiKeyWarning(false);
                    setWarningMessage('');
                  }}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Settings dialog */}
        {showSettings && (
          <AISettings
            open={showSettings}
            onClose={() => setShowSettings(false)}
            onSave={handleSettingsSave}
            currentSettings={getAIConfigSync()}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Chat;
