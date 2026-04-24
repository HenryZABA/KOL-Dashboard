import { supabase } from '@/integrations/supabase/client';

export interface KolConversion {
  id: string;
  kol_id: string;
  platform: string;
  triggered_users: number;
  signups: number;
  paid_users: number;
}

/** Fetch all conversion records for given KOL IDs */
export async function fetchConversions(kolIds: string[]): Promise<KolConversion[]> {
  if (kolIds.length === 0) return [];

  const { data, error } = await supabase
    .from('kol_conversions')
    .select('*')
    .in('kol_id', kolIds);

  if (error) {
    console.warn('[conversion-service] fetch error:', error.message);
    return [];
  }

  return (data ?? []) as unknown as KolConversion[];
}
