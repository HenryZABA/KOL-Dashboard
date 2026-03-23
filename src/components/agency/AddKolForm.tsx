import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Platform } from '@/lib/mock-data';
import { PLATFORM_LABELS } from '@/lib/mock-data';

interface AddKolFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    platforms: Platform[];
    profileUrl?: string;
    contentDirection?: string;
    notes?: string;
  }) => void;
}

const ALL_PLATFORMS: Platform[] = ['youtube', 'tiktok', 'instagram', 'x'];

export function AddKolForm({ open, onOpenChange, onSubmit }: AddKolFormProps) {
  const [name, setName] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [profileUrl, setProfileUrl] = useState('');
  const [contentDirection, setContentDirection] = useState('');
  const [notes, setNotes] = useState('');

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || platforms.length === 0) return;
    onSubmit({
      name: name.trim(),
      platforms,
      profileUrl: profileUrl.trim() || undefined,
      contentDirection: contentDirection.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    // Reset
    setName('');
    setPlatforms([]);
    setProfileUrl('');
    setContentDirection('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New KOL</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kol-name">Name *</Label>
            <Input
              id="kol-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="KOL name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Platform(s) *</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_PLATFORMS.map((p) => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={platforms.includes(p)}
                    onCheckedChange={() => togglePlatform(p)}
                  />
                  <span className="text-sm">{PLATFORM_LABELS[p]}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="kol-url">Profile URL</Label>
            <Input
              id="kol-url"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kol-direction">Content Direction</Label>
            <Input
              id="kol-direction"
              value={contentDirection}
              onChange={(e) => setContentDirection(e.target.value)}
              placeholder="e.g., Tech Reviews"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kol-notes">Notes</Label>
            <Textarea
              id="kol-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || platforms.length === 0}>
              Add KOL
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
