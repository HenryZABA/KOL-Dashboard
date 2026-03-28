import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, LogOut, Copy, Check, Webhook, Key, DatabaseZap, BarChart3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

const BASE_URL = 'https://ifrrsotvlvunpxtghbua.supabase.co/functions/v1';
const FOCUS_API_URL = `${BASE_URL}/get-todays-focus`;
const MANAGE_API_URL = `${BASE_URL}/manage-kols`;
const METRICS_API_URL = `${BASE_URL}/manage-video-metrics`;
const CONVERSIONS_API_URL = `${BASE_URL}/manage-kol-conversions`;
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

        {/* API Key — standalone section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">API Key</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            All API endpoints below share this key. Pass it in the <code className="bg-muted px-1 rounded text-[11px]">Authorization: Bearer</code> header.
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={API_KEY} className="text-xs font-mono bg-muted" type="password" />
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(API_KEY, 'key')}>
              {copied === 'key' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === 'key' ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        <div className="border-t" />

        {/* Today's Focus API Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">Today's Focus API (Read-only)</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            External agents can call this endpoint to get today's focus KOLs, overdue items, and pre-publish confirmations as JSON.
          </p>

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={FOCUS_API_URL} className="text-xs font-mono bg-muted" />
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(FOCUS_API_URL, 'focus-url')}>
                {copied === 'focus-url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'focus-url' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Usage example */}
          <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground font-mono space-y-1.5 overflow-x-auto">
            <p className="font-sans text-xs font-medium text-foreground">Example:</p>
            <p className="whitespace-nowrap">curl -H &quot;Authorization: Bearer $API_KEY&quot; \</p>
            <p className="whitespace-nowrap pl-4">{FOCUS_API_URL}</p>
          </div>
        </div>

        <div className="border-t" />

        {/* Manage KOLs API Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <DatabaseZap className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">KOL Management API (CRUD)</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Full CRUD API for creating, reading, updating, and deleting KOLs. Supports GET / POST / PATCH / DELETE.
          </p>

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={MANAGE_API_URL} className="text-xs font-mono bg-muted" />
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(MANAGE_API_URL, 'manage-url')}>
                {copied === 'manage-url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'manage-url' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Usage examples */}
          <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground font-mono space-y-3 overflow-x-auto">
            <div>
              <p className="font-sans text-xs font-medium text-foreground">GET — List all KOLs:</p>
              <p className="whitespace-nowrap mt-1">curl -H &quot;Authorization: Bearer $API_KEY&quot; {MANAGE_API_URL}</p>
            </div>
            <div>
              <p className="font-sans text-xs font-medium text-foreground">POST — Create KOL:</p>
              <p className="whitespace-nowrap mt-1">curl -X POST -H &quot;Authorization: Bearer $API_KEY&quot; \</p>
              <p className="whitespace-nowrap pl-4">-H &quot;Content-Type: application/json&quot; \</p>
              <p className="whitespace-nowrap pl-4">-d '{`{"name":"KOL Name","platforms":["youtube"],"agency_id":"..."}`}' \</p>
              <p className="whitespace-nowrap pl-4">{MANAGE_API_URL}</p>
            </div>
            <div>
              <p className="font-sans text-xs font-medium text-foreground">PATCH — Update KOL:</p>
              <p className="whitespace-nowrap mt-1">curl -X PATCH -H &quot;Authorization: Bearer $API_KEY&quot; \</p>
              <p className="whitespace-nowrap pl-4">-H &quot;Content-Type: application/json&quot; \</p>
              <p className="whitespace-nowrap pl-4">-d '{`{"id":"...","current_stage":"video_production"}`}' \</p>
              <p className="whitespace-nowrap pl-4">{MANAGE_API_URL}</p>
            </div>
            <div>
              <p className="font-sans text-xs font-medium text-foreground">DELETE — Remove KOL:</p>
              <p className="whitespace-nowrap mt-1">curl -X DELETE -H &quot;Authorization: Bearer $API_KEY&quot; \</p>
              <p className="whitespace-nowrap pl-4">-H &quot;Content-Type: application/json&quot; \</p>
              <p className="whitespace-nowrap pl-4">-d '{`{"id":"..."}`}' {MANAGE_API_URL}</p>
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* Video Metrics API Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">Video Metrics API</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Submit video performance data (views, likes, comments, shares) for published KOLs. Supports batch insert.
          </p>

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={METRICS_API_URL} className="text-xs font-mono bg-muted" />
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(METRICS_API_URL, 'metrics-url')}>
                {copied === 'metrics-url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'metrics-url' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Usage examples */}
          <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground font-mono space-y-3 overflow-x-auto">
            <div>
              <p className="font-sans text-xs font-medium text-foreground">POST — Submit metrics:</p>
              <p className="whitespace-nowrap mt-1">curl -X POST -H &quot;Authorization: Bearer $API_KEY&quot; \</p>
              <p className="whitespace-nowrap pl-4">-H &quot;Content-Type: application/json&quot; \</p>
              <p className="whitespace-nowrap pl-4">-d '{`{"kol_id":"...","platform":"youtube","views":15000,"likes":800,"comments":120,"shares":45}`}' \</p>
              <p className="whitespace-nowrap pl-4">{METRICS_API_URL}</p>
            </div>
            <div>
              <p className="font-sans text-xs font-medium text-foreground">GET — Fetch all metrics:</p>
              <p className="whitespace-nowrap mt-1">curl -H &quot;Authorization: Bearer $API_KEY&quot; {METRICS_API_URL}</p>
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* KOL Conversions API Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">KOL Conversions API (Upsert)</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Submit UTM / Mixpanel conversion data (triggered users, signups, paid users) per KOL. Uses upsert — one record per KOL, overwritten on each call.
          </p>

          {/* Endpoint URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={CONVERSIONS_API_URL} className="text-xs font-mono bg-muted" />
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => copy(CONVERSIONS_API_URL, 'conv-url')}>
                {copied === 'conv-url' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === 'conv-url' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          {/* Fields */}
          <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground space-y-1.5">
            <p className="font-sans text-xs font-medium text-foreground">Fields:</p>
            <p><code className="bg-muted px-1 rounded">kol_id</code> (required) — UUID of the KOL</p>
            <p><code className="bg-muted px-1 rounded">triggered_users</code> — Number of users reached via UTM</p>
            <p><code className="bg-muted px-1 rounded">signups</code> — Number of registrations</p>
            <p><code className="bg-muted px-1 rounded">paid_users</code> — Number of paying users</p>
          </div>

          {/* Usage examples */}
          <div className="rounded-md bg-muted/60 p-3 text-[11px] text-muted-foreground font-mono space-y-3 overflow-x-auto">
            <div>
              <p className="font-sans text-xs font-medium text-foreground">POST — Upsert conversion data:</p>
              <p className="whitespace-nowrap mt-1">curl -X POST -H &quot;Authorization: Bearer $API_KEY&quot; \</p>
              <p className="whitespace-nowrap pl-4">-H &quot;Content-Type: application/json&quot; \</p>
              <p className="whitespace-nowrap pl-4">-d '{`{"kol_id":"...","triggered_users":5000,"signups":320,"paid_users":45}`}' \</p>
              <p className="whitespace-nowrap pl-4">{CONVERSIONS_API_URL}</p>
            </div>
            <div>
              <p className="font-sans text-xs font-medium text-foreground">GET — Fetch all conversions:</p>
              <p className="whitespace-nowrap mt-1">curl -H &quot;Authorization: Bearer $API_KEY&quot; {CONVERSIONS_API_URL}</p>
            </div>
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
