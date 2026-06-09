import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { SummaryBar } from './SummaryBar';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import BrandAiPage from '@/pages/BrandAiPage';
import { AgentFab } from '@/components/agent/AgentFab';

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, approvalStatus } = useAuth();
  const isAiPage = location.pathname === '/dashboard/ai';

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
    if (!loading && user && approvalStatus && approvalStatus !== 'approved') {
      navigate('/pending-approval', { replace: true });
    }
  }, [user, loading, approvalStatus, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!user) return null;

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
          {/* AI page always mounted, hidden when not active */}
          <div className={isAiPage ? '' : 'hidden'}>
            <BrandAiPage />
          </div>
          {/* Other pages via router */}
          {!isAiPage && <Outlet />}
        </div>
      </SidebarInset>
      <AgentFab />
    </SidebarProvider>
  );
}
