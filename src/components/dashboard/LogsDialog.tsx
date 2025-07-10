import { Activity, Clock, FileText, RefreshCw, Trash2 } from 'lucide-react';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogItem {
  id?: string;
  timestamp: string;
  time?: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  icon?: React.ElementType;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface LogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  logs: LogItem[];
  onRefresh?: () => void;
  onClear?: () => void;
  isLoading?: boolean;
  icon?: React.ElementType;
}

const LogsDialog: React.FC<LogsDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  logs,
  onRefresh,
  onClear,
  isLoading = false,
  icon: Icon = FileText,
}) => {
  const { t } = useTranslation();

  const getLogItemColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  const getLogBadgeStyle = (level: string) => {
    switch (level) {
      case 'success':
        return 'bg-green-600 text-white';
      case 'warning':
        return 'bg-yellow-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const getLogBackgroundStyle = (level: string) => {
    switch (level) {
      case 'success':
        return 'bg-green-500/20 text-green-300';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'error':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-blue-500/20 text-blue-300';
    }
  };

  const renderLogItem = (log: LogItem, index: number) => {
    const logLevel = log.level || log.type || 'info';
    const LogIcon = log.icon;
    
    return (
      <div
        key={log.id || index}
        className='flex items-start space-x-2 p-3 bg-black/20 rounded-lg hover:bg-black/30 transition-colors'
      >
        {LogIcon && (
          <LogIcon
            size={14}
            className={`mt-0.5 flex-shrink-0 ${getLogItemColor(logLevel)}`}
          />
        )}
        <div className='flex-1 min-w-0'>
          <p className='text-white/90 text-sm break-words'>{log.message}</p>
          <div className='flex items-center justify-between mt-2'>
            <span className='text-white/50 text-xs font-mono'>
              {log.time ? log.time.toLocaleString() : log.timestamp}
            </span>
            {/* Activity Log style badge */}
            {log.type && (
              <Badge
                className={`text-xs ${getLogBadgeStyle(logLevel)}`}
              >
                {t(`dashboard.activityLog.status.${logLevel}`)}
              </Badge>
            )}
            {/* Recent Logs style badge */}
            {!log.type && (
              <span
                className={`text-xs px-2 py-1 rounded font-medium ${getLogBackgroundStyle(logLevel)}`}
              >
                {logLevel.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[80vh] bg-black/20 backdrop-blur-xl border-white/10 text-white shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='text-xl font-semibold flex items-center'>
            <Icon className='mr-2' size={20} />
            {title} ({logs.length})
          </DialogTitle>
        </DialogHeader>
        <div className='flex flex-col h-[60vh]'>
          <div className='flex items-center justify-between mb-4'>
            <p className='text-white/70 text-sm'>
              {description}
            </p>
            <div className='flex items-center space-x-2'>
              {onRefresh && (
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={onRefresh}
                  disabled={isLoading}
                  className='text-white/70 hover:text-white hover:bg-white/10'
                >
                  <RefreshCw size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  {t('common.refresh')}
                </Button>
              )}
              {onClear && (
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={onClear}
                  className='text-white/70 hover:text-white hover:bg-white/10'
                >
                  <Trash2 size={14} className='mr-1' />
                  {t('common.clear')}
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className='flex-1'>
            <div className='space-y-3 pr-4'>
              {logs.length > 0 ? (
                logs.map((log, index) => renderLogItem(log, index))
              ) : (
                <div className='flex flex-col items-center justify-center h-32 text-white/50'>
                  <Icon size={48} className='mb-4 opacity-50' />
                  <p className='text-center'>
                    {t('dashboard.activityLog.noActivities')}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LogsDialog; 