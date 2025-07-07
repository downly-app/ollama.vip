import {
  Activity,
  AlertTriangle,
  BarChart,
  CheckCircle,
  Cpu,
  ExternalLink,
  FileText,
  HardDrive,
  MemoryStick,
  Monitor,
  Thermometer,
  XCircle,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import SystemApi from '@/services/systemApi';
import { useSystemResourceStore } from '@/stores/systemResourceStore';

import { activityLogger } from './ActivityLogAndActions';

const SystemResourceMonitoring = () => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();

  // Use shared system resource store
  const {
    systemInfo,
    resources,
    isLoading,
    error,
    fetchSystemResources,
    startAutoRefresh,
    stopAutoRefresh,
  } = useSystemResourceStore();

  const [recentLogs, setRecentLogs] = useState<
    Array<{
      timestamp: string;
      level: 'info' | 'warning' | 'error';
      message: string;
    }>
  >([]);

  // Handle activity logging when resources update
  useEffect(() => {
    if (systemInfo && resources.length > 0) {
      // Log successful system resource retrieval activity
      activityLogger.addActivity(
        'info',
        t('dashboard.systemResources.activities.resourcesUpdated')
      );

      // Log high usage warnings
      resources.forEach(resource => {
        if (resource.usage > 80) {
          activityLogger.addActivity(
            'warning',
            `${resource.name} usage too high: ${resource.usage.toFixed(1)}%`
          );
        }
      });

      // Generate system logs
      generateSystemLogs(systemInfo);
    }
  }, [systemInfo, resources, t]);

  // Handle error logging
  useEffect(() => {
    if (error) {
      activityLogger.addActivity('error', error);
    }
  }, [error]);

  // Add icon mapping for resources from store
  const getResourceIcon = (resourceName: string) => {
    switch (resourceName.toLowerCase()) {
      case 'cpu':
        return Cpu;
      case 'memory':
        return MemoryStick;
      case 'disk':
        return HardDrive;
      case 'gpu':
        return Monitor;
      default:
        return Activity;
    }
  };

  // Generate combined chart data
  const generateCombinedChartData = () => {
    if (resources.length === 0) return [];

    const timePoints = resources[0]?.data?.map(point => point.time) || [];

    return timePoints.map((time, index) => {
      const dataPoint: any = { time };

      resources.forEach(resource => {
        if (resource.data && resource.data[index]) {
          dataPoint[resource.name] = resource.data[index].value;
        }
      });

      return dataPoint;
    });
  };

  // Generate system logs
  const generateSystemLogs = (info: any) => {
    const logs = [
      {
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        level: 'info' as const,
        message: t('dashboard.systemResources.refreshSuccess', {
          cpu: info.cpu.usage.toFixed(1),
          memory: info.memory.usage_percent.toFixed(1),
        }),
      },
      {
        timestamp: new Date(Date.now() - 30000).toLocaleTimeString('zh-CN'),
        level: info.cpu.usage > 80 ? ('warning' as const) : ('info' as const),
        message: `CPU usage: ${info.cpu.usage.toFixed(1)}% (${info.cpu.model})`,
      },
      {
        timestamp: new Date(Date.now() - 60000).toLocaleTimeString('zh-CN'),
        level: info.memory.usage_percent > 80 ? ('warning' as const) : ('info' as const),
        message: `Memory usage: ${info.memory.usage_percent.toFixed(1)}% (${SystemApi.formatMemoryFromGB(info.memory.used_gb)} / ${SystemApi.formatMemoryFromGB(info.memory.total_gb)})`,
      },
    ];

    // Add GPU logs
    if (info.gpus.length > 0) {
      const gpu = info.gpus[0];
      logs.push({
        timestamp: new Date(Date.now() - 90000).toLocaleTimeString('zh-CN'),
        level: gpu.core_usage_percent > 80 ? ('warning' as const) : ('info' as const),
        message: `GPU usage: ${gpu.core_usage_percent.toFixed(1)}% (${gpu.name})`,
      });
    }

    // Add disk logs
    if (info.disks.length > 0) {
      const disk = info.disks[0];
      logs.push({
        timestamp: new Date(Date.now() - 120000).toLocaleTimeString('zh-CN'),
        level: disk.usage_percent > 90 ? ('warning' as const) : ('info' as const),
        message: `Disk usage: ${disk.usage_percent.toFixed(1)}% (${disk.mount_point})`,
      });
    }

    setRecentLogs(logs);
  };

  useEffect(() => {
    // Start auto refresh when component mounts
    startAutoRefresh();

    // Stop auto refresh when component unmounts
    return () => {
      stopAutoRefresh();
    };
  }, [startAutoRefresh, stopAutoRefresh]);

  const getUsageColor = (usage: number) => {
    if (usage >= 80) return 'text-red-400';
    if (usage >= 60) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressColor = (usage: number) => {
    if (usage >= 80) return 'bg-gradient-to-r from-red-500 to-red-600';
    if (usage >= 60) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    return 'bg-gradient-to-r from-green-500 to-green-600';
  };

  const formatValue = (resource: any) => {
    if (resource.name.toLowerCase().includes('gpu')) {
      return `${resource.usage.toFixed(0)}%`;
    }
    return `${resource.usage.toFixed(1)}%`;
  };

  if (error) {
    return (
      <Card className='bg-white/10 backdrop-blur-sm border-white/20'>
        <CardHeader>
          <CardTitle
            className={`text-xl font-bold bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-text text-transparent flex items-center`}
          >
            <Activity className='mr-2' size={20} />
            {t('dashboard.systemResources.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center p-8 text-red-400'>
            <XCircle size={48} className='mr-4' />
            <div>
              <p className='text-lg font-medium'>Load Failed</p>
              <p className='text-sm text-white/60'>{error}</p>
              <Button
                onClick={fetchSystemResources}
                className='mt-4 bg-white/20 hover:bg-white/30'
                size='sm'
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='bg-white/10 backdrop-blur-sm border-white/20'>
      <CardHeader className='pb-4'>
        <CardTitle
          className={`text-xl font-bold bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-text text-transparent flex items-center justify-between`}
        >
          <div className='flex items-center'>
            <Activity className='mr-2' size={20} />
            {t('dashboard.systemResources.title')}
          </div>
          <Button
            size='sm'
            variant='ghost'
            onClick={fetchSystemResources}
            disabled={isLoading}
            className='text-white/70 hover:text-white hover:bg-white/10'
          >
            <Activity size={14} className={`mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {isLoading ? (
          <div className='flex items-center justify-center p-8'>
            <Activity size={32} className='animate-spin text-white/70 mr-4' />
            <span className='text-white/70'>Loading system resource information...</span>
          </div>
        ) : (
          <>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {resources.map((resource, index) => {
                const ResourceIcon = getResourceIcon(resource.name);
                return (
                  <div key={index} className='space-y-4 p-4 bg-black/20 rounded-lg'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <ResourceIcon size={20} className='text-white/70' />
                        <span className='text-white font-medium'>
                          {t(
                            `dashboard.systemResources.resources.${resource.name.toLowerCase()}`
                          ) || resource.name}
                        </span>
                        {resource.temperature && (
                          <div className='flex items-center text-white/60 text-xs'>
                            <Thermometer size={12} className='mr-1' />
                            {resource.temperature.toFixed(0)}°C
                          </div>
                        )}
                      </div>
                      <span className={`text-2xl font-bold ${getUsageColor(resource.usage)}`}>
                        {formatValue(resource)}
                      </span>
                    </div>

                    {/* Custom progress bar */}
                    <div className='w-full bg-white/20 rounded-full h-3'>
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(resource.usage)}`}
                        style={{
                          width: `${Math.min(100, Math.max(0, resource.usage))}%`,
                        }}
                      ></div>
                    </div>

                    <div className='flex justify-between items-center text-sm'>
                      <p className='text-white/60'>{resource.details}</p>
                    </div>

                    {/* Small trend chart */}
                    <div className='h-20 bg-black/30 rounded p-2'>
                      <ResponsiveContainer width='100%' height='100%'>
                        <LineChart data={resource.data}>
                          <Line
                            type='monotone'
                            dataKey='value'
                            stroke={resource.color}
                            strokeWidth={2}
                            dot={false}
                            strokeDasharray={resource.usage > 80 ? '5,5' : '0'}
                          />
                          <YAxis domain={[0, 100]} hide />
                          <XAxis dataKey='time' hide />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* System overview chart */}
            <div className='mt-6 pt-6 border-t border-white/10'>
              <h4 className='text-white font-medium mb-4 flex items-center'>
                <BarChart size={16} className='mr-2' />
                {t('dashboard.systemResources.overview')}
              </h4>
              <div className='h-32 bg-black/20 rounded p-4'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={generateCombinedChartData()}>
                    {resources.map((resource, index) => (
                      <Line
                        key={`${resource.name}-${index}`}
                        type='monotone'
                        dataKey={resource.name}
                        stroke={resource.color}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                      />
                    ))}
                    <XAxis
                      dataKey='time'
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#ffffff60' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#ffffff60' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart legend */}
              <div className='mt-2 flex flex-wrap gap-2'>
                {resources.map((resource, index) => (
                  <div key={index} className='flex items-center space-x-2'>
                    <div
                      className='w-3 h-3 rounded-full'
                      style={{ backgroundColor: resource.color }}
                    ></div>
                    <span className='text-white/70 text-xs'>
                      {resource.name}: {formatValue(resource)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent logs */}
            <div className='mt-6 pt-6 border-t border-white/10'>
              <div className='flex items-center justify-between mb-4'>
                <h4 className='text-white font-medium flex items-center'>
                  <FileText size={16} className='mr-2' />
                  {t('dashboard.systemResources.recentLogs.title')} ({recentLogs.length})
                </h4>
                <Button
                  size='sm'
                  variant='ghost'
                  className='text-white/70 hover:text-white hover:bg-white/10'
                  onClick={() => window.open('/logs', '_blank')}
                >
                  <ExternalLink size={14} className='mr-1' />
                  {t('dashboard.systemResources.recentLogs.viewAll')}
                </Button>
              </div>
              <div className='space-y-2'>
                {recentLogs.slice(0, 10).map((log, index) => (
                  <div
                    key={index}
                    className='bg-black/20 rounded p-3 text-sm hover:bg-black/30 transition-colors'
                  >
                    <div className='flex items-center justify-between mb-1'>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          log.level === 'error'
                            ? 'bg-red-500/20 text-red-300'
                            : log.level === 'warning'
                              ? 'bg-yellow-500/20 text-yellow-300'
                              : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className='text-white/50 text-xs font-mono'>{log.timestamp}</span>
                    </div>
                    <p className='text-white/80 text-xs leading-relaxed'>{log.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemResourceMonitoring;
