import { Loader2, Pause, Play, RotateCw, X } from 'lucide-react';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDownloadStore } from '@/stores/downloadStore';

const DownloadProgress = () => {
  const { t } = useTranslation();
  const { tasks, pauseDownload, retryDownload, clearTask } = useDownloadStore();
  const [hiddenTasks, setHiddenTasks] = useState<Set<string>>(new Set());

  const activeTasks = useMemo(() => {
    return Object.values(tasks).filter(
      task => task.status !== 'completed' && !hiddenTasks.has(task.id)
    );
  }, [tasks, hiddenTasks]);

  const formatBytes = (bytes: number | undefined | null) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 Bytes';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (activeTasks.length === 0) {
    return null;
  }

  return (
    <div className='fixed bottom-4 right-4 w-80 space-y-2 z-50'>
      {activeTasks.map(task => (
        <Card
          key={task.id}
          className='bg-gray-800/80 backdrop-blur-sm border-white/20 text-white shadow-lg'
        >
          <CardHeader className='flex flex-row items-center justify-between p-2'>
            <CardTitle className='text-sm font-medium'>
              {t('models.downloading')} - {task.modelName}
            </CardTitle>
            <Button
              variant='ghost'
              size='icon'
              className='w-6 h-6'
              onClick={() => {
                if (task.status === 'completed' || task.status === 'error') {
                  clearTask(task.id);
                } else {
                  setHiddenTasks(prev => new Set(prev).add(task.id));
                }
              }}
            >
              <X className='w-4 h-4' />
            </Button>
          </CardHeader>
          <CardContent className='p-2'>
            {task.status === 'finalizing' ? (
              <div className='flex items-center text-xs text-white/70'>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                {t('downloads.status.finalizing')}...
              </div>
            ) : (
              <>
                <div className='text-xs text-white/70 mb-1'>
                  {t(`downloads.status.${task.status}`)}
                </div>
                <Progress
                  value={task.progress || 0}
                  className='h-2 bg-black/20 [&>div]:bg-purple-500'
                />
                <div className='flex justify-between items-center text-xs mt-1 text-white/70'>
                  <span>{(task.progress || 0).toFixed(1)}%</span>
                  <span>
                    {formatBytes(task.completed)} / {formatBytes(task.total)}
                  </span>
                  <span>{formatBytes(task.speed)}/s</span>
                </div>
                <div className='flex items-center justify-end mt-1'>
                  {task.status === 'downloading' && (
                    <Button variant='ghost' size='sm' onClick={() => pauseDownload(task.id)}>
                      <Pause className='w-4 h-4 mr-1' />
                      {t('downloads.pause')}
                    </Button>
                  )}
                  {task.status === 'paused' && (
                    <Button variant='ghost' size='sm' onClick={() => retryDownload(task.id)}>
                      <Play className='w-4 h-4 mr-1' />
                      {t('downloads.resume')}
                    </Button>
                  )}
                  {task.status === 'error' && (
                    <Button variant='ghost' size='sm' onClick={() => retryDownload(task.id)}>
                      <RotateCw className='w-4 h-4 mr-1' />
                      {t('downloads.retry')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DownloadProgress;
