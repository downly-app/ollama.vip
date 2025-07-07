import {
  Database,
  Download,
  HardDrive,
  Home,
  MessageCircle,
  Settings,
  UserCircle,
} from 'lucide-react';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import AISettings from '@/components/AISettings';
import ProfileCard from '@/components/ProfileCard';
import { useTheme } from '@/contexts/ThemeContext';

const Toolbar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Determine active view based on current path
  const getCurrentView = () => {
    if (location.pathname === '/') return 'general';
    if (location.pathname === '/chat') return 'chat';
    if (location.pathname === '/models') return 'models';
    if (location.pathname === '/local-models') return 'local-models';
    if (location.pathname === '/downloads') return 'downloads';
    if (location.pathname.startsWith('/model/')) return 'models';
    return 'general';
  };

  const currentView = getCurrentView();

  const toolbarItems = [
    { icon: Home, label: t('navigation.general'), view: 'general', path: '/' },
    { icon: MessageCircle, label: t('navigation.chat'), view: 'chat', path: '/chat' },
    {
      icon: HardDrive,
      label: t('navigation.localModels'),
      view: 'local-models',
      path: '/local-models',
    },
    { icon: Database, label: t('navigation.onlineModels'), view: 'models', path: '/models' },
    { icon: Download, label: t('navigation.downloads'), view: 'downloads', path: '/downloads' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleSettingsSave = (settings: any) => {
    localStorage.setItem('ai-config', JSON.stringify(settings));
    // AI settings saved
  };

  return (
    <div className='flex flex-col h-full'>
      {/* Avatar area */}
      <div className='flex items-center justify-center py-4 flex-shrink-0'>
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${currentTheme.colors.primary} flex items-center justify-center shadow-lg cursor-pointer transition-all duration-200 hover:scale-105`}
          onClick={handleProfileClick}
        >
          <UserCircle size={20} className='text-white' />
        </div>
      </div>

      {/* Navigation buttons */}
      <div className='flex flex-col items-center space-y-3 px-2 flex-shrink-0'>
        {toolbarItems.map((item, index) => (
          <div
            key={index}
            className={`
              relative w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer
              transition-all duration-200 group
              ${
                currentView === item.view
                  ? `bg-gradient-to-br ${currentTheme.colors.primary} shadow-lg`
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }
            `}
            onClick={() => handleNavigation(item.path)}
          >
            <item.icon size={20} className={currentView === item.view ? 'text-white' : ''} />

            {/* Hover tooltip */}
            <div
              className={`absolute left-14 bg-gradient-to-r ${currentTheme.colors.primary}/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[100] pointer-events-none shadow-lg border border-white/20`}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom flexible space - ensures settings button stays at bottom */}
      <div className='flex-1'></div>

      {/* Separator line */}
      <div className='flex items-center justify-center mb-3 flex-shrink-0'>
        <div className='w-8 h-px bg-white/20'></div>
      </div>

      {/* Settings button - fixed at bottom */}
      <div className='flex items-center justify-center pb-4 flex-shrink-0'>
        <div
          className='relative w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 group hover:bg-white/10 text-white/70 hover:text-white'
          onClick={handleSettingsClick}
        >
          <Settings size={20} />
          <div
            className={`absolute left-14 bg-gradient-to-r ${currentTheme.colors.primary}/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[100] pointer-events-none shadow-lg border border-white/20`}
          >
            {t('common.settings')}
          </div>
        </div>
      </div>

      {/* Settings dialog */}
      <AISettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSettingsSave}
        currentSettings={{
          provider: 'openai',
          apiKey: '',
          model: 'gpt-4o',
          temperature: 0.7,
        }}
      />

      {/* Profile card */}
      <ProfileCard open={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
};

export default Toolbar;
