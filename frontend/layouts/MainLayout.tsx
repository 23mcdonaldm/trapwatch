import React from 'react';
import { LiveChatBanner } from '../components/LiveChatBanner';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="font-sans text-slate-900 dark:text-slate-100 antialiased min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {children}
      <LiveChatBanner />
    </div>
  );
};

