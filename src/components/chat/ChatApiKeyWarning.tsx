import React from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';

interface ChatApiKeyWarningProps {
  isOpen: boolean;
  message?: string;
  onCancel: () => void;
  onOpenSettings: () => void;
}

const ChatApiKeyWarning: React.FC<ChatApiKeyWarningProps> = ({
  isOpen,
  message,
  onCancel,
  onOpenSettings,
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50'>
      <div className='bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in-95 duration-200'>
        {/* Icon */}
        <div className='w-12 h-12 mx-auto mb-4 bg-yellow-500/20 rounded-full flex items-center justify-center'>
          <svg
            className='w-6 h-6 text-yellow-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
            />
          </svg>
        </div>

        {/* Content */}
        <div className='text-center mb-6'>
          <h3 className='text-lg font-semibold text-white mb-2'>{t('chat.modelConfigRequired')}</h3>
          <p className='text-white/70 text-sm leading-relaxed'>
            {message || t('chat.modelConfigRequiredDescription')}
          </p>
        </div>

        {/* Suggestions */}
        <div className='mb-6 p-3 bg-white/5 rounded-lg border border-white/10'>
          <h4 className='text-sm font-medium text-white mb-2'>
            {t('chat.suggestions', 'Suggestions:')}
          </h4>
          <ul className='text-xs text-white/60 space-y-1'>
            <li>
              • {t('chat.suggestion.downloadLocal', 'Download local models from Models page')}
            </li>
            <li>• {t('chat.suggestion.configureApi', 'Configure API keys for remote models')}</li>
            <li>• {t('chat.suggestion.checkConnection', 'Check your network connection')}</li>
          </ul>
        </div>

        {/* Actions */}
        <div className='flex gap-3'>
          <button
            onClick={onCancel}
            className='flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200 text-sm font-medium'
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => {
              onCancel();
              onOpenSettings();
            }}
            className={`flex-1 px-4 py-2 bg-gradient-to-r ${currentTheme?.colors?.primary || 'from-blue-500 to-purple-500'} hover:opacity-90 text-white rounded-lg transition-all duration-200 text-sm font-medium shadow-lg`}
          >
            {t('common.settings')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatApiKeyWarning;
