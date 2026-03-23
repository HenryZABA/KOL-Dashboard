import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, LogOut, Copy, Check, Webhook, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const API_URL = 'https://ifrrsotvlvunpxtghbua.supabase.co/functions/v1/get-todays-focus';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmcnJzb3R2bHZ1bnB4dGdoYnVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTU3ODksImV4cCI6MjA4OTgzMTc4OX0.iZLvBr48krBjOFU-AE3hOSQ5iXOa19dxeCvBl2tX0O8';

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = (text: string, key: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };
  return { copied, copy };
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { copied, copy } = useCopy();

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">Today's Focus API</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            External agents can call this endpoint to get today's focus KOLs, overdue items, and pre-publish confirmations as JSON.
          </p>

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={API_URL} className="text-xs font-mono bg-muted" />
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(API_URL, 'url')}>
                {copied === 'url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'url' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Key className="h-3 w-3" />
              API Key (anon)
            </Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={API_KEY} className="text-xs font-mono bg-muted" type="password" />
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(API_KEY, 'key')}>
                {copied === 'key' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'key' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Usage example */}
          <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground font-mono space-y-1.5 overflow-x-auto">
            <p className="font-sans text-xs font-medium text-foreground">Example:</p>
            <p className="whitespace-nowrap">curl -H &quot;Authorization: Bearer $API_KEY&quot; \</p>
            <p className="whitespace-nowrap pl-4">{API_URL}</p>
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
