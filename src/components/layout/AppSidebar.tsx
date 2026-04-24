import { NavLink, useLocation } from 'react-router-dom';
import { Crosshair, Users, Building2, Settings, LayoutDashboard, MessageSquare, Inbox, BarChart3 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const NAV_ITEMS = [
  { to: '/dashboard', icon: Crosshair, label: "Today's Focus", end: true },
  { to: '/dashboard/kols', icon: Users, label: 'All KOLs', end: false },
  { to: '/dashboard/agencies', icon: Building2, label: 'Agencies', end: false },
  { to: '/dashboard/performance', icon: BarChart3, label: 'Performance', end: false },
  { to: '/dashboard/ai', icon: MessageSquare, label: 'AI Assistant', end: false },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', end: false },
];

export function AppSidebar() {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count || 0));
  }, [location.pathname]);

  const isActive = (to: string, end: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
            <LayoutDashboard className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-sidebar-accent-foreground">
            KOL Campaign
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarMenu>
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <SidebarMenuItem key={to}>
              <SidebarMenuButton
                asChild
                isActive={isActive(to, end)}
                tooltip={label}
              >
                <NavLink
                  to={to}
                  end={end}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t border-sidebar-border space-y-2">
        <NavLink
          to="/dashboard/inbox"
          className={cn(
            'flex items-center gap-2 rounded-md px-0 py-1 text-sm transition-colors',
            isActive('/dashboard/inbox', false)
              ? 'text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
          )}
        >
          <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center relative">
            <Inbox className="h-3.5 w-3.5 text-sidebar-accent-foreground" />
            {pendingCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center">
                {pendingCount}
              </Badge>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium">Inbox</span>
            <span className="text-[10px] text-sidebar-foreground">
              {pendingCount > 0 ? `${pendingCount} pending` : 'No pending'}
            </span>
          </div>
        </NavLink>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-sidebar-accent-foreground">Admin</span>
            <span className="text-[10px] text-sidebar-foreground">Brand Owner</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
