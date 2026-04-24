import { supabase } from '@/integrations/supabase/client';
import type { KOL, Agency, Stage, Platform } from '@/lib/types';

/** Map DB row (snake_case) to frontend KOL type (camelCase) */
export function dbToKol(row: Record<string, unknown>): KOL {
  return {
    id: row.id as string,
    name: row.name as string,
    platforms: (row.platforms as string[]) as Platform[],
    profileUrl: (row.profile_url as string) || undefined,
    contentDirection: (row.content_direction as string) || undefined,
    notes: (row.notes as string) || undefined,
    currentStage: row.current_stage as Stage,
    scriptVersion: row.script_version as number,
    scriptComplete: row.script_complete as boolean,
    projectComplete: row.project_complete as boolean,
    videoVersion: row.video_version as number,
    feishuUrl: (row.feishu_url as string) || undefined,
    isTodaysFocus: row.is_todays_focus as boolean,
    agencyId: row.agency_id as string,
    stageLinks: (row.stage_links as Record<string, string>) || {},
    stageUpdatedAt: row.stage_updated_at as string,
    publishedAt: (row.published_at as string) || undefined,
    createdAt: row.created_at as string,
    // Influencer info
    category: (row.category as string) || undefined,
    followerCount: (row.follower_count as number) ?? undefined,
    region: (row.region as string) || undefined,
    medianViews: (row.median_views as number) ?? undefined,
    integrationType: (row.integration_type as string) || undefined,
    finalPrice: (row.final_price as number) ?? undefined,
    influencerSearchNote: (row.influencer_search_note as string) || undefined,
    // Publish info
    bootLink: (row.boot_link as string) || undefined,
    caption: (row.caption as string) || undefined,
    coverUrl: (row.cover_url as string) || undefined,
    rawFootageUrl: (row.raw_footage_url as string) || undefined,
    dataDetailLink: (row.data_detail_link as string) || undefined,
    screenshotTime: (row.screenshot_time as string) || undefined,
  };
}

/** Map DB row to frontend Agency type */
export function dbToAgency(row: Record<string, unknown>): Agency {
  return {
    id: row.id as string,
    name: row.name as string,
    token: row.token as string,
  };
}

/** Fetch all KOLs ordered by creation date */
export async function fetchAllKols(): Promise<KOL[]> {
  const { data, error } = await supabase
    .from('kols')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(dbToKol);
}

/** Fetch all agencies ordered by creation date */
export async function fetchAllAgencies(): Promise<Agency[]> {
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(dbToAgency);
}

/** Insert a new KOL and its initial change_log entry */
export async function insertKol(input: {
  name: string;
  platforms: Platform[];
  agencyId: string;
  profileUrl?: string;
  contentDirection?: string;
  notes?: string;
  initialStage?: Stage;
}): Promise<void> {
  const stage = input.initialStage || 'writing_idea';
  const { data: inserted, error } = await supabase
    .from('kols')
    .insert({
      name: input.name,
      platforms: input.platforms,
      profile_url: input.profileUrl || null,
      content_direction: input.contentDirection || null,
      notes: input.notes || null,
      current_stage: stage,
      agency_id: input.agencyId,
    })
    .select()
    .single();

  if (error || !inserted) {
    console.error('insertKol error:', error);
    return;
  }

  await supabase.from('change_log').insert({
    kol_id: (inserted as Record<string, unknown>).id as string,
    from_stage: null,
    to_stage: stage,
  });
}

/** Update a KOL's stage and log the change */
export async function updateKolStage(kolId: string, fromStage: Stage | null, newStage: Stage, note?: string): Promise<void> {
  await supabase
    .from('kols')
    .update({
      current_stage: newStage,
      stage_updated_at: new Date().toISOString(),
      ...(newStage === 'pre_publish' ? { is_todays_focus: true } : {}),
    })
    .eq('id', kolId);

  await supabase.from('change_log').insert({
    kol_id: kolId,
    from_stage: fromStage,
    to_stage: newStage,
    note: note || null,
  });
}

/** Update arbitrary fields on a KOL */
export async function updateKolFields(kolId: string, updates: Partial<KOL>): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.scriptVersion !== undefined) dbUpdates.script_version = updates.scriptVersion;
  if (updates.scriptComplete !== undefined) dbUpdates.script_complete = updates.scriptComplete;
  if (updates.projectComplete !== undefined) dbUpdates.project_complete = updates.projectComplete;
  if (updates.videoVersion !== undefined) dbUpdates.video_version = updates.videoVersion;
  if (updates.feishuUrl !== undefined) dbUpdates.feishu_url = updates.feishuUrl;
  if (updates.isTodaysFocus !== undefined) dbUpdates.is_todays_focus = updates.isTodaysFocus;
  if (updates.stageLinks !== undefined) dbUpdates.stage_links = updates.stageLinks;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  // Influencer info
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.followerCount !== undefined) dbUpdates.follower_count = updates.followerCount;
  if (updates.region !== undefined) dbUpdates.region = updates.region;
  if (updates.medianViews !== undefined) dbUpdates.median_views = updates.medianViews;
  if (updates.integrationType !== undefined) dbUpdates.integration_type = updates.integrationType;
  if (updates.finalPrice !== undefined) dbUpdates.final_price = updates.finalPrice;
  if (updates.influencerSearchNote !== undefined) dbUpdates.influencer_search_note = updates.influencerSearchNote;
  // Publish info
  if (updates.bootLink !== undefined) dbUpdates.boot_link = updates.bootLink;
  if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
  if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl;
  if (updates.rawFootageUrl !== undefined) dbUpdates.raw_footage_url = updates.rawFootageUrl;
  if (updates.dataDetailLink !== undefined) dbUpdates.data_detail_link = updates.dataDetailLink;
  if (updates.screenshotTime !== undefined) dbUpdates.screenshot_time = updates.screenshotTime;

  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from('kols').update(dbUpdates).eq('id', kolId);
  }
}

/** Toggle today's focus flag */
export async function toggleFocus(kolId: string, currentValue: boolean): Promise<void> {
  await supabase.from('kols').update({ is_todays_focus: !currentValue }).eq('id', kolId);
}

/** Create a new agency with a generated token */
export async function insertAgency(name: string): Promise<Agency> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const rand = Math.random().toString(36).slice(2, 8);
  const token = `${slug}-${rand}`;

  const { data: inserted, error } = await supabase
    .from('agencies')
    .insert({ name, token })
    .select()
    .single();

  if (error || !inserted) {
    console.error('insertAgency error:', error);
    return { id: '', name, token };
  }

  return dbToAgency(inserted as Record<string, unknown>);
}

/** Delete an agency by ID */
export async function deleteAgency(agencyId: string): Promise<void> {
  await supabase.from('agencies').delete().eq('id', agencyId);
}
