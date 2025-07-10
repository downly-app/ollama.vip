import { AlertCircle, ExternalLink, Globe, Key, Settings as SettingsIcon } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { modelService } from '@/services/modelService';
import { AIConfig, AIProvider, REMOTE_MODEL_PROVIDERS, RemoteModelProvider } from '@/types/ai';

interface AISettingsProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: AIConfig) => void;
  currentSettings: AIConfig;
}

interface ProviderConfig {
  provider: RemoteModelProvider;
  apiKey: string;
  baseURL: string;
}

const AISettings = ({ open, onClose, onSave, currentSettings }: AISettingsProps) => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AIConfig>(currentSettings);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [temperatureError, setTemperatureError] = useState<string>('');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<RemoteModelProvider | ''>('');
  const { currentTheme, setTheme, themes, originalTheme } = useTheme();

  // Initialize settings when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedThemeId(currentTheme.id);
      setSelectedLanguage(i18n.language);
      setSettings(currentSettings);
      setTemperatureError('');
      loadProviderConfigs();
    }
  }, [open, currentTheme.id, i18n.language, currentSettings]);

  // Load provider configurations
  const loadProviderConfigs = () => {
    const configs: ProviderConfig[] = [];

    Object.entries(REMOTE_MODEL_PROVIDERS).forEach(([key, provider]) => {
      const providerKey = key as RemoteModelProvider;
      const storedConfig = modelService.getRemoteApiConfig(providerKey);

      configs.push({
        provider: providerKey,
        apiKey: storedConfig?.apiKey || '',
        baseURL: storedConfig?.baseURL || provider.baseURL || '',
      });
    });

    setProviderConfigs(configs);
  };

  const handleSave = async () => {
    // Validate temperature
    if (settings.temperature < 0 || settings.temperature > 2) {
      setTemperatureError(t('settings.temperatureError', 'Temperature must be between 0 and 2'));
      return;
    }

    // Save all provider configurations
    providerConfigs.forEach(config => {
      if (config.apiKey.trim()) {
        modelService.setRemoteApiConfig(config.provider, {
          apiKey: config.apiKey.trim(),
          baseURL: config.baseURL.trim() || REMOTE_MODEL_PROVIDERS[config.provider].baseURL,
        });
      } else {
        // If API Key is empty, clear configuration
        modelService.clearRemoteApiConfig(config.provider);
      }
    });

    // Apply all settings changes
    onSave(settings);

    // Apply theme changes
    if (selectedThemeId !== currentTheme.id) {
      setTheme(selectedThemeId, false);
    }

    // Apply language changes
    if (selectedLanguage !== i18n.language) {
      i18n.changeLanguage(selectedLanguage);
    }

    // Clear model cache to reload
    modelService.clearCache();

    onClose();
  };

  const handleClose = () => {
    // Reset all settings to initial state
    setSelectedThemeId(currentTheme.id);
    setSelectedLanguage(i18n.language);
    setSettings(currentSettings);
    setTemperatureError('');
    loadProviderConfigs();
    onClose();
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow empty string or valid numbers
    if (e.target.value === '') {
      setSettings({ ...settings, temperature: 0.7 });
      setTemperatureError('');
      return;
    }

    // Validate if it's a valid number format
    const regex = /^\d*\.?\d*$/;
    if (!regex.test(e.target.value)) {
      return; // Not a valid number format, don't update
    }

    const value = parseFloat(e.target.value);
    if (isNaN(value)) {
      setTemperatureError(t('settings.temperatureInvalid', 'Please enter a valid number'));
      return;
    }

    if (value < 0 || value > 2) {
      setTemperatureError(t('settings.temperatureRange', 'Temperature must be between 0 and 2'));
    } else {
      setTemperatureError('');
    }

    setSettings({ ...settings, temperature: value });
  };

  // Update provider configuration
  const updateProviderConfig = (
    provider: RemoteModelProvider,
    field: 'apiKey' | 'baseURL',
    value: string
  ) => {
    setProviderConfigs(prev =>
      prev.map(config => (config.provider === provider ? { ...config, [field]: value } : config))
    );
  };

  const languageOptions = [
    { value: 'en', label: t('settings.languages.en') },
    { value: 'zh', label: t('settings.languages.zh') },
    { value: 'ja', label: t('settings.languages.ja') },
    { value: 'ko', label: t('settings.languages.ko') },
    { value: 'fr', label: t('settings.languages.fr') },
  ];

  // Get internationalized theme names
  const getThemeDisplayName = (themeId: string) => {
    const themeNames: Record<string, string> = {
      midnight: t('settings.themes.midnight', 'Midnight Blue'),
      rose: t('settings.themes.rose', 'Rose Pink'),
      starlight: t('settings.themes.starlight', 'Starlight Purple'),
      sunset: t('settings.themes.sunset', 'Sunset Orange'),
      ocean: t('settings.themes.ocean', 'Ocean Blue'),
      forest: t('settings.themes.forest', 'Forest Green'),
    };
    return themeNames[themeId] || themeId;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[480px] bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-2xl'>
        <DialogHeader>
          <DialogTitle
            className={`text-xl font-semibold bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-text text-transparent`}
          >
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className='text-white/70'>
            {t('settings.description', 'Configure AI model settings and preferences')}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-6 py-4'>
          {/* Language Selection */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='language' className='text-right text-white/90 font-medium'>
              {t('common.language', 'Language')}
            </Label>
            <div className='col-span-3 relative z-[10000]'>
              <Select value={selectedLanguage} onValueChange={value => setSelectedLanguage(value)}>
                <SelectTrigger className='bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 focus:ring-0 focus:border-white/60 transition-all duration-200 rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-xl z-[10001]'>
                  {languageOptions.map(lang => (
                    <SelectItem
                      key={lang.value}
                      value={lang.value}
                      className='text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg'
                    >
                      <div className='flex items-center justify-between w-full'>
                        <span className='text-xs sm:text-sm'>{lang.label}</span>
                        {selectedLanguage === lang.value && (
                          <div className='w-2 h-2 rounded-full ml-6 bg-white/40'></div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Theme Selection */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='theme' className='text-right text-white/90 font-medium'>
              {t('settings.theme', 'Theme')}
            </Label>
            <div className='col-span-3 relative z-[9999]'>
              <Select value={selectedThemeId} onValueChange={setSelectedThemeId}>
                <SelectTrigger className='bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 focus:ring-0 focus:border-white/60 transition-all duration-200 rounded-xl'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-xl z-[10000]'>
                  {themes?.map(theme => (
                    <SelectItem
                      key={theme.id}
                      value={theme.id}
                      className='text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg'
                    >
                      <div className='flex items-center justify-between w-full'>
                        <span className='text-xs sm:text-sm'>{getThemeDisplayName(theme.id)}</span>
                        {selectedThemeId === theme.id && (
                          <div className='w-2 h-2 rounded-full ml-6 bg-white/40'></div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Provider configuration */}
          <div className='space-y-4'>
            {/* Provider selection dropdown */}
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label className='text-right text-white/90 font-medium'>
                {t('settings.selectProvider', 'Select Provider')}
              </Label>
              <div className='col-span-3 relative z-[9998]'>
                <Select
                  value={selectedProvider}
                  onValueChange={value => setSelectedProvider(value as RemoteModelProvider)}
                >
                  <SelectTrigger className='bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 focus:ring-0 focus:border-white/60 transition-all duration-200 rounded-xl'>
                    <SelectValue
                      placeholder={t(
                        'settings.selectProviderPlaceholder',
                        'Please select AI provider'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent className='bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-xl z-[9999]'>
                    {Object.entries(REMOTE_MODEL_PROVIDERS).map(([key, provider]) => {
                      const providerKey = key as RemoteModelProvider;
                      const config = providerConfigs.find(c => c.provider === providerKey);
                      const hasApiKey = config?.apiKey.trim().length > 0;

                      return (
                        <SelectItem
                          key={providerKey}
                          value={providerKey}
                          className='text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg'
                        >
                          <div className='flex items-center justify-between w-full'>
                            <div className='flex items-center space-x-2'>
                              {provider.icon && (
                                <img
                                  src={provider.icon}
                                  alt={provider.name}
                                  className='w-4 h-4 object-contain'
                                  onError={e => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              )}
                              <span className='text-sm'>{provider.name}</span>
                            </div>
                            <div className='flex items-center ml-6'>
                              {hasApiKey ? (
                                <div className='w-2 h-2 rounded-full bg-green-400'></div>
                              ) : (
                                <div className='w-2 h-2 rounded-full bg-gray-400'></div>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configuration panel for selected provider */}
            {selectedProvider &&
              (() => {
                const providerInfo = REMOTE_MODEL_PROVIDERS[selectedProvider];
                const config = providerConfigs.find(c => c.provider === selectedProvider);
                const hasApiKey = config?.apiKey.trim().length > 0;

                return (
                  <div className='bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4'>
                    {/* Provider information header */}
                    <div className='flex items-start space-x-4'>
                      {providerInfo.icon && (
                        <img
                          src={providerInfo.icon}
                          alt={providerInfo.name}
                          className='w-12 h-12 object-contain flex-shrink-0'
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className='flex-1 space-y-2'>
                        <div className='flex items-center space-x-3'>
                          <h3 className='text-lg font-semibold text-white'>{providerInfo.name}</h3>
                          <div className='flex items-center space-x-1'>
                            {hasApiKey ? (
                              <>
                                <div className='w-2 h-2 rounded-full bg-green-400'></div>
                                <span className='text-xs text-green-400 font-medium'>
                                  {t('settings.configured', 'Configured')}
                                </span>
                              </>
                            ) : (
                              <>
                                <div className='w-2 h-2 rounded-full bg-gray-400'></div>
                                <span className='text-xs text-gray-400'>
                                  {t('settings.notConfigured', 'Not Configured')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className='text-sm text-white/70 leading-relaxed'>
                          {t(
                            `settings.providers.${selectedProvider}.description`,
                            providerInfo.description
                          )}
                        </p>
                        {providerInfo.website && (
                          <a
                            href={providerInfo.website}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 transition-colors'
                          >
                            <ExternalLink className='w-3 h-3' />
                            <span>{t('settings.visitWebsite', 'Visit Website')}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Configuration form */}
                    <div className='space-y-4 pt-4 border-t border-white/10'>
                      {/* API Key input */}
                      <div>
                        <Label className='text-white/90 text-sm mb-2 block font-medium'>
                          <Key className='w-4 h-4 inline mr-2' />
                          {t('settings.apiKey', 'API Key')}
                        </Label>
                        <Input
                          type='password'
                          value={config?.apiKey || ''}
                          onChange={e =>
                            updateProviderConfig(selectedProvider, 'apiKey', e.target.value)
                          }
                          className='bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40 hover:bg-white/15 focus:bg-white/20 transition-all duration-200 rounded-lg'
                          placeholder={t('settings.enterApiKey', 'Enter API Key')}
                        />
                      </div>

                      {/* API URL input */}
                      <div>
                        <Label className='text-white/90 text-sm mb-2 block font-medium'>
                          <Globe className='w-4 h-4 inline mr-2' />
                          {t('settings.apiUrl', 'API URL')}
                        </Label>
                        <Input
                          type='text'
                          value={config?.baseURL || ''}
                          onChange={e =>
                            updateProviderConfig(selectedProvider, 'baseURL', e.target.value)
                          }
                          className='bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/40 hover:bg-white/15 focus:bg-white/20 transition-all duration-200 rounded-lg'
                          placeholder={
                            providerInfo.baseURL || t('settings.enterApiUrl', 'Enter API URL')
                          }
                        />
                        <p className='text-xs text-white/50 mt-1'>
                          {t('settings.defaultUrl', 'Default URL')}: {providerInfo.baseURL}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* API URL - kept for backward compatibility */}
          <div className='grid grid-cols-4 items-center gap-4' style={{ display: 'none' }}>
            <Label htmlFor='baseURL' className='text-right text-white/90 font-medium'>
              {t('settings.apiUrl', 'API URL')}
            </Label>
            <Input
              id='baseURL'
              type='text'
              value={settings.baseURL || ''}
              onChange={e => setSettings({ ...settings, baseURL: e.target.value })}
              className='col-span-3 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder:text-white/50 hover:bg-white/15 transition-all duration-300 rounded-xl'
              placeholder={t('settings.enterApiUrl', 'Enter API URL')}
              disabled={settings.provider === 'ollama'}
            />
          </div>

          {/* API Key input - kept for backward compatibility */}
          <div className='grid grid-cols-4 items-center gap-4' style={{ display: 'none' }}>
            <Label htmlFor='apiKey' className='text-right text-white/90 font-medium'>
              {t('settings.apiKey', 'API Key')}
            </Label>
            <Input
              id='apiKey'
              type='password'
              value={settings.apiKey}
              onChange={e => setSettings({ ...settings, apiKey: e.target.value })}
              className='col-span-3 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/30 text-white placeholder:text-white/50 hover:bg-white/15 transition-all duration-300 rounded-xl'
              placeholder={t('settings.enterApiKey', 'Enter API Key')}
            />
          </div>

          {/* Temperature setting */}
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='temperature' className='text-right text-white/90 font-medium'>
              {t('settings.temperature', 'Temperature')}
            </Label>
            <div className='col-span-3 relative'>
              <Input
                id='temperature'
                type='text'
                value={settings.temperature || 0.7}
                onChange={handleTemperatureChange}
                className='temperature-input w-full px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/40 text-white placeholder:text-white/50 hover:bg-white/20 transition-all duration-300 rounded-xl'
                placeholder={t('settings.enterTemperature', '0.0 - 2.0')}
              />
              <div className='temperature-controls absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1'>
                <button
                  type='button'
                  onClick={() => {
                    const newValue = Math.max(0, (settings.temperature || 0) - 0.1);
                    setSettings({ ...settings, temperature: parseFloat(newValue.toFixed(1)) });
                  }}
                  className='w-6 h-6 flex items-center justify-center rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors'
                >
                  -
                </button>
                <button
                  type='button'
                  onClick={() => {
                    const newValue = Math.min(2, (settings.temperature || 0) + 0.1);
                    setSettings({ ...settings, temperature: parseFloat(newValue.toFixed(1)) });
                  }}
                  className='w-6 h-6 flex items-center justify-center rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors'
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {temperatureError && <div className='text-red-500 text-sm'>{temperatureError}</div>}

        <div className='flex justify-end space-x-3 pt-4'>
          <Button
            variant='outline'
            onClick={handleClose}
            className='px-8 py-3 border-white/30 text-white hover:bg-white/10 hover:border-white/50 bg-transparent backdrop-blur-sm transition-all duration-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-white/30'
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            className={`px-8 py-3 bg-gradient-to-r ${currentTheme.colors.primary} hover:opacity-90 text-white border-0 shadow-lg transition-all duration-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-white/30`}
          >
            {t('settings.saveSettings')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AISettings;
