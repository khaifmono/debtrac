import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

interface LayoutProps {
  children: ReactNode;
  isAdmin?: boolean;
  userName?: string;
  onLogout?: () => void;
}

export function Layout({ children, isAdmin, userName, onLogout }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar isAdmin={isAdmin} userName={userName} onLogout={onLogout} />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-4">
            <SidebarTrigger />
          </header>
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
