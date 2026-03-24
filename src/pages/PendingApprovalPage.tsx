import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function PendingApprovalPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-card text-center">
        <CardHeader className="pb-3">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <CardTitle className="text-lg">Pending Approval</CardTitle>
          <CardDescription>
            Your account ({user?.email}) has been created. An administrator needs to approve your access before you can use the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Please contact your team administrator to approve your account.
          </p>
          <Button variant="outline" className="gap-1.5" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
