import React, { useState, useEffect } from 'react';
import { User, Trash2, Copy, RotateCcw } from 'lucide-react';
import { formatTime } from '@/utils/dateUtils';
import MarkdownRenderer from './MarkdownRenderer';
import { useTranslation } from 'react-i18next';
import CustomSelect from '@/components/ui/custom-select';
import { useChatStore } from '@/stores/chatStore';
import { safeGetFromStorage, safeSetToStorage } from '@/utils/dataUtils';
import { AIConfig, ModelSelectValue, AIProvider } from '@/types/ai';
import { modelService } from '@/services/modelService';
import { getModelIconUrl, getProviderIconUrl, handleModelIconError } from '../utils/modelUtils';

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
  const [availableModels, setAvailableModels] = useState<{ value: string, label: string }[]>([]);
  const { conversations, updateMessage, updateMessageModel } = useChatStore();

  // Get current conversation
  const currentChat = conversations.find(
    (chat) => chat.messages.some((msg) => msg.id === message.id)
  );

  // Get AI configuration from storage
  const getAIConfig = () => {
    return safeGetFromStorage<AIConfig>('ai-config', {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4o',
      temperature: 0.7
    });
  };

  // Load available models
  useEffect(() => {
    loadAvailableModels();
  }, []);

  const loadAvailableModels = async () => {
    try {
      const modelOptions = await modelService.getAllModelSelectValues();
      setAvailableModels(modelOptions.map(option => ({
        value: option.value,
        label: option.label
      })));
    } catch (error) {
      console.error('Failed to load available models:', error);
      setAvailableModels([]);
    }
  };

  // Extract provider from model name
  const getProviderFromModel = (modelName?: string): string => {
    if (!modelName) return 'openai';

    // Check if it contains provider prefix
    if (modelName.includes('deepseek')) return 'deepseek';
    if (modelName.includes('claude')) return 'anthropic';
    if (modelName.includes('gemini')) return 'google';
    if (modelName.includes('llama') || modelName.includes('qwen') || modelName.includes('mistral') || modelName.includes(':')) {
      return 'ollama';
    }
    return 'openai';
  };

  // Create model selector value
  const [modelSelectValue, setModelSelectValue] = useState<string>('');

  // Update selection value when message model changes
  useEffect(() => {
    const provider = getProviderFromModel(message.model);
    const modelName = message.model || 'gpt-4o';
    console.log('ChatMessage: Setting model selector value:', { provider, modelName });

    const modelValue = modelService.createModelSelectValue(provider as AIProvider, modelName);
    setModelSelectValue(modelValue);
  }, [message.model]);

  // Handle model change
  const handleModelChange = (value: string) => {
    try {
      console.log('ChatMessage handleModelChange:', value);

      const parsed = modelService.parseModelSelectValue(value);
      if (!parsed) {
        console.error('Invalid model format:', value);
        return;
      }

      console.log('Parsed model:', parsed);

      if (currentChat && message.id) {
        // Use new updateMessageModel method to update message model
        updateMessageModel(currentChat.id, message.id, parsed.model);

        // If it's the latest AI message, also update AI configuration
        const isLatestAiMessage = currentChat.messages
          .filter(msg => msg.sender === 'assistant')
          .slice(-1)[0]?.id === message.id;

        if (isLatestAiMessage) {
          // Update AI configuration in storage
          const config = getAIConfig();
          safeSetToStorage('ai-config', {
            ...config,
            provider: parsed.provider,
            model: parsed.model
          });
        }

        // Update selector value
        setModelSelectValue(value);
      }
    } catch (error) {
      console.error('Failed to change model:', error);
    }
  };

  // Handle copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(t('chat.copyFailed'), err);
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
      <div className={`flex items-start max-w-[85%] sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUser
          ? 'ml-3 bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg'
          : 'mr-3 bg-gradient-to-br from-gray-700 to-gray-800 shadow-lg overflow-hidden'
          }`}>
          {isUser ? (
            <User size={20} className="text-white/80" />
          ) : (
            <img
              src={(() => {
                // Try to parse model value to get provider
                const parsed = modelService.parseModelSelectValue(modelSelectValue);
                if (parsed) {
                  return getProviderIconUrl(parsed.provider);
                }
                // Fall back to model name parsing
                return getModelIconUrl(message.model);
              })()}
              alt="AI"
              className="w-8 h-8 object-contain rounded-full"
              onError={handleModelIconError}
            />
          )}
        </div>

        {/* Message content area */}
        <div className="relative flex-1">
          {/* Message bubble */}
          <div className={`relative rounded-2xl px-4 py-3 backdrop-blur-sm shadow-lg ${isUser
            ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-400/40 shadow-blue-400/20'
            : 'bg-white/8 border border-white/15'
            }`}>
            {/* Message content */}
            {message.type === 'image' && message.imageUrl ? (
              <div className="mb-3">
                <img
                  src={message.imageUrl}
                  alt="Uploaded image"
                  className="max-w-full h-auto rounded-xl shadow-md"
                />
              </div>
            ) : null}

            {/* Edit mode */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none min-h-[80px]"
                  rows={Math.max(3, editContent.split('\n').length)}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleEditCancel}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={t('common.cancel')}
                  >
                    <div className="text-white/60 text-xs">Cancel</div>
                  </button>
                  <button
                    onClick={handleEditConfirm}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title={t('common.confirm')}
                  >
                    <div className="text-green-400 text-xs">Confirm</div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm leading-relaxed">
                {isUser ? (
                  <p className="text-white whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                ) : (
                  <MarkdownRenderer content={message.content} />
                )}
              </div>
            )}

            {/* Timestamp and model info */}
            {!isEditing && (
              <div className={`flex items-center justify-between mt-2 pt-2 border-t border-white/10`}>
                <div className="flex items-center space-x-2">
                  {!isUser && (
                    <div className="no-drag w-32">
                      <CustomSelect
                        value={modelSelectValue}
                        onValueChange={handleModelChange}
                        placeholder={t('chat.selectModel')}
                        options={availableModels}
                        size="sm"
                        variant="default"
                      />
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {/* Action buttons */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={handleCopy}
                      className="p-1 hover:bg-white/20 rounded transition-colors"
                      title={t('chat.copy')}
                    >
                      <Copy size={12} className={copied ? "text-green-400" : "text-white/60"} />
                    </button>

                    {/* Only show edit button for user messages */}
                    {isUser && onResend && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title={t('chat.editAndResend')}
                      >
                        <RotateCcw size={12} className="text-white/60" />
                      </button>
                    )}

                    {onDelete && (
                      <button
                        onClick={handleDelete}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        title={t('chat.deleteMessage')}
                      >
                        <Trash2 size={12} className="text-white/60 hover:text-red-400" />
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-white/50">
                    {formatTime(message.timestamp, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
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