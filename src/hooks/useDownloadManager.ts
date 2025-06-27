import { useState, useCallback, useRef } from 'react';
import { ollamaApi } from '@/services/ollamaApi';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { DownloadProgressData } from '@/components/DownloadProgress';

export const useDownloadManager = () => {
  const [downloads, setDownloads] = useState<DownloadProgressData[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const generateDownloadId = () => {
    return `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addDownload = useCallback((modelName: string) => {
    const id = generateDownloadId();
    const newDownload: DownloadProgressData = {
      id,
      modelName,
      status: 'pulling manifest',
    };

    setDownloads(prev => [...prev, newDownload]);
    return id;
  }, []);

  const updateDownload = useCallback((id: string, updates: Partial<DownloadProgressData>) => {
    setDownloads(prev => 
      prev.map(download => 
        download.id === id ? { ...download, ...updates } : download
      )
    );
  }, []);

  const removeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.filter(download => download.id !== id));
    abortControllersRef.current.delete(id);
  }, []);

  const startDownload = useCallback(async (modelName: string) => {
    const downloadId = addDownload(modelName);
    const abortController = new AbortController();
    abortControllersRef.current.set(downloadId, abortController);

    try {
      await ollamaApi.pullModel(
        modelName,
        (progress) => {
          // Check if cancelled
          if (abortController.signal.aborted) {
            return;
          }

          updateDownload(downloadId, {
            status: progress.status,
            digest: progress.digest,
            total: progress.total,
            completed: progress.completed,
          });
        }
      );

      // Download successful
      updateDownload(downloadId, { status: 'success' });
      
      toast({
        title: t('models.downloadComplete'),
        description: `${modelName} ${t('models.downloadComplete')}`,
        className: 'bg-black/80 backdrop-blur-sm border-white/20 text-white',
      });

      // Auto remove successful download after 3 seconds
      setTimeout(() => {
        removeDownload(downloadId);
      }, 3000);

    } catch (error: unknown) {
      if (abortController.signal.aborted) {
        // User cancelled download
        removeDownload(downloadId);
        return;
      }

      // Download failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateDownload(downloadId, { 
        status: 'error', 
        error: errorMessage 
      });

      toast({
        title: t('models.downloadFailed'),
        description: `${modelName}: ${errorMessage}`,
        variant: 'destructive',
        className: 'bg-red-900/80 backdrop-blur-sm border-red-500/20 text-white',
      });
    } finally {
      abortControllersRef.current.delete(downloadId);
    }
  }, [addDownload, updateDownload, removeDownload, toast, t]);

  const cancelDownload = useCallback((id: string) => {
    const abortController = abortControllersRef.current.get(id);
    if (abortController) {
      abortController.abort();
    }
    removeDownload(id);
  }, [removeDownload]);

  const dismissDownload = useCallback((id: string) => {
    removeDownload(id);
  }, [removeDownload]);

  return {
    downloads,
    startDownload,
    cancelDownload,
    dismissDownload,
  };
};