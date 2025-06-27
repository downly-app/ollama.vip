import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export interface DownloadProgressData {
  id: string;
  modelName: string;
  status: 'pulling manifest' | 'downloading' | 'verifying sha256 digest' | 'writing manifest' | 'removing any unused layers' | 'success' | 'error';
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

interface DownloadProgressProps {
  downloads: DownloadProgressData[];
  onCancel?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const DownloadProgress: React.FC<DownloadProgressProps> = ({ downloads, onCancel, onDismiss }) => {
  const { t } = useTranslation();

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pulling manifest':
        return 'Pulling manifest...';
      case 'downloading':
        return 'Downloading...';
      case 'verifying sha256 digest':
        return 'Verifying file...';
      case 'writing manifest':
        return 'Writing manifest...';
      case 'removing any unused layers':
        return 'Cleaning up...';
      case 'success':
        return 'Download completed';
      case 'error':
        return 'Download failed'
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Download className="w-4 h-4 text-blue-400 animate-pulse" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProgress = (download: DownloadProgressData) => {
    if (download.status === 'success') return 100;
    if (download.status === 'error') return 0;
    if (download.total && download.completed) {
      return Math.round((download.completed / download.total) * 100);
    }
    return 0;
  };

  if (downloads.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {downloads.map((download) => (
        <Card key={download.id} className="bg-black/90 backdrop-blur-sm border-white/20 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(download.status)}
                <CardTitle className="text-sm font-medium truncate">
                  {download.modelName}
                </CardTitle>
              </div>
              <div className="flex items-center space-x-1">
                {download.status !== 'success' && download.status !== 'error' && onCancel && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(download.id)}
                    className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <X size={12} />
                  </Button>
                )}
                {(download.status === 'success' || download.status === 'error') && onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDismiss(download.id)}
                    className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <X size={12} />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{getStatusText(download.status)}</span>
                {download.total && download.completed && (
                  <span>
                    {formatBytes(download.completed)} / {formatBytes(download.total)}
                  </span>
                )}
              </div>
              {download.status === 'downloading' && download.total && download.completed && (
                <Progress 
                  value={getProgress(download)} 
                  className="h-2 bg-white/10"
                />
              )}
              {download.status === 'error' && download.error && (
                <div className="text-xs text-red-400 mt-1">
                  {download.error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DownloadProgress;