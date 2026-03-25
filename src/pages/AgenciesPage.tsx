import { useState } from 'react';
import { useKolStore } from '@/lib/kol-store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Building2, Copy, Plus, Trash2, Check, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Agency } from '@/lib/mock-data';

function copyToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

function buildPortalUrl(token: string) {
  return `${window.location.origin}/agency/${token}`;
}

export default function AgenciesPage() {
  const { kols, agencies, addAgency, removeAgency } = useKolStore();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [createdAgency, setCreatedAgency] = useState<Agency | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getKolCount = (agencyId: string) => kols.filter((k) => k.agencyId === agencyId).length;

  const handleCopyLink = (token: string, agencyId: string) => {
    const url = buildPortalUrl(token);
    if (copyToClipboard(url)) {
      setCopiedId(agencyId);
      toast({ title: 'Link copied', description: 'Agency portal link copied to clipboard.' });
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast({ title: 'Copy failed', description: url, variant: 'destructive' });
    }
  };

  const handleAddAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyName.trim()) return;
    const agency = await addAgency(newAgencyName.trim());
    setNewAgencyName('');
    setShowAddDialog(false);
    setCreatedAgency(agency);
  };

  const handleDeleteAgency = async () => {
    if (!deleteTarget) return;
    const agency = agencies.find((a) => a.id === deleteTarget);
    await removeAgency(deleteTarget);
    setDeleteTarget(null);
    toast({ title: 'Agency removed', description: `${agency?.name} and its KOLs have been removed.` });
  };

  const deleteTargetAgency = agencies.find((a) => a.id === deleteTarget);
  const deleteTargetKolCount = deleteTarget ? getKolCount(deleteTarget) : 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Agencies</h1>
          <span className="text-sm text-muted-foreground">({agencies.length})</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4" />
          Add Agency
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency Name</TableHead>
              <TableHead>KOLs</TableHead>
              <TableHead>Portal Link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agencies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No agencies yet. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              agencies.map((agency) => (
                <TableRow key={agency.id}>
                  <TableCell className="font-medium">{agency.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {getKolCount(agency.id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-[11px] bg-muted px-2 py-1 rounded text-muted-foreground break-all select-all">
                      /agency/{agency.token}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => handleCopyLink(agency.token, agency.id)}
                      >
                        {copiedId === agency.id ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedId === agency.id ? 'Copied' : 'Copy Link'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(agency.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Agency Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Agency</DialogTitle>
            <DialogDescription>
              A unique portal link will be automatically generated.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddAgency} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agency-name">Agency Name</Label>
              <Input
                id="agency-name"
                value={newAgencyName}
                onChange={(e) => setNewAgencyName(e.target.value)}
                placeholder="e.g., StarReach Media"
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newAgencyName.trim()}>
                Add Agency
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Created Agency — show link */}
      <Dialog open={!!createdAgency} onOpenChange={(open) => !open && setCreatedAgency(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agency Created</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{createdAgency?.name}</span> has been added. Share this portal link with the agency.
            </DialogDescription>
          </DialogHeader>
          {createdAgency && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                <code className="text-xs break-all flex-1 select-all">
                  {buildPortalUrl(createdAgency.token)}
                </code>
              </div>
              <Button
                className="w-full gap-1.5"
                onClick={() => {
                  handleCopyLink(createdAgency.token, createdAgency.id);
                  setCreatedAgency(null);
                }}
              >
                <Copy className="h-4 w-4" />
                Copy Link & Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTargetAgency?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this agency
              {deleteTargetKolCount > 0 && ` and its ${deleteTargetKolCount} associated KOL(s)`}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAgency}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
