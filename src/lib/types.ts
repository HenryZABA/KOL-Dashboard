export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'x' | 'facebook';

export type Stage =
  | 'writing_idea'
  | 'writing_script'
  | 'creating_project'
  | 'video_production'
  | 'pre_publish'
  | 'published';

export interface ChangeLogEntry {
  id: string;
  fromStage: Stage | null;
  toStage: Stage;
  timestamp: string;
  note?: string;
}

export interface KOL {
  id: string;
  name: string;
  platforms: Platform[];
  profileUrl?: string;
  contentDirection?: string;
  notes?: string;
  currentStage: Stage;
  scriptVersion: number;
  scriptComplete: boolean;
  projectComplete: boolean;
  videoVersion: number;
  feishuUrl?: string;
  isTodaysFocus: boolean;
  agencyId: string;
  stageUpdatedAt: string;
  publishedAt?: string;
  createdAt: string;
  stageLinks?: Record<string, string>;
  changeLog?: ChangeLogEntry[];
}

export interface Agency {
  id: string;
  name: string;
  token: string;
}

export const STAGE_LABELS: Record<Stage, string> = {
  writing_idea: 'Idea',
  writing_script: 'Script / Project',
  creating_project: 'Project',
  video_production: 'Video',
  pre_publish: 'Pre-publish Confirmation',
  published: 'Published',
};

export const STAGE_ORDER: Stage[] = [
  'writing_idea',
  'writing_script',
  'video_production',
  'pre_publish',
  'published',
];

// Kanban columns — script + project are merged
export type KanbanColumn = 'writing_idea' | 'script_project' | 'video_production' | 'pre_publish' | 'published';

export const KANBAN_COLUMNS: { key: KanbanColumn; label: string; stages: Stage[] }[] = [
  { key: 'writing_idea', label: 'Idea', stages: ['writing_idea'] },
  { key: 'script_project', label: 'Script / Project', stages: ['writing_script', 'creating_project'] },
  { key: 'video_production', label: 'Video', stages: ['video_production'] },
  { key: 'pre_publish', label: 'Pre-publish Confirmation', stages: ['pre_publish'] },
  { key: 'published', label: 'Published', stages: ['published'] },
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  x: 'X',
  facebook: 'Facebook',
};

export function getDaysInStage(stageUpdatedAt: string): number {
  const updated = new Date(stageUpdatedAt);
  const now = new Date();
  const diff = now.getTime() - updated.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(stageUpdatedAt: string): boolean {
  return getDaysInStage(stageUpdatedAt) > 2;
}

export function getAgencyById(agencies: Agency[], id: string): Agency | undefined {
  return agencies.find((a) => a.id === id);
}

export function getAgencyByToken(agencies: Agency[], token: string): Agency | undefined {
  return agencies.find((a) => a.token === token);
}

/** Get the effective kanban column for a KOL */
export function getKanbanColumn(kol: KOL): KanbanColumn {
  if (kol.currentStage === 'writing_script' || kol.currentStage === 'creating_project') {
    return 'script_project';
  }
  return kol.currentStage as KanbanColumn;
}
