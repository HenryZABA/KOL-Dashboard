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
  createdAt: string;
  stageLinks?: Record<string, string>;
  changeLog: ChangeLogEntry[];
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
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_AGENCIES: Agency[] = [
  { id: 'agency-1', name: 'StarReach Media', token: 'sr-token-2024' },
  { id: 'agency-2', name: 'Pulse Digital', token: 'pd-token-2024' },
  { id: 'agency-3', name: 'Nova Creators', token: 'nc-token-2024' },
];

export const MOCK_KOLS: KOL[] = [
  {
    id: 'kol-1',
    name: 'Alex Chen',
    platforms: ['youtube', 'tiktok'],
    profileUrl: 'https://youtube.com/@alexchen',
    contentDirection: 'Tech Reviews',
    currentStage: 'writing_script',
    scriptVersion: 2,
    scriptComplete: true,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: true,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(3),
    createdAt: daysAgo(10),
    changeLog: [
      { id: 'cl-1', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(10) },
      { id: 'cl-2', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(5) },
    ],
  },
  {
    id: 'kol-2',
    name: 'Maya Johnson',
    platforms: ['instagram'],
    contentDirection: 'Lifestyle & Fashion',
    currentStage: 'video_production',
    scriptVersion: 3,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 1,
    isTodaysFocus: false,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(15),
    changeLog: [
      { id: 'cl-3', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(15) },
      { id: 'cl-4', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(12) },
      { id: 'cl-5', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-3',
    name: 'Riku Tanaka',
    platforms: ['youtube'],
    contentDirection: 'Gaming',
    currentStage: 'writing_idea',
    scriptVersion: 0,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(4),
    createdAt: daysAgo(4),
    changeLog: [
      { id: 'cl-6', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(4) },
    ],
  },
  {
    id: 'kol-4',
    name: 'Sophie Martin',
    platforms: ['tiktok', 'instagram'],
    contentDirection: 'Beauty & Skincare',
    currentStage: 'pre_publish',
    scriptVersion: 2,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 2,
    feishuUrl: 'https://feishu.cn/docs/example1',
    isTodaysFocus: true,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(20),
    changeLog: [
      { id: 'cl-7', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(20) },
      { id: 'cl-8', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(16) },
      { id: 'cl-9', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(10) },
      { id: 'cl-10', fromStage: 'video_production', toStage: 'pre_publish', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-5',
    name: 'James Park',
    platforms: ['youtube', 'x'],
    contentDirection: 'Finance & Crypto',
    currentStage: 'published',
    scriptVersion: 1,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 1,
    feishuUrl: 'https://feishu.cn/docs/example2',
    isTodaysFocus: false,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(0),
    createdAt: daysAgo(25),
    changeLog: [
      { id: 'cl-11', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(25) },
      { id: 'cl-12', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(20) },
      { id: 'cl-13', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(14) },
      { id: 'cl-14', fromStage: 'video_production', toStage: 'pre_publish', timestamp: daysAgo(5) },
      { id: 'cl-15', fromStage: 'pre_publish', toStage: 'published', timestamp: daysAgo(0) },
    ],
  },
  {
    id: 'kol-6',
    name: 'Lina Wei',
    platforms: ['tiktok'],
    contentDirection: 'Dance & Entertainment',
    currentStage: 'creating_project',
    scriptVersion: 1,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(5),
    createdAt: daysAgo(8),
    changeLog: [
      { id: 'cl-16', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(8) },
      { id: 'cl-17', fromStage: 'writing_idea', toStage: 'creating_project', timestamp: daysAgo(5) },
    ],
  },
  {
    id: 'kol-7',
    name: 'Carlos Rivera',
    platforms: ['youtube', 'instagram'],
    contentDirection: 'Travel & Vlog',
    currentStage: 'writing_script',
    scriptVersion: 1,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(6),
    changeLog: [
      { id: 'cl-18', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(6) },
      { id: 'cl-19', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-8',
    name: 'Emma Davis',
    platforms: ['instagram', 'x'],
    contentDirection: 'Fitness & Wellness',
    currentStage: 'video_production',
    scriptVersion: 2,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 2,
    isTodaysFocus: false,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(3),
    createdAt: daysAgo(18),
    changeLog: [
      { id: 'cl-20', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(18) },
      { id: 'cl-21', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(13) },
      { id: 'cl-22', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(3) },
    ],
  },
  {
    id: 'kol-9',
    name: 'Kai Nakamura',
    platforms: ['youtube'],
    contentDirection: 'Cooking & Food',
    currentStage: 'writing_idea',
    scriptVersion: 0,
    scriptComplete: false,
    projectComplete: false,
    videoVersion: 0,
    isTodaysFocus: true,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(1),
    changeLog: [
      { id: 'cl-23', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(1) },
    ],
  },
  {
    id: 'kol-10',
    name: 'Priya Sharma',
    platforms: ['tiktok', 'youtube'],
    contentDirection: 'Education & Science',
    currentStage: 'pre_publish',
    scriptVersion: 3,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 1,
    isTodaysFocus: false,
    agencyId: 'agency-1',
    stageUpdatedAt: daysAgo(4),
    createdAt: daysAgo(22),
    changeLog: [
      { id: 'cl-24', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(22) },
      { id: 'cl-25', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(18) },
      { id: 'cl-26', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(10) },
      { id: 'cl-27', fromStage: 'video_production', toStage: 'pre_publish', timestamp: daysAgo(4) },
    ],
  },
  {
    id: 'kol-11',
    name: 'Oliver Zhang',
    platforms: ['x'],
    contentDirection: 'AI & Technology',
    currentStage: 'writing_script',
    scriptVersion: 3,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 0,
    isTodaysFocus: false,
    agencyId: 'agency-2',
    stageUpdatedAt: daysAgo(0),
    createdAt: daysAgo(7),
    changeLog: [
      { id: 'cl-28', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(7) },
      { id: 'cl-29', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(0) },
    ],
  },
  {
    id: 'kol-12',
    name: 'Hana Kim',
    platforms: ['instagram', 'tiktok'],
    contentDirection: 'K-Beauty & Culture',
    currentStage: 'video_production',
    scriptVersion: 1,
    scriptComplete: true,
    projectComplete: true,
    videoVersion: 3,
    isTodaysFocus: false,
    agencyId: 'agency-3',
    stageUpdatedAt: daysAgo(1),
    createdAt: daysAgo(14),
    changeLog: [
      { id: 'cl-30', fromStage: null, toStage: 'writing_idea', timestamp: daysAgo(14) },
      { id: 'cl-31', fromStage: 'writing_idea', toStage: 'writing_script', timestamp: daysAgo(10) },
      { id: 'cl-32', fromStage: 'writing_script', toStage: 'video_production', timestamp: daysAgo(1) },
    ],
  },
];

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
