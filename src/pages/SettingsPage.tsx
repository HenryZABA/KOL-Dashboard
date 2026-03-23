import { Button } from '@/components/ui/button';
import { Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('kol-auth');
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </div>

      <div className="bg-card rounded-lg border shadow-card p-6 space-y-6 max-w-lg">
        <div>
          <h2 className="text-sm font-medium text-foreground">Account</h2>
          <p className="text-xs text-muted-foreground mt-1">
            You are logged in as the brand owner (admin).
          </p>
        </div>

        <div className="border-t pt-6">
          <Button variant="outline" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
