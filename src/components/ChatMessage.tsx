import { BrainCircuit, Copy, RotateCcw, Trash2, User } from 'lucide-react';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { modelService } from '@/services/modelService';
import { AIProvider } from '@/types/ai';
import { formatTime } from '@/utils/dateUtils';

import { getModelIconUrl, getProviderIconUrl, handleModelIconError } from '../utils/modelUtils';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date | string | number;
    type?: 'text' | 'image';
    imageUrl?: string;
    model?: string;
  };
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onResend?: (messageId: string, content: string) => void;
}

const ChatMessage = ({ message, onEdit, onDelete, onResend }: ChatMessageProps) => {
  const { t } = useTranslation();
  const isUser = message.sender === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  const { thinkingContent, answerContent } = useMemo(() => {
    if (isUser) {
      return { thinkingContent: null, answerContent: message.content };
    }

    const thinkMatch = message.content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      const thinking = thinkMatch[1].trim();
      const answer = message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      return { thinkingContent: thinking, answerContent: answer };
    }

    return { thinkingContent: null, answerContent: message.content };
  }, [message.content, isUser]);

  const getProviderFromModel = (modelName?: string): AIProvider => {
    if (!modelName) return 'openai';
    const parsed = modelService.parseModelSelectValue(modelName);
    if (parsed) return parsed.provider;
    // Fallback for older formats
    if (modelName.includes('deepseek')) return 'deepseek';
    if (modelName.includes('claude')) return 'anthropic';
    if (modelName.includes('gemini')) return 'google';
    if (modelName.includes(':')) return 'ollama';
    return 'openai';
  };

  const provider = getProviderFromModel(message.model);
  const modelName = message.model || 'gpt-4o';
  const modelValue = modelService.createModelSelectValue(provider as AIProvider, modelName);

  // Handle copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Copy failed
    }
  };

  // Handle user message edit confirmation
  const handleEditConfirm = () => {
    if (editContent.trim() && editContent !== message.content && isUser && onResend) {
      // Only allow editing user messages and resending
      onResend(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowActions(false);
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-2 sm:px-0 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`flex items-start max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            isUser
              ? 'ml-3 bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg'
              : 'mr-3 bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg overflow-hidden'
          }`}
        >
          {isUser ? (
            <User size={20} className='text-white/80' />
          ) : (
            <img
              src={(() => {
                // Try to parse model value to get provider
                const parsed = modelService.parseModelSelectValue(modelValue);
                if (parsed) {
                  return getProviderIconUrl(parsed.provider);
                }
                // Fall back to model name parsing
                return getModelIconUrl(message.model);
              })()}
              alt='AI'
              className='w-8 h-8 object-contain rounded-full'
              onError={handleModelIconError}
            />
          )}
        </div>

        {/* Message content area */}
        <div className='relative flex-1'>
          {/* Message bubble */}
          <div
            className={`relative rounded-2xl px-4 py-3 backdrop-blur-sm shadow-lg ${
              isUser
                ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-400/40 shadow-blue-400/20'
                : 'bg-white/8 border border-white/15'
            }`}
          >
            {/* Message content */}
            {message.type === 'image' && message.imageUrl ? (
              <div className='mb-3'>
                <img
                  src={message.imageUrl}
                  alt='Uploaded image'
                  className='max-w-full h-auto rounded-xl shadow-md'
                />
              </div>
            ) : null}

            {/* Edit mode */}
            {isEditing ? (
              <div className='space-y-3'>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className='w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none min-h-[80px]'
                  rows={Math.max(3, editContent.split('\n').length)}
                  autoFocus
                />
                <div className='flex justify-end space-x-2'>
                  <button
                    onClick={handleEditCancel}
                    className='p-2 hover:bg-white/10 rounded-lg transition-colors'
                    title={t('common.cancel')}
                  >
                    <div className='text-white/60 text-xs'>Cancel</div>
                  </button>
                  <button
                    onClick={handleEditConfirm}
                    className='p-2 hover:bg-white/10 rounded-lg transition-colors'
                    title={t('common.confirm')}
                  >
                    <div className='text-green-400 text-xs'>Confirm</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className='text-sm leading-relaxed'>
                {thinkingContent ? (
                  <Collapsible open={showThinking} onOpenChange={setShowThinking}>
                    <MarkdownRenderer content={answerContent} />
                    <CollapsibleTrigger asChild>
                      <button className='flex items-center space-x-2 text-xs text-white/50 hover:text-white/80 transition-colors mt-3 w-full border-t border-white/10 pt-2'>
                        <BrainCircuit size={14} />
                        <span>{t('chat.thinkingProcess')}</span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className='mt-2 p-3 bg-black/20 rounded-lg border border-white/10'>
                        <MarkdownRenderer content={thinkingContent} />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <MarkdownRenderer content={answerContent} />
                )}
              </div>
            )}

            {/* Timestamp and model info */}
            {!isEditing && (
              <div
                className={`flex items-center justify-between mt-2 pt-2 border-t border-white/10`}
              >
                <div className='flex items-center space-x-2'>
                  <span className='text-xs text-white/50'>
                    {formatTime(message.timestamp, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className='flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className='p-1 hover:bg-white/20 rounded transition-colors'
                    title={t('chat.copy')}
                  >
                    <Copy size={12} className={copied ? 'text-green-400' : 'text-white/60'} />
                  </button>

                  {/* Only show edit button for user messages */}
                  {isUser && onResend && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className='p-1 hover:bg-white/20 rounded transition-colors'
                      title={t('chat.editAndResend')}
                    >
                      <RotateCcw size={12} className='text-white/60' />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={handleDelete}
                      className='p-1 hover:bg-red-500/20 rounded transition-colors'
                      title={t('chat.deleteMessage')}
                    >
                      <Trash2 size={12} className='text-white/60 hover:text-red-400' />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
