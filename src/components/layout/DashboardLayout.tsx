import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { SummaryBar } from './SummaryBar';

export function DashboardLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuth = localStorage.getItem('kol-auth');
    if (!isAuth) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
          <SidebarTrigger />
          <span className="text-sm font-semibold">KOL Campaign</span>
        </header>
        <SummaryBar />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
