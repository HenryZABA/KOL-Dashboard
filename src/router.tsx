import { DashboardLayout } from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import TodaysFocusPage from './pages/TodaysFocusPage';
import AllKolsKanbanPage from './pages/AllKolsKanbanPage';
import AgenciesPage from './pages/AgenciesPage';
import SettingsPage from './pages/SettingsPage';
import AgencyPortalPage from './pages/AgencyPortalPage';
import NotFound from './pages/NotFound';

export const routers = [
  {
    path: '/login',
    name: 'login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <TodaysFocusPage /> },
      { path: 'kols', element: <AllKolsKanbanPage /> },
      { path: 'agencies', element: <AgenciesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '/agency/:token',
    name: 'agency-portal',
    element: <AgencyPortalPage />,
  },
  {
    path: '/',
    name: 'home',
    element: <LoginPage />,
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: '*',
    name: '404',
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
