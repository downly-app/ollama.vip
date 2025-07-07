import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  RefreshCw,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';

interface Activity {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  time: Date;
  icon: React.ElementType;
}

// Activity log manager class
class ActivityLogger {
  private static instance: ActivityLogger;
  private activities: Activity[] = [];
  private listeners: ((activities: Activity[]) => void)[] = [];

  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  private constructor() {
    this.loadActivities();
  }

  private loadActivities() {
    try {
      const stored = localStorage.getItem('ollama_activity_log');
      if (stored) {
        const activities = JSON.parse(stored);
        this.activities = activities.map((activity: any) => ({
          ...activity,
          time: new Date(activity.time),
          icon: this.getIconByType(activity.type),
        }));
      }
    } catch (error) {
      // Failed to load activity log
    }
  }

  private saveActivities() {
    try {
      const toSave = this.activities.map(activity => ({
        ...activity,
        icon: undefined, // Don't save icon function
      }));
      localStorage.setItem('ollama_activity_log', JSON.stringify(toSave));
    } catch (error) {
      // Failed to save activity log
    }
  }

  private getIconByType(type: string): React.ElementType {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return XCircle;
      default:
        return Info;
    }
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  }

  addActivity(type: Activity['type'], message: string) {
    const activity: Activity = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: this.formatTime(new Date()),
      time: new Date(),
      icon: this.getIconByType(type),
    };

    this.activities.unshift(activity);

    // Keep the latest 50 records
    if (this.activities.length > 50) {
      this.activities = this.activities.slice(0, 50);
    }

    this.saveActivities();
    this.notifyListeners();
  }

  getActivities(): Activity[] {
    // Update timestamps
    return this.activities.map(activity => ({
      ...activity,
      timestamp: this.formatTime(activity.time),
    }));
  }

  clearActivities() {
    this.activities = [];
    this.saveActivities();
    this.notifyListeners();
  }

  subscribe(listener: (activities: Activity[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getActivities()));
  }
}

const ActivityLogAndActions = () => {
  const { currentTheme } = useTheme();
  const { t } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const activityLogger = ActivityLogger.getInstance();

  useEffect(() => {
    // Initialize activity log
    setActivities(activityLogger.getActivities());

    // If no activity records, add some examples
    if (activityLogger.getActivities().length === 0) {
      activityLogger.addActivity('info', 'Welcome to Ollama Pro');
      activityLogger.addActivity('success', 'Service started');
    }

    // Subscribe to activity log updates
    const unsubscribe = activityLogger.subscribe(setActivities);

    // Periodically update timestamps
    const interval = setInterval(() => {
      setActivities(activityLogger.getActivities());
    }, 60000); // Update every minute

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleClearActivities = () => {
    if (confirm(t('dashboard.activityLog.confirmClear'))) {
      activityLogger.clearActivities();
    }
  };

  const handleRefreshActivities = () => {
    setActivities(activityLogger.getActivities());
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
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

  const getActivityBadgeVariant = (type: Activity['type']) => {
    switch (type) {
      case 'success':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card className='bg-white/10 backdrop-blur-sm border-white/20'>
      <CardHeader className='pb-4'>
        <CardTitle
          className={`text-xl font-bold bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-text text-transparent flex items-center justify-between`}
        >
          <div className='flex items-center'>
            <Zap className='mr-2' size={20} />
            {t('dashboard.activityLog.title')}
          </div>
          <div className='flex items-center space-x-1'>
            <Button
              size='sm'
              variant='ghost'
              onClick={handleRefreshActivities}
              className='text-white/70 hover:text-white hover:bg-white/10'
            >
              <RefreshCw size={14} />
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={handleClearActivities}
              className='text-white/70 hover:text-white hover:bg-white/10'
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Recent Activities */}
        <div className='space-y-2'>
          <h4 className='text-white font-medium flex items-center'>
            <Clock size={16} className='mr-2' />
            {t('dashboard.activityLog.recentActivity')} ({activities.length})
          </h4>
          <div className='space-y-2'>
            {activities.length > 0 ? (
              activities.slice(0, 10).map(activity => (
                <div
                  key={activity.id}
                  className='flex items-start space-x-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors'
                >
                  <activity.icon
                    size={14}
                    className={`mt-0.5 flex-shrink-0 ${getActivityColor(activity.type)}`}
                  />
                  <div className='flex-1 min-w-0'>
                    <p className='text-white/90 text-xs break-words'>{activity.message}</p>
                    <div className='flex items-center justify-between mt-1'>
                      <span className='text-white/50 text-xs'>{activity.timestamp}</span>
                      <Badge
                        variant={getActivityBadgeVariant(activity.type)}
                        className={`text-xs ${
                          activity.type === 'success'
                            ? 'bg-green-600 text-white'
                            : activity.type === 'warning'
                              ? 'bg-yellow-600 text-white'
                              : activity.type === 'error'
                                ? 'bg-red-600 text-white'
                                : 'bg-blue-600 text-white'
                        }`}
                      >
                        {t(`dashboard.activityLog.status.${activity.type}`)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className='text-white/50 text-sm text-center py-4'>
                {t('dashboard.activityLog.noActivities')}
              </p>
            )}
          </div>
        </div>

        {/* View More */}
        {activities.length > 10 && (
          <Button
            variant='ghost'
            size='sm'
            className='w-full text-white/70 border border-white/20 hover:bg-white/10 hover:text-white bg-transparent'
            onClick={() => {
              /* Show all activities */
            }}
          >
            {t('dashboard.activityLog.viewAllActivities')} ({activities.length - 10}{' '}
            {t('dashboard.activityLog.more')})
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Export activity logger instance for use by other components
export const activityLogger = ActivityLogger.getInstance();
export default ActivityLogAndActions;
