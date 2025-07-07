import {
  Activity,
  Database,
  Download,
  Edit3,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Package,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { configApi } from '@/services/configApi';
import { type OllamaModel, type OllamaRunningModel, ollamaApi } from '@/services/ollamaApi';

interface RecentDownload {
  name: string;
  completedAt: string;
  size: number;
}

const ModelOverview = () => {
  const { currentTheme } = useTheme();
  const { t } = useTranslation();
  const [localModels, setLocalModels] = useState<OllamaModel[]>([]);
  const [runningModels, setRunningModels] = useState<OllamaRunningModel[]>([]);
  const [storageInfo, setStorageInfo] = useState({
    path: '~/.ollama',
    usedSpace: '0 GB',
    totalSize: 0,
  });
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [tempStoragePath, setTempStoragePath] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // ModelOverview: Fetching model data

        // Fetch models and storage base path in parallel
        const [modelsResponse, storageBasePath] = await Promise.all([
          fetch('http://127.0.0.1:11434/api/tags'),
          configApi.getOllamaModelsPath(),
        ]);

        if (!modelsResponse.ok) {
          throw new Error(`HTTP error! status: ${modelsResponse.status}`);
        }

        const data = await modelsResponse.json();
        // ModelOverview: Received data
        // ModelOverview: Storage base path

        if (data && data.models) {
          setLocalModels(data.models);

          // Calculate storage info with base directory path
          const totalSize = data.models.reduce(
            (sum: number, model: any) => sum + (model.size || 0),
            0
          );
          setStorageInfo({
            path: storageBasePath,
            usedSpace: `${(totalSize / (1024 * 1024 * 1024)).toFixed(1)} GB`,
            totalSize: totalSize,
          });
        }
      } catch (error) {
        // ModelOverview: Failed to fetch model data, Ollama service may be unavailable

        // Try to get storage base path even if models fetch fails
        try {
          const storageBasePath = await configApi.getOllamaModelsPath();
          setStorageInfo({
            path: storageBasePath,
            usedSpace: '0 GB',
            totalSize: 0,
          });
        } catch (pathError) {
          // ModelOverview: Failed to get storage path
          setStorageInfo({
            path: '~/.ollama', // Fallback to base directory
            usedSpace: '0 GB',
            totalSize: 0,
          });
        }

        setLocalModels([]);
        // ModelOverview: Ollama service is not available, using empty data
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchModelData = async () => {
    setIsLoading(true);
    try {
      // Debug info: Check Ollama configuration
      // ModelOverview: Fetching model data

      // First check if Ollama service is available
      const isOllamaAvailable = await ollamaApi.checkConnection();

      let models: OllamaModel[] = [];
      let runningList: OllamaRunningModel[] = [];

      if (isOllamaAvailable) {
        try {
          // Fetch local models and running models in parallel
          [models, runningList] = await Promise.all([
            ollamaApi.listModels(),
            ollamaApi.listRunningModels(),
          ]);
        } catch (error) {
          // ModelOverview: Failed to fetch model data, Ollama service may be unavailable
          // Use empty arrays as fallback
        }
      } else {
        // ModelOverview: Ollama service is not available, using empty data
      }

      setLocalModels(models);
      setRunningModels(runningList);

      // Calculate total size
      const totalSize = models.reduce((sum, model) => sum + model.size, 0);
      const totalSizeGB = (totalSize / (1024 * 1024 * 1024)).toFixed(1);

      setStorageInfo(prev => ({
        ...prev,
        usedSpace: `${totalSizeGB} GB`,
        totalSize,
      }));

      // Set recent downloads (sorted by modification time)
      const recentModels = models
        .sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())
        .slice(0, 3)
        .map(model => ({
          name: model.name,
          completedAt: new Date(model.modified_at).toLocaleString(),
          size: model.size,
        }));

      setRecentDownloads(recentModels);
    } catch (error) {
      // Failed to fetch model data
    } finally {
      setIsLoading(false);
    }
  };

  const openModelFolder = () => {
    // Use Tauri API to open folder (if available)
    if ((window as any).__TAURI_API__) {
      (window as any).__TAURI_API__.dialog.open({
        directory: true,
        defaultPath: storageInfo.path,
      });
    } else {
      // Opening model folder
    }
  };

  const handleEditPath = async () => {
    try {
      // Get current effective storage base path from API
      const currentPath = await configApi.getOllamaModelsPath();
      setTempStoragePath(currentPath);
      setIsEditingPath(true);
    } catch (error) {
      // Failed to get current storage path
      // Fallback to current displayed path
      setTempStoragePath(storageInfo.path);
      setIsEditingPath(true);
    }
  };

  const handleSavePath = async () => {
    try {
      // Validate path format
      const isValid = await configApi.validateModelsPath(tempStoragePath);
      if (!isValid) {
        // Invalid storage path format
        return;
      }

      // Set the new storage path and update OLLAMA_MODELS environment variable
      await configApi.setOllamaModelsPath(tempStoragePath);

      // Get the current effective path after setting to ensure UI shows the correct path
      const currentEffectivePath = await configApi.getOllamaModelsPath();
      // Storage path updated successfully

      // Update local storage info with the current effective path
      setStorageInfo(prev => ({
        ...prev,
        path: currentEffectivePath,
      }));

      // Switch to non-editing mode after all operations complete successfully
      setIsEditingPath(false);

      // Immediately refresh data to show updated information without waiting for the 30-second interval
      await fetchModelData();
    } catch (error) {
      // Failed to save storage path
      // Keep editing mode if there's an error so user can retry
    }
  };

  const handleCancelEdit = () => {
    setTempStoragePath('');
    setIsEditingPath(false);
  };

  const formatSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getModelStatusBadge = (model: OllamaRunningModel) => {
    const isExpired = new Date(model.expires_at) < new Date();
    return (
      <Badge
        variant={isExpired ? 'secondary' : 'default'}
        className={isExpired ? 'bg-gray-600 text-white' : 'bg-green-600 text-white'}
      >
        {isExpired
          ? t('dashboard.modelOverview.status.idle')
          : t('dashboard.modelOverview.status.active')}
      </Badge>
    );
  };

  return (
    <Card className='bg-white/10 backdrop-blur-sm border-white/20'>
      <CardHeader className='pb-4'>
        <CardTitle
          className={`text-xl font-bold bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-text text-transparent flex items-center justify-between`}
        >
          <div className='flex items-center'>
            <Database className='mr-2' size={20} />
            {t('dashboard.modelOverview.title')}
          </div>
          <Button
            size='sm'
            variant='ghost'
            onClick={fetchModelData}
            disabled={isLoading}
            className='text-white/70 hover:text-white hover:bg-white/10'
          >
            <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Local model count */}
        <div className='text-center p-3 bg-black/20 rounded-lg'>
          <div className='flex items-center justify-center mb-2'>
            <Package size={24} className='text-white/70 mr-2' />
            <div className='text-2xl font-bold text-white'>
              {isLoading ? '...' : localModels.length}
            </div>
          </div>
          <p className='text-white/70 text-sm'>{t('dashboard.modelOverview.localModels')}</p>
          <Button
            size='sm'
            variant='ghost'
            className='mt-2 text-white/70 hover:text-white hover:bg-white/10'
            onClick={() => (window.location.href = '/models')}
          >
            <ExternalLink size={14} className='mr-1' />
            {t('dashboard.modelOverview.viewAllModels')}
          </Button>
        </div>

        {/* Running models */}
        <div className='space-y-2'>
          <h4 className='text-white font-medium flex items-center'>
            <Activity size={16} className='mr-2' />
            {t('dashboard.modelOverview.runningModels')} ({runningModels.length})
          </h4>
          {runningModels.length > 0 ? (
            <div className='space-y-2 max-h-32 overflow-y-auto custom-scrollbar-thin'>
              {runningModels.map((model, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-2 bg-black/20 rounded'
                >
                  <div className='flex-1 min-w-0'>
                    <div className='text-white/90 text-sm truncate'>{model.name}</div>
                    <div className='text-white/50 text-xs'>VRAM: {formatSize(model.size_vram)}</div>
                  </div>
                  {getModelStatusBadge(model)}
                </div>
              ))}
            </div>
          ) : (
            <p className='text-white/50 text-sm text-center py-3'>
              {isLoading ? t('common.loading') : t('dashboard.modelOverview.noRunningModels')}
            </p>
          )}
        </div>

        {/* Storage information */}
        <div className='space-y-2'>
          <h4 className='text-white font-medium flex items-center'>
            <HardDrive size={16} className='mr-2' />
            {t('dashboard.modelOverview.storageInfo')}
          </h4>
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-white/70 flex items-center'>
                <FolderOpen size={16} className='mr-2' />
                {t('dashboard.modelOverview.storagePath')}
              </span>
              <div className='flex items-center space-x-1'>
                {!isEditingPath && (
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={handleEditPath}
                    className='text-white/70 hover:text-white hover:bg-white/10'
                    title='Edit storage path'
                  >
                    <Edit3 size={14} />
                  </Button>
                )}
                {isEditingPath && (
                  <>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={handleSavePath}
                      className='text-green-400 hover:text-green-300 hover:bg-white/10'
                      title='Save path'
                    >
                      <Save size={14} />
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={handleCancelEdit}
                      className='text-red-400 hover:text-red-300 hover:bg-white/10'
                      title='Cancel edit'
                    >
                      <X size={14} />
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isEditingPath ? (
              <Input
                value={tempStoragePath}
                onChange={e => setTempStoragePath(e.target.value)}
                className='bg-black/30 border-white/20 text-white text-xs'
                placeholder='Enter storage path...'
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    handleSavePath();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                autoFocus
              />
            ) : (
              <code className='block bg-black/30 px-2 py-1 rounded text-xs text-white/90 break-all'>
                {storageInfo.path}
              </code>
            )}
            <div className='flex items-center justify-between text-sm'>
              <span className='text-white/70'>{t('dashboard.modelOverview.usedSpace')}</span>
              <span className='text-white font-medium'>
                {isLoading ? '...' : storageInfo.usedSpace}
              </span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-white/70'>{t('dashboard.modelOverview.totalModels')}</span>
              <span className='text-white font-medium'>
                {isLoading ? '...' : localModels.length}
              </span>
            </div>
          </div>
        </div>

        {/* Recent downloads */}
        <div className='space-y-2'>
          <h4 className='text-white font-medium flex items-center'>
            <Download size={16} className='mr-2' />
            {t('dashboard.modelOverview.recentDownloads')}
          </h4>
          <div className='space-y-2 max-h-28 overflow-y-auto custom-scrollbar-thin'>
            {recentDownloads.length > 0 ? (
              recentDownloads.map((download, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-2 bg-black/20 rounded'
                >
                  <div className='flex-1 min-w-0'>
                    <div className='text-white/90 text-sm truncate'>{download.name}</div>
                    <div className='text-white/50 text-xs'>
                      {download.completedAt} • {formatSize(download.size)}
                    </div>
                  </div>
                  <Download size={14} className='text-green-400' />
                </div>
              ))
            ) : (
              <p className='text-white/50 text-sm text-center py-3'>
                {isLoading ? t('common.loading') : t('dashboard.modelOverview.noRecentDownloads')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelOverview;
