import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  gradient: string;
  gradientBackground: string;
  scrollbar: string;
  scrollbarHover: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

const themes: Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight Blue',
    colors: {
      primary: 'from-indigo-500 to-purple-600',
      secondary: 'from-indigo-400 to-purple-400',
      background: 'bg-white/10',
      text: 'text-white',
      textSecondary: 'text-white/70',
      border: 'border-white/20',
      hover: 'hover:bg-white/15',
      gradient: 'linear-gradient(45deg, hsl(240, 80%, 40%), hsl(260, 80%, 40%), hsl(280, 80%, 40%), hsl(220, 80%, 40%), hsl(200, 80%, 40%), hsl(180, 80%, 40%), hsl(160, 80%, 40%), hsl(140, 80%, 40%), hsl(240, 80%, 40%))',
      gradientBackground: '400% 400%',
      scrollbar: 'bg-white/20',
      scrollbarHover: 'hover:bg-white/30'
    }
  },

  {
    id: 'starlight',
    name: 'Starlight Purple',
    colors: {
      primary: 'from-purple-600 to-purple-500',
      secondary: 'from-purple-400 to-slate-400',
      background: 'bg-white/10',
      text: 'text-white',
      textSecondary: 'text-white/70',
      border: 'border-white/20',
      hover: 'hover:bg-white/15',
      gradient: 'linear-gradient(45deg, hsl(270, 80%, 40%), hsl(250, 80%, 40%), hsl(230, 80%, 40%), hsl(210, 80%, 40%), hsl(220, 60%, 30%), hsl(240, 60%, 30%), hsl(260, 80%, 40%), hsl(280, 80%, 40%), hsl(270, 80%, 40%))',
      gradientBackground: '400% 400%',
      scrollbar: 'bg-white/20',
      scrollbarHover: 'hover:bg-white/30'
    }
  }
];

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string, isTemporary?: boolean) => void;
  themes: Theme[];
  originalTheme?: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes.find(t => t.id === 'starlight') || themes[0]); // Default to starlight theme
  const [originalTheme, setOriginalTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme) {
      const theme = themes.find(t => t.id === savedTheme);
      if (theme) {
        setCurrentTheme(theme);
      }
    } else {
      // If no saved theme, set default to starlight and save
      const starlightTheme = themes.find(t => t.id === 'starlight');
      if (starlightTheme) {
        setCurrentTheme(starlightTheme);
        localStorage.setItem('selectedTheme', 'starlight');
      }
    }
  }, []);

  const setTheme = (themeId: string, isTemporary: boolean = false) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      // If this is a temporary theme change and we don't have an original theme stored yet,
      // save the current theme as the original
      if (isTemporary && !originalTheme) {
        setOriginalTheme(currentTheme);
      }

      // If this is a permanent change, clear the original theme
      if (!isTemporary) {
        setOriginalTheme(undefined);
        localStorage.setItem('selectedTheme', themeId);
      }

      setCurrentTheme(theme);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes, originalTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { useTheme };
