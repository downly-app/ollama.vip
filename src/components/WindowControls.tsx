import { Maximize, Minimize2, X } from 'lucide-react';

import React from 'react';
import { useTranslation } from 'react-i18next';

import { invoke } from '@tauri-apps/api/tauri';

import { Button } from '@/components/ui/button';

const WindowControls = () => {
  const { t } = useTranslation();
  const handleMinimize = async () => {
    try {
      await invoke('minimize_window');
    } catch (error) {
      // Failed to minimize window
    }
  };

  const handleMaximize = async () => {
    try {
      await invoke('maximize_window');
    } catch (error) {
      // Failed to maximize window
    }
  };

  const handleClose = async () => {
    try {
      await invoke('close_window');
    } catch (error) {
      // Failed to close window
    }
  };

  return (
    <div className='flex items-center space-x-1'>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200'
        onClick={handleMinimize}
        aria-label={t('window.minimize')}
      >
        <Minimize2 size={14} />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200'
        onClick={handleMaximize}
        aria-label={t('window.maximize')}
      >
        <Maximize size={14} />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        className='h-8 w-8 text-white/70 hover:text-white hover:bg-red-500/20 rounded-lg transition-all duration-200'
        onClick={handleClose}
        aria-label={t('window.close')}
      >
        <X size={14} />
      </Button>
    </div>
  );
};

export default WindowControls;
