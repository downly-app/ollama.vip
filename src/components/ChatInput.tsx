import { Image, Mic, MicOff, Minus, Paperclip, Send, X } from 'lucide-react';

import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import ImagePreviewDialog from './dialogs/ImagePreviewDialog';

interface ChatInputProps {
  onSendMessage: (message: string, imageFiles?: File[]) => void;
  disabled?: boolean;
  onMinimize?: () => void;
}

const ChatInput = ({ onSendMessage, disabled, onMinimize }: ChatInputProps) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((message.trim() || stagedFiles.length > 0) && !disabled) {
      onSendMessage(message.trim(), stagedFiles);
      setMessage('');
      setStagedFiles([]);
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

    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120;
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setStagedFiles(prevFiles => [...prevFiles, ...fileArray]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImagePreviewClick = (file: File) => {
    setSelectedImageUrl(URL.createObjectURL(file));
    setIsPreviewOpen(true);
  };

  const handleRemoveStagedFile = (indexToRemove: number) => {
    setStagedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className='p-4 bg-white/5 backdrop-blur-sm border-t border-white/10'>
      {onMinimize && (
        <div className='flex items-center justify-end mb-3'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={onMinimize}
            className='text-white/70 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-0 border-0 rounded-lg'
          >
            <Minus size={16} />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-3'>
        <input
          type='file'
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept='image/*'
          multiple
          className='hidden'
        />

        {/* Staged images preview */}
        {stagedFiles.length > 0 && (
          <div className='px-2 pt-2'>
            <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2'>
              {stagedFiles.map((file, index) => (
                <div key={index} className='relative group w-20 h-20'>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className='w-full h-full object-cover rounded-lg border-2 border-white/10 cursor-pointer transition-transform hover:scale-105'
                    onClick={() => handleImagePreviewClick(file)}
                  />
                  <button
                    type='button'
                    onClick={() => handleRemoveStagedFile(index)}
                    className='absolute top-0 right-0 -mt-2 -mr-2 bg-gray-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500'
                    aria-label='Remove image'
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main input area */}
        <div
          className={`relative flex items-end bg-white/8 border rounded-2xl transition-all duration-300 ${
            isFocused
              ? 'border-transparent bg-white/12 shadow-lg gradient-border-focus'
              : 'border-transparent gradient-border'
          }`}
        >
          {/* Left side tool buttons */}
          <div className='flex items-center space-x-1 p-2'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => fileInputRef.current?.click()}
              className='text-white/60 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-0 border-0 rounded-xl h-8 w-8 transition-all duration-200'
              title={t('chat.uploadImage')}
            >
              <Paperclip size={16} />
            </Button>

            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={toggleRecording}
              className={`text-white/60 hover:text-white hover:bg-white/15 focus:outline-none focus:ring-0 border-0 rounded-xl h-8 w-8 transition-all duration-200 ${
                isRecording ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : ''
              }`}
              title={isRecording ? t('chat.stopRecording') : t('chat.startRecording')}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </Button>
          </div>

          {/* Text input area */}
          <div className='flex-1 min-w-0 py-2 chat-input-container'>
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
              className='w-full bg-transparent text-white placeholder-white/50 focus:outline-none resize-none text-sm leading-relaxed'
              style={{ minHeight: '20px', maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <div className='p-2'>
            <Button
              type='submit'
              disabled={!(message.trim() || stagedFiles.length > 0) || disabled}
              className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 flex-shrink-0 shadow-lg ${
                (message.trim() || stagedFiles.length > 0) && !disabled
                  ? 'bg-gradient-to-br from-blue-500 to-purple-500 hover:shadow-xl hover:scale-105 text-white'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
              title={t('chat.send')}
            >
              <Send
                size={16}
                className={`transition-transform duration-200 ${
                  (message.trim() || stagedFiles.length > 0) && !disabled ? 'translate-x-0.5' : ''
                }`}
              />
            </Button>
          </div>
        </div>

        {/* Bottom tip text */}
        {isRecording && (
          <div className='flex items-center justify-center space-x-2 text-red-300 text-xs'>
            <div className='w-2 h-2 bg-red-400 rounded-full animate-pulse'></div>
            <span>{t('chat.recording')}</span>
          </div>
        )}

        {message.length > 0 && (
          <div className='flex justify-between items-center text-xs text-white/50'>
            <span>{t('chat.inputTip')}</span>
            <span>
              {message.length} {t('chat.characters')}
            </span>
          </div>
        )}
      </form>
      <ImagePreviewDialog
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        imageUrl={selectedImageUrl}
      />
    </div>
  );
};

export default ChatInput;
