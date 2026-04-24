import { supabase } from '@/integrations/supabase/client';

export interface VideoMetric {
  id: string;
  kol_id: string;
  platform: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  recorded_at: string;
}

/** Fetch video metrics for given KOL IDs with pagination (bypasses 1000-row limit) */
export async function fetchVideoMetrics(kolIds: string[]): Promise<VideoMetric[]> {
  if (kolIds.length === 0) return [];

  const pageSize = 1000;
  let page = 0;
  let allData: VideoMetric[] = [];

  while (true) {
    const { data, error } = await supabase
      .from('video_metrics')
      .select('*')
      .in('kol_id', kolIds)
      .order('recorded_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.warn('[metrics-service] fetch error on page', page, error.message);
      break;
    }

    allData = allData.concat((data ?? []) as unknown as VideoMetric[]);
    if (!data || data.length < pageSize) break;
    page++;
  }

  return allData;
}
