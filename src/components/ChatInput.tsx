import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Image, Mic, MicOff, Minus, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatInputProps {
  onSendMessage: (message: string, type?: 'text' | 'image', imageFile?: File) => void;
  disabled?: boolean;
  onMinimize?: () => void;
}

const ChatInput = ({ onSendMessage, disabled, onMinimize }: ChatInputProps) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-adjust height
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // Maximum height about 5 lines
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onSendMessage('Sent an image', 'image', file);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    console.log('Voice recording:', !isRecording);
  };

  return (
    <div className="p-4 bg-white/5 backdrop-blur-sm border-t border-white/10">
      {onMinimize && (
        <div className="flex items-center justify-end mb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-0 border-0 rounded-lg"
          >
            <Minus size={16} />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Main input area */}
        <div className={`relative flex items-end bg-white/8 border rounded-2xl transition-all duration-300 ${isFocused
          ? 'border-blue-400/50 bg-white/12 shadow-lg shadow-blue-400/10'
          : 'border-white/20 hover:border-white/30'
          }`}>

          {/* Left side tool buttons */}
          <div className="flex items-center space-x-1 p-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="text-white/60 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-0 border-0 rounded-xl h-8 w-8 transition-all duration-200"
              title={t('chat.uploadImage')}
            >
              <Paperclip size={16} />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleRecording}
              className={`text-white/60 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-0 border-0 rounded-xl h-8 w-8 transition-all duration-200 ${isRecording ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : ''
                }`}
              title={isRecording ? t('chat.stopRecording') : t('chat.startRecording')}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>
          </div>

          {/* Text input area */}
          <div className="flex-1 min-w-0 py-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('chat.typeMessage')}
              disabled={disabled}
              rows={1}
              className="w-full bg-transparent text-white placeholder-white/50 focus:outline-none resize-none text-sm leading-relaxed"
              style={{ minHeight: '20px', maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <div className="p-2">
            <Button
              type="submit"
              disabled={!message.trim() || disabled}
              className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 flex-shrink-0 shadow-lg ${message.trim() && !disabled
                ? 'bg-gradient-to-br from-blue-500 to-purple-500 hover:shadow-xl hover:scale-105 text-white'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              title={t('chat.send')}
            >
              <Send size={16} className={`transition-transform duration-200 ${message.trim() && !disabled ? 'translate-x-0.5' : ''
                }`} />
            </Button>
          </div>
        </div>

        {/* Bottom tip text */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-2 text-red-300 text-xs">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span>{t('chat.recording')}</span>
          </div>
        )}

        {message.length > 0 && (
          <div className="flex justify-between items-center text-xs text-white/50">
            <span>{t('chat.inputTip')}</span>
            <span>{message.length} {t('chat.characters')}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInput; 