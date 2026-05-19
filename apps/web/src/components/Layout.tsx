import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNav } from '@/components/BottomNav';
import { ForcePasswordChange } from '@/components/ForcePasswordChange';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar — desktop only */}
        <div className="hidden lg:block">
          <AppSidebar
            isAdmin={user?.role === 'admin'}
            userName={user?.name ?? 'User'}
            onLogout={logout}
          />
        </div>

        <main className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-14 border-b bg-card flex items-center px-4 gap-4 sticky top-0 z-40">
            <div className="hidden lg:block">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/Logo Debtrac.png" alt="Debtrac" className="h-7 w-7 object-contain" />
              <span className="font-semibold text-sm">Debtrac</span>
            </div>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="lg:hidden h-8 w-8 p-0 text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </header>

          {/* Page content — extra bottom padding on mobile for bottom nav */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />

      <ForcePasswordChange />
    </SidebarProvider>
  );
}
