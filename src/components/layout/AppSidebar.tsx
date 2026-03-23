import { NavLink, useLocation } from 'react-router-dom';
import { Crosshair, Users, Building2, Settings, LayoutDashboard } from 'lucide-react';
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

const NAV_ITEMS = [
  { to: '/dashboard', icon: Crosshair, label: "Today's Focus", end: true },
  { to: '/dashboard/kols', icon: Users, label: 'All KOLs', end: false },
  { to: '/dashboard/agencies', icon: Building2, label: 'Agencies', end: false },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', end: false },
];

export function AppSidebar() {
  const location = useLocation();

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

      <SidebarFooter className="px-4 py-3 border-t border-sidebar-border">
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
