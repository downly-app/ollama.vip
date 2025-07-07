import React from 'react';
import { useTranslation } from 'react-i18next';

import { getModelIconUrl, handleModelIconError } from '../utils/modelUtils';

interface TypingIndicatorProps {
  model?: string;
}

const TypingIndicator = ({ model }: TypingIndicatorProps) => {
  const { t } = useTranslation();

  // Use unified utility function to get model icon

  return (
    <div className='flex justify-start mb-6 px-2 sm:px-0'>
      <div className='flex items-start max-w-[85%] sm:max-w-[75%]'>
        {/* AI Avatar */}
        <div className='flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg overflow-hidden mr-3'>
          <img
            src={getModelIconUrl(model)}
            alt='AI Model'
            className='w-8 h-8 object-contain rounded-full'
            onError={handleModelIconError}
          />
        </div>

        {/* Typing indicator bubble */}
        <div className='relative flex-1'>
          <div className='relative rounded-2xl px-4 py-3 bg-white/8 border border-white/15 backdrop-blur-sm shadow-lg'>
            {/* Typing animation */}
            <div className='flex items-center space-x-2'>
              <span className='text-sm text-white/80'>{t('chat.typing', 'AI is typing')}</span>
              <div className='typing-indicator'>
                <div className='typing-dot bg-white/60'></div>
                <div className='typing-dot bg-white/60'></div>
                <div className='typing-dot bg-white/60'></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
