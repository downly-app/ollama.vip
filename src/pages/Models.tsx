import React from 'react';
import { AppLayout, Sidebar, TitleBar } from '@/components/layouts';
import Toolbar from "@/components/Toolbar";
import ModelManager from "@/components/ModelManager";
import { useTranslation } from 'react-i18next';
import { Database } from 'lucide-react';

const Models = () => {
  const { t } = useTranslation();

  return (
    <AppLayout
      sidebar={
        <Sidebar>
          <Toolbar />
        </Sidebar>
      }
    >
      <div className="flex flex-col h-full">
        <TitleBar>
          <div className="flex items-center space-x-3">
            <Database className="w-5 h-5 text-white" />
            <span className="text-white font-medium">{t('pages.models')}</span>
          </div>
        </TitleBar>

        <div className="flex-1 p-6 overflow-y-auto">
          <ModelManager />
        </div>
      </div>
    </AppLayout>
  );
};

export default Models;
