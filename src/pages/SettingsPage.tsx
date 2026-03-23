import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, LogOut, Copy, Check, Webhook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const API_URL = 'https://ifrrsotvlvunpxtghbua.supabase.co/functions/v1/get-todays-focus';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const copyToClipboard = () => {
    const textarea = document.createElement('textarea');
    textarea.value = API_URL;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </div>

      <div className="bg-card rounded-lg border shadow-card p-6 space-y-6 max-w-2xl">
        {/* Account */}
        <div>
          <h2 className="text-sm font-medium text-foreground">Account</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Logged in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        <div className="border-t" />

        {/* API Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">Today's Focus API</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            External agents can call this endpoint to get today's focus KOLs, overdue items, and pre-publish confirmations as JSON.
          </p>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={API_URL}
              className="text-xs font-mono bg-muted"
            />
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={copyToClipboard}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground font-mono space-y-1">
            <p className="font-sans text-xs font-medium text-foreground">Example usage:</p>
            <p>curl {API_URL}</p>
          </div>
        </div>

        <div className="border-t" />

        {/* Sign Out */}
        <div>
          <Button variant="outline" className="gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
