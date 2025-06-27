import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

const GradientBackground = ({ children }: { children: React.ReactNode }) => {
  const { currentTheme } = useTheme();

  // Define different gradient colors for different themes
  const getGradientConfig = () => {
    switch (currentTheme.id) {
      case 'sunset':
        return {
          backgroundColor: '#e493d0',
          gradients: [
            'rgba(235, 105, 78, 1), rgba(235, 105, 78, 0)',
            'rgba(243, 11, 164, 1), rgba(243, 11, 164, 0)',
            'rgba(254, 234, 131, 1), rgba(254, 234, 131, 0)',
            'rgba(170, 142, 245, 1), rgba(170, 142, 245, 0)',
            'rgba(248, 192, 147, 1), rgba(248, 192, 147, 0)'
          ]
        };
      case 'ocean':
        return {
          backgroundColor: '#3b82f6',
          gradients: [
            'rgba(59, 130, 246, 1), rgba(59, 130, 246, 0)',
            'rgba(14, 165, 233, 1), rgba(14, 165, 233, 0)',
            'rgba(6, 182, 212, 1), rgba(6, 182, 212, 0)',
            'rgba(20, 184, 166, 1), rgba(20, 184, 166, 0)',
            'rgba(16, 185, 129, 1), rgba(16, 185, 129, 0)'
          ]
        };
      case 'forest':
        return {
          backgroundColor: '#22c55e',
          gradients: [
            'rgba(34, 197, 94, 1), rgba(34, 197, 94, 0)',
            'rgba(16, 185, 129, 1), rgba(16, 185, 129, 0)',
            'rgba(5, 150, 105, 1), rgba(5, 150, 105, 0)',
            'rgba(132, 204, 22, 1), rgba(132, 204, 22, 0)',
            'rgba(101, 163, 13, 1), rgba(101, 163, 13, 0)'
          ]
        };
      case 'midnight':
        return {
          backgroundColor: '#4338ca',
          gradients: [
            'rgba(67, 56, 202, 1), rgba(67, 56, 202, 0)',
            'rgba(99, 102, 241, 1), rgba(99, 102, 241, 0)',
            'rgba(139, 92, 246, 1), rgba(139, 92, 246, 0)',
            'rgba(168, 85, 247, 1), rgba(168, 85, 247, 0)',
            'rgba(147, 51, 234, 1), rgba(147, 51, 234, 0)'
          ]
        };
      case 'rose':
        return {
          backgroundColor: '#ec4899',
          gradients: [
            'rgba(236, 72, 153, 1), rgba(236, 72, 153, 0)',
            'rgba(244, 63, 94, 1), rgba(244, 63, 94, 0)',
            'rgba(251, 113, 133, 1), rgba(251, 113, 133, 0)',
            'rgba(252, 165, 165, 1), rgba(252, 165, 165, 0)',
            'rgba(254, 202, 202, 1), rgba(254, 202, 202, 0)'
          ]
        };
      case 'starlight':
        return {
          backgroundColor: '#1e293b',
          gradients: [
            'rgba(147, 51, 234, 1), rgba(147, 51, 234, 0)',
            'rgba(126, 34, 206, 1), rgba(126, 34, 206, 0)',
            'rgba(88, 28, 135, 1), rgba(88, 28, 135, 0)',
            'rgba(71, 85, 105, 1), rgba(71, 85, 105, 0)',
            'rgba(30, 41, 59, 1), rgba(30, 41, 59, 0)'
          ]
        };
      default:
        return {
          backgroundColor: '#e493d0',
          gradients: [
            'rgba(235, 105, 78, 1), rgba(235, 105, 78, 0)',
            'rgba(243, 11, 164, 1), rgba(243, 11, 164, 0)',
            'rgba(254, 234, 131, 1), rgba(254, 234, 131, 0)',
            'rgba(170, 142, 245, 1), rgba(170, 142, 245, 0)',
            'rgba(248, 192, 147, 1), rgba(248, 192, 147, 0)'
          ]
        };
    }
  };

  const config = getGradientConfig();

  return (
    <div className="h-full w-full relative overflow-hidden" style={{ borderRadius: 'inherit' }}>
      <div 
        className="absolute inset-0"
        style={{
          backgroundColor: config.backgroundColor,
          backgroundImage: config.gradients.map(gradient => 
            `radial-gradient(closest-side, ${gradient})`
          ).join(', '),
          backgroundSize: `
            130vmax 130vmax,
            80vmax 80vmax,
            90vmax 90vmax,
            110vmax 110vmax,
            90vmax 90vmax
          `,
          backgroundPosition: `
            -80vmax -80vmax,
            60vmax -30vmax,
            10vmax 10vmax,
            -30vmax -10vmax,
            50vmax 50vmax
          `,
          backgroundRepeat: 'no-repeat',
          animation: 'gradientMovement 10s linear infinite',
          borderRadius: 'inherit'
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 'inherit'
        }}
      />
      <div className="relative z-10 h-full w-full" style={{ borderRadius: 'inherit' }}>
        {children}
      </div>
    </div>
  );
};

export default GradientBackground;
