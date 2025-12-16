import { useEffect } from 'react';
import { storageService } from '../services/storage';

export const useTheme = () => {
  useEffect(() => {
    // Initialize Theme
    const theme = storageService.getTheme();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const currentTheme = storageService.getTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    storageService.setTheme(newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { toggleTheme };
};

