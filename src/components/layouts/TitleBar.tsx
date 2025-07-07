import React from 'react';

import { invoke } from '@tauri-apps/api/tauri';

import WindowControls from '@/components/WindowControls';
import '@/styles/titlebar.css';

interface TitleBarProps {
  children?: React.ReactNode; // Left side custom content
  className?: string;
}

const TitleBar = ({ children, className = '' }: TitleBarProps) => {
  const handleDragStart = async (e: React.MouseEvent) => {
    // Ensure the click is not on the window control buttons area
    const target = e.target as HTMLElement;
    if (target.closest('.no-drag')) {
      return;
    }

    try {
      await invoke('start_dragging');
    } catch (error) {
      // Failed to start drag
    }
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    // Ensure the double-click is not on the window control buttons area
    const target = e.target as HTMLElement;
    if (target.closest('.no-drag')) {
      return;
    }

    try {
      await invoke('maximize_window');
    } catch (error) {
      // Failed to toggle maximize
    }
  };

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-black/5 backdrop-blur-sm border-b border-white/10 drag-region relative z-50 ${className}`}
      onMouseDown={handleDragStart}
      onDoubleClick={handleDoubleClick}
    >
      {/* Left side custom content area - draggable */}
      <div className='flex items-center space-x-4 drag-region flex-1'>{children}</div>

      {/* Right side window control buttons - not draggable */}
      <div className='flex items-center no-drag'>
        <WindowControls />
      </div>
    </div>
  );
};

export default TitleBar;
