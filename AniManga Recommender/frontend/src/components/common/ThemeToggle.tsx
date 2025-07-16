// ABOUTME: Theme toggle component with system preference detection and smooth transitions
// ABOUTME: Provides light/dark mode switching with persistence and animated transitions

import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// Icon components
const SunIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
  </svg>
);

const SystemIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
  showLabel = false
}) => {
  const { theme, actualTheme, setTheme } = useTheme();

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'p-2 text-sm',
      icon: 'w-4 h-4',
      container: 'gap-1',
      dropdown: 'text-xs'
    },
    md: {
      button: 'p-2.5',
      icon: 'w-5 h-5',
      container: 'gap-2',
      dropdown: 'text-sm'
    },
    lg: {
      button: 'p-3 text-lg',
      icon: 'w-6 h-6',
      container: 'gap-3',
      dropdown: 'text-base'
    }
  };

  const config = sizeConfig[size];

  const themes = [
    { value: 'light' as const, label: 'Light', icon: SunIcon },
    { value: 'dark' as const, label: 'Dark', icon: MoonIcon },
    { value: 'system' as const, label: 'System', icon: SystemIcon }
  ];

  const currentThemeConfig = themes.find(t => t.value === theme);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Simple toggle button version */}
      <div className={`flex items-center ${config.container}`}>
        <button
          onClick={() => {
            const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
            setTheme(nextTheme);
          }}
          className={`${config.button} rounded-lg bg-gray-100 dark:bg-gray-800 
                     text-gray-600 dark:text-gray-400 
                     hover:bg-gray-200 dark:hover:bg-gray-700
                     hover:text-gray-900 dark:hover:text-gray-100
                     transition-all duration-200 ease-in-out
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     dark:focus:ring-offset-gray-900`}
          aria-label={`Switch to ${themes.find(t => t.value === (theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'))?.label} mode`}
          title={`Current: ${currentThemeConfig?.label}. Click to cycle.`}
        >
          <div className="relative">
            {/* Icon with smooth transition */}
            <div className="transform transition-transform duration-200 hover:scale-110">
              {currentThemeConfig && (
                <currentThemeConfig.icon className={config.icon} />
              )}
            </div>
            
            {/* Subtle glow effect for current theme */}
            <div className={`absolute inset-0 rounded-full transition-opacity duration-200 ${
              actualTheme === 'dark' 
                ? 'bg-blue-400 opacity-20 blur-sm' 
                : 'bg-yellow-400 opacity-20 blur-sm'
            }`} />
          </div>
        </button>

        {showLabel && (
          <span className={`font-medium text-gray-700 dark:text-gray-300 ${config.dropdown}`}>
            {currentThemeConfig?.label}
          </span>
        )}
      </div>

      {/* Theme indicator dots */}
      <div className="flex justify-center mt-2 gap-1">
        {themes.map((themeOption) => (
          <div
            key={themeOption.value}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              theme === themeOption.value
                ? 'bg-blue-500 scale-125'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

