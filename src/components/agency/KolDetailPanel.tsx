import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChangeLog } from './ChangeLog';
import { PlatformIcons } from '@/components/kol/PlatformIcon';
import { StageLabel } from '@/components/kol/StageLabel';
import type { KOL, Stage } from '@/lib/mock-data';
import { STAGE_LABELS, getDaysInStage, isOverdue } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { Clock, Link as LinkIcon } from 'lucide-react';

interface KolDetailPanelProps {
  kol: KOL | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateStage: (kolId: string, stage: Stage, note?: string) => void;
  onUpdateField: (kolId: string, updates: Partial<KOL>) => void;
  onToggleFocus: (kolId: string) => void;
}

const ALLOWED_STAGES: Stage[] = [
  'writing_idea',
  'writing_script',
  'video_production',
  'pre_publish',
  'published',
];

const LINK_STAGES: { key: Stage; label: string }[] = [
  { key: 'writing_idea', label: 'Idea' },
  { key: 'writing_script', label: 'Script' },
  { key: 'creating_project', label: 'Project' },
  { key: 'video_production', label: 'Video' },
  { key: 'published', label: 'Published' },
];

const REVISION_OPTIONS = [
  { value: 3, label: '3' },
  { value: 2, label: '2' },
  { value: 1, label: '1' },
  { value: 0, label: 'Final' },
];

function RevisionPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      {REVISION_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          size="sm"
          variant={value === opt.value ? 'default' : 'outline'}
          className="h-8 px-3 text-xs"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

export function KolDetailPanel({
  kol,
  open,
  onOpenChange,
  onUpdateStage,
  onUpdateField,
  onToggleFocus,
}: KolDetailPanelProps) {
  const [selectedStage, setSelectedStage] = useState<Stage | ''>('');

  if (!kol) return null;

  const days = getDaysInStage(kol.stageUpdatedAt);
  const overdue = isOverdue(kol.stageUpdatedAt) && kol.currentStage !== 'published';

  const handleStageChange = (value: string) => {
    const newStage = value as Stage;
    setSelectedStage(newStage);
    onUpdateStage(kol.id, newStage);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            {kol.name}
            <PlatformIcons platforms={kol.platforms} />
          </SheetTitle>
          <SheetDescription>
            {kol.contentDirection || 'No content direction specified'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Current status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Current Stage
              </Label>
              <div className="flex items-center gap-1.5">
                <Clock className={cn('h-3 w-3', overdue ? 'text-overdue' : 'text-muted-foreground')} />
                <span className={cn('text-xs', overdue ? 'text-overdue font-medium' : 'text-muted-foreground')}>
                  {days}d
                </span>
              </div>
            </div>
            <StageLabel stage={kol.currentStage} />
          </div>

          <Separator />

          {/* Update stage */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Update Stage
            </Label>
            <Select value={selectedStage || kol.currentStage} onValueChange={handleStageChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage-specific fields */}
          {kol.currentStage === 'writing_script' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Est. Remaining Revisions (Script)
                </Label>
                <RevisionPicker
                  value={kol.scriptVersion}
                  onChange={(v) => onUpdateField(kol.id, { scriptVersion: v })}
                />
              </div>
            </>
          )}

          {kol.currentStage === 'video_production' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Est. Remaining Revisions (Video)
                </Label>
                <RevisionPicker
                  value={kol.videoVersion}
                  onChange={(v) => onUpdateField(kol.id, { videoVersion: v })}
                />
              </div>
            </>
          )}

          {kol.currentStage === 'pre_publish' && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Feishu Document URL
                </Label>
                <Input
                  placeholder="https://feishu.cn/docs/..."
                  value={kol.feishuUrl || ''}
                  onChange={(e) => onUpdateField(kol.id, { feishuUrl: e.target.value })}
                />
              </div>
            </>
          )}

          {kol.currentStage !== 'pre_publish' && (
            <>
              <Separator />

              {/* Review Material Link — only for current stage */}
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="h-3 w-3" />
                  Review Material Link
                </Label>
                <div className="space-y-2.5">
                  {LINK_STAGES
                    .filter(({ key }) => {
                      // For parallel stages, show both script and project
                      if (kol.currentStage === 'writing_script') {
                        return key === 'writing_script' || key === 'creating_project';
                      }
                      return key === kol.currentStage;
                    })
                    .map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                      <Input
                        placeholder="https://..."
                        className="h-7 text-xs"
                        value={kol.stageLinks?.[key] || ''}
                        onChange={(e) => {
                          const updated = { ...(kol.stageLinks || {}), [key]: e.target.value };
                          onUpdateField(kol.id, { stageLinks: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Today's Focus toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Flag for Today's Focus</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Highlights this KOL on the dashboard
              </p>
            </div>
            <Switch
              checked={kol.isTodaysFocus}
              onCheckedChange={() => onToggleFocus(kol.id)}
            />
          </div>

          <Separator />

          {/* Change log */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Change History
            </Label>
            <ChangeLog changeLog={kol.changeLog} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
