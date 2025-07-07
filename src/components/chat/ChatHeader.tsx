import { Settings } from 'lucide-react';

import React from 'react';
import { useTranslation } from 'react-i18next';

import ModelSelector from '@/components/ModelSelector';
import { TitleBar } from '@/components/layouts';
import { ModelSelectValue } from '@/types/ai';

interface ChatHeaderProps {
  // Chat info
  title?: string;
  messageCount?: number;

  // Model selection
  currentModelValue: ModelSelectValue;
  onModelChange: (value: string) => Promise<void>;
  isGenerating?: boolean;

  // Actions
  onShowSettings: () => void;
  onShowApiKeyWarning: () => void;

  // Optional custom content
  children?: React.ReactNode;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  messageCount = 0,
  currentModelValue,
  onModelChange,
  isGenerating = false,
  onShowSettings,
  onShowApiKeyWarning,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <TitleBar>
      <div className='flex items-center justify-between w-full'>
        {/* Left side - Chat info */}
        <div className='flex items-center space-x-3'>
          <h2 className='text-lg font-semibold text-white truncate'>
            {title || t('chat.title', 'Chat')}
          </h2>
          {title && (
            <span className='text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full'>
              {t('chat.messageCount', { count: messageCount })}
            </span>
          )}
        </div>

        {/* Right side - Controls */}
        <div className='flex items-center space-x-3'>
          {/* Model selector (only show if we have a chat) */}
          {title && (
            <div className='no-drag'>
              <ModelSelector
                value={currentModelValue}
                onValueChange={onModelChange}
                onShowApiKeyWarning={onShowApiKeyWarning}
                onShowSettings={onShowSettings}
                className='w-64'
                disabled={isGenerating}
              />
            </div>
          )}

          {/* Settings button */}
          <button
            onClick={onShowSettings}
            className='p-2 hover:bg-white/10 rounded-lg transition-colors no-drag'
            title={t('chat.apiSettings')}
          >
            <Settings className='w-5 h-5 text-white/70' />
          </button>

          {/* Custom content */}
          {children}
        </div>
      </div>
    </TitleBar>
  );
};

export default ChatHeader;
