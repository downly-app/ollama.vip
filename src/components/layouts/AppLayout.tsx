import React, { ReactNode } from 'react';
import GradientBackground from '@/components/GradientBackground';

interface AppLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

const AppLayout = ({ sidebar, children }: AppLayoutProps) => {
  return (
    <div className="app-container">
      <GradientBackground>
        <div className="flex h-full w-full">
          {/* Left sidebar */}
          {sidebar && (
            <div className="flex-shrink-0 relative z-50 h-full">
              {sidebar}
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            {children}
          </div>
        </div>
      </GradientBackground>
    </div>
  );
};

export default AppLayout; 