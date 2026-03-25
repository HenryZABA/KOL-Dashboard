import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Inbox as InboxIcon, Check, X, Loader2, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PendingUser {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

export default function InboxPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers((data as PendingUser[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('user_profiles')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: status === 'approved' ? 'User approved' : 'User rejected' });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
  };

  const pending = users.filter((u) => u.status === 'pending');
  const reviewed = users.filter((u) => u.status !== 'pending');

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <InboxIcon className="h-5 w-5 text-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Inbox</h1>
        {pending.length > 0 && (
          <Badge variant="destructive" className="text-[11px] px-1.5 py-0">
            {pending.length}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Pending Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">
              Pending Approval ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                <Mail className="h-7 w-7 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No pending requests</p>
              </div>
            ) : (
              pending.map((user) => (
                <UserCard key={user.id} user={user} onAction={handleAction} />
              ))
            )}
          </div>

          {/* Reviewed Section */}
          {reviewed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Reviewed ({reviewed.length})
              </h2>
              {reviewed.map((user) => (
                <UserCard key={user.id} user={user} onAction={handleAction} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UserCard({
  user,
  onAction,
}: {
  user: PendingUser;
  onAction: (id: string, status: 'approved' | 'rejected') => void;
}) {
  const isPending = user.status === 'pending';
  const timeAgo = getTimeAgo(user.created_at);

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-card">
      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
        {user.email[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
        <p className="text-xs text-muted-foreground">Registered {timeAgo}</p>
      </div>
      {isPending ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => onAction(user.id, 'rejected')}
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1"
            onClick={() => onAction(user.id, 'approved')}
          >
            <Check className="h-3.5 w-3.5" />
            Approve
          </Button>
        </div>
      ) : (
        <Badge
          variant={user.status === 'approved' ? 'default' : 'destructive'}
          className="text-[11px] shrink-0"
        >
          {user.status === 'approved' ? 'Approved' : 'Rejected'}
        </Badge>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
