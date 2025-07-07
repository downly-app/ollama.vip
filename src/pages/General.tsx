import { Home } from 'lucide-react';

import React from 'react';
import { useTranslation } from 'react-i18next';

import Toolbar from '@/components/Toolbar';
import ActivityLogAndActions from '@/components/dashboard/ActivityLogAndActions';
import ModelOverview from '@/components/dashboard/ModelOverview';
import OllamaServiceStatus from '@/components/dashboard/OllamaServiceStatus';
import SystemResourceMonitoring from '@/components/dashboard/SystemResourceMonitoring';
import { AppLayout, Sidebar, TitleBar } from '@/components/layouts';
import { useTheme } from '@/contexts/ThemeContext';

const General = () => {
  const { currentTheme } = useTheme();
  const { t } = useTranslation();

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
          <h1
            className={`text-xl font-bold bg-gradient-to-r ${currentTheme.colors.secondary} bg-clip-text text-transparent`}
          >
            {t('general.title')}
          </h1>
        </TitleBar>

        <div className='flex-1 overflow-y-auto p-6 custom-scrollbar'>
          <div className='w-full'>
            {/* Main content area - left and right layout */}
            <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
              {/* Left column - takes 2 columns */}
              <div className='xl:col-span-2 space-y-6'>
                {/* Ollama service status */}
                <OllamaServiceStatus />

                {/* System resource monitoring */}
                <SystemResourceMonitoring />
              </div>

              {/* Right column - takes 1 column */}
              <div className='xl:col-span-1 space-y-6'>
                {/* Model overview */}
                <ModelOverview />

                {/* Activity log and quick actions */}
                <ActivityLogAndActions />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default General;
