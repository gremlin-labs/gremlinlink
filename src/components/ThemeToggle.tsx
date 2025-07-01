'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark' | 'system';

/**
 * Native theme toggle component using Tailwind's dark mode
 * Supports light, dark, and system preference modes
 */
export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    
    // Get initial theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      setTheme('system');
      applyTheme('system');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const cycleTheme = () => {
    let newTheme: Theme;
    
    if (theme === 'light') {
      newTheme = 'dark';
    } else if (theme === 'dark') {
      newTheme = 'system';
    } else {
      newTheme = 'light';
    }
    
    setTheme(newTheme);
    applyTheme(newTheme);
    
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', newTheme);
    }
  };

  const getIcon = () => {
    if (theme === 'light') {
      return <Sun className="h-4 w-4" />;
    } else if (theme === 'dark') {
      return <Moon className="h-4 w-4" />;
    } else {
      return <Monitor className="h-4 w-4" />;
    }
  };

  const getTooltip = () => {
    if (theme === 'light') {
      return 'Switch to dark mode';
    } else if (theme === 'dark') {
      return 'Switch to system preference';
    } else {
      return 'Switch to light mode';
    }
  };

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-md border bg-muted animate-pulse" />
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={cycleTheme}
      className="relative h-9 w-9 transition-colors hover:bg-accent hover:text-accent-foreground"
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      {getIcon()}
      
      {/* Theme indicator */}
      <span className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-primary opacity-75" />
    </Button>
  );
}

/**
 * Compact theme toggle for mobile navigation
 */
export function MobileThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else if (newTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', newTheme);
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-10 rounded-md bg-muted animate-pulse" />
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <span className="text-sm font-medium text-foreground">
        Theme
      </span>
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleThemeChange('light')}
          className={`h-8 w-8 transition-colors ${
            theme === 'light'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleThemeChange('dark')}
          className={`h-8 w-8 transition-colors ${
            theme === 'dark'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleThemeChange('system')}
          className={`h-8 w-8 transition-colors ${
            theme === 'system'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label="System preference"
        >
          <Monitor className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}