import React, { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
  width?: string;
  className?: string;
}

const Sidebar = ({ 
  children, 
  width = 'w-16', 
  className = '' 
}: SidebarProps) => {
  return (
    <div className={`${width} min-w-16 h-full min-h-screen bg-black/20 backdrop-blur-sm border-r border-white/10 flex flex-col relative z-50 ${className}`}>
      {children}
    </div>
  );
};

export default Sidebar; 