import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import { StageLabel } from '@/components/kol/StageLabel';
import type { KOL } from '@/lib/types';
import { Pin } from 'lucide-react';

interface AgencyKolTableProps {
  kols: KOL[];
  onSelectKol: (kol: KOL) => void;
}

export function AgencyKolTable({ kols, onSelectKol }: AgencyKolTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">KOL Name</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Current Stage</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {kols.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No KOLs yet. Add your first KOL to get started.
            </TableCell>
          </TableRow>
        ) : (
          kols.map((kol) => (
            <TableRow key={kol.id} className="cursor-pointer" onClick={() => onSelectKol(kol)}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{kol.name}</span>
                  {kol.isTodaysFocus && (
                    <Pin className="h-3 w-3 text-primary" />
                  )}
                </div>
              </TableCell>
              <TableCell>
                <PlatformIcons platforms={kol.platforms} />
              </TableCell>
              <TableCell>
                <StageLabel stage={kol.currentStage} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(kol.stageUpdatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectKol(kol);
                  }}
                >
                  Manage
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
