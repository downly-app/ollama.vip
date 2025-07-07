import { AlertCircle, ChevronDown, ChevronRight, Globe, HardDrive } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/contexts/ThemeContext';
import { modelService } from '@/services/modelService';
import {
  AIProvider,
  LOCAL_MODEL_CONFIG,
  ModelGroup,
  ModelInfo,
  ModelSelectValue,
  REMOTE_MODEL_PROVIDERS,
  RemoteModelProvider,
} from '@/types/ai';

interface ModelSelectorProps {
  value?: ModelSelectValue;
  onValueChange?: (value: ModelSelectValue) => void;
  onShowApiKeyWarning?: () => void;
  onShowSettings?: () => void;
  className?: string;
  disabled?: boolean;
}

const ModelSelector = ({
  value,
  onValueChange,
  onShowApiKeyWarning,
  onShowSettings,
  className = '',
  disabled = false,
}: ModelSelectorProps) => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [modelGroups, setModelGroups] = useState<ModelGroup[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Local Models'])); // Default expand local models

  // Load model list
  useEffect(() => {
    loadModels();
  }, []);

  // Update selected model when value changes
  useEffect(() => {
    if (value && modelGroups.length > 0) {
      const parsed = modelService.parseModelSelectValue(value);
      if (parsed) {
        // Looking for model with parsed info

        const allModels = modelGroups.flatMap(group => group.models);
        // Available models

        const model = allModels.find(m => {
          const providerMatch = m.provider === parsed.provider;
          const idMatch = m.id === parsed.model;
          // Comparing model
          return providerMatch && idMatch;
        });

        if (model) {
          // Found matching model
          setSelectedModel(model);
        } else {
          // No matching model found
          setSelectedModel(null);
        }
      }
    }
  }, [value, modelGroups]);

  const loadModels = async () => {
    setIsLoading(true);
    try {
      const groups = await modelService.getAllModels();
      setModelGroups(groups);
    } catch (error) {
      // Failed to load models
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroup = (groupTitle: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupTitle)) {
      newExpanded.delete(groupTitle);
    } else {
      newExpanded.add(groupTitle);
    }
    setExpandedGroups(newExpanded);
  };

  const handleModelSelect = async (model: ModelInfo, event: React.MouseEvent) => {
    // Prevent event bubbling
    event.preventDefault();
    event.stopPropagation();

    // Model selected

    // Set selected model first to ensure UI reflects selection state
    setSelectedModel(model);

    // Local models are directly available, no API Key check needed
    if (model.type === 'local') {
      // Local model selected, no API key check needed
      const modelValue = modelService.createModelSelectValue(model.provider, model.id);
      // Setting model value
      onValueChange?.(modelValue);
      setIsOpen(false);
      return;
    }

    // Remote models need API Key configuration check
    if (model.type === 'remote' && model.requiresApiKey) {
      // Remote model selected, checking API key configuration
      const isConfigured = modelService.hasRemoteApiConfigured(
        model.provider as RemoteModelProvider
      );
      // API key configured
      if (!isConfigured) {
        // API key not configured, showing warning
        setIsOpen(false);
        onShowApiKeyWarning?.();
        return;
      }
    }

    const modelValue = modelService.createModelSelectValue(model.provider, model.id);
    // Setting model value
    onValueChange?.(modelValue);
    setIsOpen(false);
  };

  const getModelIcon = (model: ModelInfo) => {
    if (model.type === 'local') {
      return <HardDrive className='w-4 h-4 text-green-400' />;
    } else {
      return <Globe className='w-4 h-4 text-blue-400' />;
    }
  };

  const getGroupIcon = (group: ModelGroup) => {
    if (group.type === 'local') {
      return <HardDrive className='w-4 h-4 text-green-400' />;
    } else {
      // For remote models, try to get corresponding provider icon
      const providerKey = group.models[0]?.provider as RemoteModelProvider;
      const providerConfig = REMOTE_MODEL_PROVIDERS[providerKey];

      if (providerConfig?.icon) {
        return (
          <img
            src={providerConfig.icon}
            alt={providerConfig.name}
            className='w-4 h-4'
            onError={e => {
              // If icon loading fails, use default icon
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        );
      }
      return <Globe className='w-4 h-4 text-blue-400' />;
    }
  };

  const getModelStatusIcon = (model: ModelInfo) => {
    if (model.type === 'remote' && model.requiresApiKey) {
      const isConfigured = modelService.hasRemoteApiConfigured(
        model.provider as RemoteModelProvider
      );
      if (!isConfigured) {
        return <AlertCircle className='w-3 h-3 text-orange-400' />;
      }
    }
    return null;
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} onClick={e => e.stopPropagation()}>
      {/* Selector trigger */}
      <button
        onClick={event => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full h-10 px-4 py-2 
          bg-white/10 backdrop-blur-sm border border-white/20 
          text-white hover:bg-white/15 
          focus:ring-0 focus:border-white/60 
          transition-all duration-200 rounded-xl
          flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className='flex items-center space-x-2 flex-1 min-w-0'>
          {selectedModel ? (
            <>
              {getModelIcon(selectedModel)}
              <span className='text-sm truncate'>{selectedModel.name}</span>
              {getModelStatusIcon(selectedModel)}
            </>
          ) : (
            <span className='text-sm text-white/70'>Select Model</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className='absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-xl border border-white/30 rounded-xl shadow-2xl z-[9999] max-h-96 overflow-y-auto custom-scrollbar'>
          {isLoading ? (
            <div className='p-4 text-center text-gray-600'>
              <div className='animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2'></div>
              Loading...
            </div>
          ) : modelGroups.length === 0 ? (
            <div className='p-4 text-center text-gray-600'>
              <AlertCircle className='w-8 h-8 mx-auto mb-2' />
              <p className='text-sm'>No available models</p>
              <button
                onClick={event => {
                  event.stopPropagation();
                  setIsOpen(false);
                  onShowSettings?.();
                }}
                className='mt-2 text-xs text-blue-600 hover:text-blue-500 underline'
              >
                Configure Models
              </button>
            </div>
          ) : (
            <div className='py-2'>
              {modelGroups.map((group, groupIndex) => {
                const isExpanded = expandedGroups.has(group.title);

                return (
                  <div key={group.title} className='mb-1'>
                    {/* Group title - clickable to expand/collapse */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleGroup(group.title);
                      }}
                      className='w-full px-4 py-2 text-left hover:bg-black/10 transition-colors duration-200 flex items-center justify-between'
                    >
                      <div className='flex items-center space-x-2'>
                        {getGroupIcon(group)}
                        <Globe className='w-4 h-4 text-blue-400 hidden' />
                        <span className='text-sm font-medium text-gray-800'>{group.title}</span>
                        <span className='text-xs text-gray-500'>({group.models.length})</span>
                      </div>
                      <div className='flex items-center space-x-1'>
                        {isExpanded ? (
                          <ChevronDown className='w-4 h-4 text-gray-500' />
                        ) : (
                          <ChevronRight className='w-4 h-4 text-gray-500' />
                        )}
                      </div>
                    </button>

                    {/* Model list - only show when expanded */}
                    {isExpanded && (
                      <div className='bg-black/5'>
                        {group.models.map(model => {
                          const isSelected =
                            selectedModel?.id === model.id &&
                            selectedModel?.provider === model.provider;
                          const statusIcon = getModelStatusIcon(model);

                          return (
                            <button
                              key={`${model.provider}:${model.id}`}
                              onClick={event => handleModelSelect(model, event)}
                              className={`w-full px-8 py-2 text-left hover:bg-black/10 transition-colors duration-200 border-0 bg-transparent cursor-pointer focus:outline-none focus:bg-black/15 ${
                                isSelected ? 'bg-black/15' : ''
                              }`}
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center space-x-2 flex-1 min-w-0'>
                                  <div className='flex-1 min-w-0'>
                                    <div className='text-sm text-gray-800 truncate'>
                                      {model.name}
                                    </div>
                                    {model.parameters && (
                                      <div className='text-xs text-gray-500 truncate'>
                                        {model.parameters}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className='flex items-center space-x-1'>
                                  {statusIcon}
                                  {isSelected && (
                                    <div className='w-2 h-2 rounded-full bg-gray-600'></div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Group separator line */}
                    {groupIndex < modelGroups.length - 1 && (
                      <div className='border-b border-gray-200 my-1'></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
