import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { OshaFloatingBubble } from '@/components/osha/OshaFloatingBubble';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main id="main-content" className="flex-1 p-3 sm:p-4 md:p-6 overflow-hidden bg-background flex flex-col safe-bottom safe-x">
            {children}
          </main>
        </div>
      </div>
      <OshaFloatingBubble />
    </SidebarProvider>
  );
}
