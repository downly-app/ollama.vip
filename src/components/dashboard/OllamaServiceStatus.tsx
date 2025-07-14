import {
  Activity,
  Copy,
  Database,
  ExternalLink,
  Globe,
  MessageCircle,
  PieChart as PieChartIcon,
  Play,
  RefreshCw,
  Save,
  Server,
  Settings,
  Square,
  Tag,
  Upload,
  Zap,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import configApi from '@/services/configApi';
import { ollamaTauriApi } from '@/services/ollamaTauriApi';
import { useSystemResourceStore } from '@/stores/systemResourceStore';

const OllamaServiceStatus = () => {
  const { currentTheme } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [version, setVersion] = useState('');
  const [appVersion] = useState('1.0.0'); // Ollama Pro application version
  const [serviceAddress, setServiceAddress] = useState('');
  const [runningModels, setRunningModels] = useState(0);
  const [totalModels, setTotalModels] = useState(0);

  // Use shared system resource store
  const {
    resources: systemResources,
    startAutoRefresh,
    stopAutoRefresh,
  } = useSystemResourceStore();

  const quickActions = [
    {
      icon: MessageCircle,
      label: t('dashboard.ollamaService.quickActionLabels.aiChat'),
      color: 'from-blue-500 to-purple-500',
      onClick: () => {
        // Navigate to chat page
        window.location.href = '/chat';
      },
    },
    {
      icon: Database,
      label: t('dashboard.ollamaService.quickActionLabels.modelLibrary'),
      color: 'from-green-500 to-teal-500',
      onClick: () => {
        // Navigate to model library page
        window.location.href = '/models';
      },
    },
    {
      icon: Upload,
      label: t('dashboard.ollamaService.quickActionLabels.importGguf'),
      color: 'from-purple-500 to-pink-500',
      onClick: () => {
        // Show not supported message
        toast({
          title: t('common.notSupported'),
          description: t('dashboard.ollamaService.actions.importGgufNotSupported'),
          variant: 'default',
        });
      },
    },
  ];

  useEffect(() => {
    initializeComponent();

    // Start shared system resource monitoring
    startAutoRefresh();

    const interval = setInterval(() => {
      checkConnection();
      fetchOllamaData();
    }, 5000); // Check every 5 seconds to match SystemResourceMonitoring

    return () => {
      clearInterval(interval);
      // Don't stop auto refresh here as other components might be using it
    };
  }, [startAutoRefresh]);

  const initializeComponent = async () => {
    try {
      // First get the configured API address
      const host = await configApi.getOllamaHost();
      setServiceAddress(host);

      // Note: No need to update the base URL in Rust backend
      // As the host is automatically obtained from config manager

      // Then check connection and fetch Ollama data
      await checkConnection();
      await fetchOllamaData();
    } catch (error) {
      // Failed to initialize component
      // Use default address as fallback
      const defaultHost = 'http://127.0.0.1:11434';
      setServiceAddress(defaultHost);
      // Host is automatically configured in backend
    }
  };

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connected = await ollamaTauriApi.checkConnection();
      setIsConnected(connected);

      if (connected) {
        // Get version information
        const versionInfo = await ollamaTauriApi.getVersion();
        if (versionInfo) {
          setVersion(versionInfo.version);
        }
      }
    } catch (error) {
      setIsConnected(false);
      // Connection check failed
    }
    setIsChecking(false);
  };

  const fetchOllamaData = async () => {
    try {
      // Try to get model data, use default values if Ollama service is not started
      let models: any[] = [];
      let runningModelsList: any[] = [];

      if (isConnected) {
        try {
          [models, runningModelsList] = await Promise.all([
            ollamaTauriApi.listModels(),
            ollamaTauriApi.listRunningModels(),
          ]);
        } catch (error) {
          // Failed to fetch Ollama data, service may be unavailable
          // Set connection status to false, but don't throw error
          setIsConnected(false);
        }
      }

      setTotalModels(models.length);
      setRunningModels(runningModelsList.length);
    } catch (error) {
      // Failed to fetch Ollama data
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(serviceAddress);
    toast({
      title: t('dashboard.ollamaService.actions.copied'),
      description: t('dashboard.ollamaService.actions.addressCopied'),
    });
  };

  const saveAddress = async () => {
    try {
      // Use config API to save address
      const normalizedHost = await configApi.setOllamaHost(serviceAddress);
      setServiceAddress(normalizedHost);

      // Host is automatically configured in backend
      // No need to update configuration

      // Extract host:port for display
      const envHost = normalizedHost.replace('http://', '').replace('https://', '');

      toast({
        title: t('dashboard.ollamaService.actions.save'),
        description: t('dashboard.ollamaService.actions.addressSavedWithEnv', { envHost }),
      });

      // Recheck connection after saving
      await checkConnection();
    } catch (error) {
      // Failed to save address
      toast({
        title: 'Save Failed',
        description: `Unable to save address: ${error}`,
        variant: 'destructive',
      });
    }
  };

  const toggleService = async () => {
    if (isConnected) {
      // Restart Ollama service
      try {
        setIsChecking(true);
        const result = await ollamaApi.restartOllama();

        toast({
          title: t('dashboard.ollamaService.actions.serviceRestarted'),
          description: result,
        });

        // Wait for a while then recheck connection status
        setTimeout(async () => {
          await checkConnection();
          await fetchOllamaData();
        }, 2000);
      } catch (error) {
        // Failed to restart Ollama
        const errorMessage = error instanceof Error ? error.message : String(error);

        toast({
          title: t('dashboard.ollamaService.actions.restartFailed') || 'Restart Failed',
          description: errorMessage,
          variant: 'destructive',
          duration: 8000, // Extend display time for users to read detailed information
        });
      } finally {
        setIsChecking(false);
      }
    } else {
      // Start Ollama service
      try {
        setIsChecking(true);
        const result = await ollamaApi.restartOllama();

        toast({
          title: t('dashboard.ollamaService.actions.serviceStarted'),
          description: result,
        });

        // Wait for a while then recheck connection status
        setTimeout(async () => {
          await checkConnection();
          await fetchOllamaData();
        }, 2000);
      } catch (error) {
        // Failed to start Ollama
        const errorMessage = error instanceof Error ? error.message : String(error);

        toast({
          title: t('dashboard.ollamaService.actions.startFailed') || 'Start Failed',
          description: errorMessage,
          variant: 'destructive',
          duration: 8000, // Extend display time for users to read detailed information
        });
      } finally {
        setIsChecking(false);
      }
    }
  };

  const getStatusColor = () => {
    if (isChecking) return 'bg-yellow-500';
    return isConnected ? 'bg-green-500' : 'bg-red-500';
  };

  const getStatusText = () => {
    if (isChecking) return t('dashboard.ollamaService.status.checking');
    return isConnected
      ? t('dashboard.ollamaService.status.running')
      : t('dashboard.ollamaService.status.stopped');
  };

  return (
    <Card className='bg-white/10 backdrop-blur-sm border-white/20'>
      <CardHeader className='pb-4'>
        <CardTitle
          className={`text-xl font-bold bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-text text-transparent flex items-center`}
        >
          <Server className='mr-2' size={20} />
          {t('dashboard.ollamaService.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Service status and basic information */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-3'>
            {/* Ollama Pro Version */}
            <div className='flex items-center justify-between'>
              <span className='text-white/70 flex items-center'>
                <Tag size={16} className='mr-2' />
                Ollama Pro Version
              </span>
              <Badge variant='secondary' className='text-white/90 bg-white/20'>
                {appVersion}
              </Badge>
            </div>

            {/* Ollama Version information */}
            <div className='flex items-center justify-between'>
              <span className='text-white/70 flex items-center'>
                <Tag size={16} className='mr-2' />
                {t('dashboard.ollamaService.version')}
              </span>
                <Badge variant='secondary' className='text-white/90 bg-white/20'>
                  {version || t('dashboard.ollamaService.unknown')}
                </Badge>
            </div>

            {/* Service status */}
            <div className='flex items-center justify-between'>
              <span className='text-white/70 flex items-center'>
                <Activity size={16} className='mr-2' />
                {t('dashboard.ollamaService.serviceStatus')}
              </span>
              <div className='flex items-center space-x-2'>
                <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
                <span className='text-white font-medium'>{getStatusText()}</span>
                <Button
                  size='sm'
                  variant={isConnected ? 'secondary' : 'default'}
                  onClick={toggleService}
                  disabled={isChecking}
                  className={
                    isConnected
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }
                >
                  {isConnected ? <RefreshCw size={14} /> : <Play size={14} />}
                  <span className='ml-1'>
                    {isConnected
                      ? t('dashboard.ollamaService.actions.restart')
                      : t('dashboard.ollamaService.actions.start')}
                  </span>
                </Button>
              </div>
            </div>

            {/* Listening address */}
            <div className='flex items-center justify-between'>
              <span className='text-white/70 flex items-center'>
                <Globe size={16} className='mr-2' />
                {t('dashboard.ollamaService.listeningAddress')}
              </span>
              <div className='flex items-center space-x-2'>
                <Input
                  type='text'
                  value={serviceAddress}
                  onChange={e => setServiceAddress(e.target.value)}
                  className='bg-black/30 px-2 py-1 rounded text-sm text-white/90 w-48'
                />
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={copyAddress}
                  className='text-white/70 hover:text-white hover:bg-white/10'
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={saveAddress}
                  className='text-white/70 hover:text-white hover:bg-white/10'
                >
                  <Save size={14} />
                </Button>
              </div>
            </div>

            {/* Auto start on boot */}
            <div className='flex items-center justify-between'>
              <span className='text-white/70 flex items-center'>
                <Settings size={16} className='mr-2' />
                {t('dashboard.ollamaService.autoStart')}
              </span>
              <div className='relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gray-600'>
                <input
                  type='checkbox'
                  className='sr-only'
                  checked={autoStart}
                  onChange={e => {
                    // Show not supported message
                    toast({
                      title: t('common.notSupported'),
                      description: t('dashboard.ollamaService.actions.autoStartNotSupported'),
                      variant: 'default',
                    });
                  }}
                />
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform cursor-pointer ${
                    autoStart ? 'translate-x-6 bg-blue-500' : 'translate-x-1'
                  }`}
                  onClick={() => {
                    // Show not supported message
                    toast({
                      title: t('common.notSupported'),
                      description: t('dashboard.ollamaService.actions.autoStartNotSupported'),
                      variant: 'default',
                    });
                  }}
                />
              </div>
            </div>

            {/* Quick actions */}
            <div className='space-y-2 pt-4 border-t border-white/10'>
              <h4 className='text-white font-medium flex items-center'>
                <Zap size={16} className='mr-2' />
                {t('dashboard.ollamaService.quickActions')}
              </h4>
              <div className='grid grid-cols-3 gap-2'>
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant='ghost'
                    className={`h-auto p-3 flex flex-col items-center text-center space-y-1 bg-gradient-to-r ${action.color} bg-opacity-20 hover:bg-opacity-30 transition-all duration-200 border border-white/10 text-white hover:text-white`}
                    onClick={action.onClick}
                  >
                    <action.icon size={20} className='text-white' />
                    <div className='text-white text-xs font-medium'>{action.label}</div>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* System load overview */}
          <div className='space-y-2 flex flex-col justify-center min-h-[300px]'>
            <h4 className='text-white font-medium text-center flex items-center justify-center'>
              <PieChartIcon size={16} className='mr-2' />
              {t('dashboard.ollamaService.systemLoadOverview')}
            </h4>
            <div className='flex justify-center flex-1 items-center'>
              <div className='w-56 h-56'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={systemResources}
                      cx='50%'
                      cy='50%'
                      innerRadius={70}
                      outerRadius={90}
                      dataKey='usage'
                      startAngle={90}
                      endAngle={450}
                    >
                      {systemResources.map((resource, index) => (
                        <Cell key={`cell-${index}`} fill={resource.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-2 mt-2'>
              {systemResources.map((resource, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-2 bg-black/20 rounded'
                >
                  <div className='flex items-center space-x-2'>
                    <div
                      className='w-3 h-3 rounded-full'
                      style={{ backgroundColor: resource.color }}
                    ></div>
                    <span className='text-white/70 text-xs'>{resource.name}</span>
                  </div>
                  <span className='text-white text-xs font-medium'>
                    {resource.usage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OllamaServiceStatus;
