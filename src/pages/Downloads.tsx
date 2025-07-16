import {
  ArrowDownToLine,
  CheckCircle,
  Database,
  Hourglass,
  Info,
  Pause,
  Play,
  RotateCw,
  Trash2,
  XCircle,
  Loader2,
  X,
  Download,
} from 'lucide-react';

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Toolbar from '@/components/Toolbar';
import LocalModelInfoDialog from '@/components/dialogs/LocalModelInfoDialog';
import { AppLayout, Sidebar, TitleBar } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DownloadTask, useDownloadStore } from '@/stores/downloadStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Downloads = () => {
  const { t } = useTranslation();
  const { tasks, pauseDownload, retryDownload, restartDownload, clearTask, clearAllCompleted } = useDownloadStore();
  const [infoModelName, setInfoModelName] = useState<string | null>(null);

  const downloadingTasks = useMemo(
    () => Object.values(tasks).filter(task => task.status !== 'completed'),
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      Object.values(tasks)
        .filter(task => task.status === 'completed')
        .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [tasks]
  );

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes || bytes <= 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString();
  };

  const renderStatusIcon = (task: DownloadTask) => {
    switch (task.status) {
      case 'downloading':
      case 'finalizing':
        return <Loader2 className='h-4 w-4 animate-spin' />;
      case 'paused':
        return <Pause className='h-4 w-4' />;
      case 'completed':
        return <CheckCircle className='w-5 h-5 text-green-400' />;
      case 'error':
        return <XCircle className='w-5 h-5 text-red-400' />;
      default:
        return <Hourglass className='w-5 h-5 text-sky-400' />;
    }
  };

  const renderTaskActions = (task: DownloadTask) => {
    switch (task.status) {
      case 'downloading':
      case 'finalizing':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' className='hover:bg-white/10 text-white/70 hover:text-white w-8 h-8' onClick={() => pauseDownload(task.modelName)}>
                  <Pause className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('downloads.actions.pause')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'paused':
      case 'error':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant='ghost' size='icon' className='hover:bg-white/10 text-white/70 hover:text-white w-8 h-8' onClick={() => retryDownload(task.modelName)}>
                  <Play className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t(task.status === 'paused' ? 'downloads.actions.resume' : 'downloads.actions.retry')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return null;
    }
  };

  const renderTaskList = (taskList: DownloadTask[], isCompletedList: boolean) => {
    if (taskList.length === 0) {
      return (
        <div className='flex items-center justify-center h-64 bg-black/10 rounded-lg'>
          <p className='text-white/50'>
            {t(isCompletedList ? 'downloads.noCompletedJobs' : 'downloads.noDownloadingJobs')}
          </p>
        </div>
      );
    }

    return (
      <div className='space-y-3'>
        {taskList.map(task => (
          <Card
            key={task.id}
            className='bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors duration-200'
          >
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-4 flex-1 min-w-0'>
                <div className='shrink-0'>
                  {isCompletedList ? (
                    <CheckCircle className='w-8 h-8 text-green-400' />
                  ) : (
                    <Database className='w-8 h-8 text-sky-400' />
                  )}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-base font-medium text-white truncate'>{task.modelName}</p>
                  <div className='flex items-center gap-x-4 text-xs text-white/60 mt-1'>
                    {isCompletedList ? (
                      <>
                        <span>{formatBytes(task.total)}</span>
                        <span>{formatDate(task.completedAt)}</span>
                      </>
                    ) : (
                      <>
                        <span>{`${formatBytes(task.completed)} / ${formatBytes(task.total)}`}</span>
                        {task.status === 'downloading' && (
                          <span className='min-w-[60px] text-right'>
                            {task.speed > 0 ? `${formatBytes(task.speed)}/s` : '--'}
                          </span>
                        )}
                        <span className='flex items-center gap-1'>
                          <div className='w-5 h-5'>
                            {renderStatusIcon(task)}
                          </div>
                          <div className='flex-1'>
                            <p className='text-sm font-medium leading-none truncate max-w-[200px] md:max-w-xs'>
                              {t(`downloads.status.${task.status}`, { defaultValue: task.status })}
                            </p>
                          </div>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-2 shrink-0'>
                {isCompletedList && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size='icon'
                          variant='ghost'
                          onClick={() => setInfoModelName(task.modelName)}
                          className='hover:bg-white/10 text-white/70 hover:text-white'
                        >
                          <Info className='w-4 h-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('downloads.actions.details')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {renderTaskActions(task)}
                {!isCompletedList && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='hover:bg-white/10 text-white/70 hover:text-white w-8 h-8'
                          onClick={() => restartDownload(task.modelName)}
                        >
                          <RotateCw className='w-4 h-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('downloads.actions.restart')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant='ghost' size='icon' className='hover:bg-white/10 text-white/70 hover:text-white w-8 h-8' onClick={() => clearTask(task.modelName)}>
                        <X className='w-4 h-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('downloads.actions.cancel')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {!isCompletedList && task.status !== 'pending' && (
              <div className='mt-3'>
                <Progress
                  value={task.progress}
                  className='w-full h-2 bg-black/20 [&>div]:bg-purple-500'
                />
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <AppLayout
      sidebar={
        <Sidebar>
          <Toolbar />
        </Sidebar>
      }
    >
      <div className='flex flex-col h-full'>
        <TitleBar>
          <div className='flex items-center space-x-3'>
            <ArrowDownToLine className='w-5 h-5 text-white' />
            <span className='text-white font-medium'>{t('downloads.title')}</span>
          </div>
        </TitleBar>

        <div className='flex-1 p-6 overflow-y-auto'>
          <Tabs defaultValue='downloading' className='h-full flex flex-col'>
            <div className='flex justify-between items-center mb-4'>
              <TabsList className='grid w-full grid-cols-2 bg-transparent border border-white/10 p-1 h-auto self-start max-w-sm'>
                <TabsTrigger
                  value='downloading'
                  className='data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-md'
                >
                  <Download className='w-4 h-4 mr-2' />
                  {t('downloads.downloading')} ({downloadingTasks.length})
                </TabsTrigger>
                <TabsTrigger
                  value='completed'
                  className='data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/70 rounded-md'
                >
                  <CheckCircle className='w-4 h-4 mr-2' />
                  {t('downloads.completed')} ({completedTasks.length})
                </TabsTrigger>
              </TabsList>
              {completedTasks.length > 0 && (
                <Button
                  variant='ghost'
                  onClick={clearAllCompleted}
                  className='text-white/60 hover:text-white hover:bg-white/10'
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  {t('downloads.clearCompleted')}
                </Button>
              )}
            </div>

            <TabsContent value='downloading' className='flex-1'>
              {renderTaskList(downloadingTasks, false)}
            </TabsContent>
            <TabsContent value='completed' className='flex-1'>
              {renderTaskList(completedTasks, true)}
            </TabsContent>
          </Tabs>
        </div>
        <LocalModelInfoDialog
          modelName={infoModelName}
          open={!!infoModelName}
          onClose={() => setInfoModelName(null)}
        />
      </div>
    </AppLayout>
  );
};

export default Downloads;
