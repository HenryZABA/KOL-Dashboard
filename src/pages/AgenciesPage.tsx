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
import { Building2, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function AgenciesPage() {
  const { kols, agencies } = useKolStore();

  const getKolCount = (agencyId: string) => kols.filter((k) => k.agencyId === agencyId).length;

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/agency/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied', description: 'Agency portal link copied to clipboard.' });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-foreground" />
        <h1 className="text-lg font-semibold text-foreground">Agencies</h1>
      </div>

      <div className="bg-card rounded-lg border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agency Name</TableHead>
              <TableHead>KOLs</TableHead>
              <TableHead>Access Token</TableHead>
              <TableHead className="text-right">Portal Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agencies.map((agency) => (
              <TableRow key={agency.id}>
                <TableCell className="font-medium">{agency.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {getKolCount(agency.id)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{agency.token}</code>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => copyLink(agency.token)}
                  >
                    <Copy className="h-3 w-3" />
                    Copy Link
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
