import { supabase } from '@/integrations/supabase/client';

/** Tool definitions exposed to the agent (OpenAI function-calling style schema) */
export const AGENT_TOOLS = [
  {
    name: 'list_agencies',
    description: '列出所有 agency（KOL 经纪机构），返回 id、name 列表',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'list_kols',
    description: '列出 KOL，支持按 agency_id 或当前阶段 stage 筛选',
    parameters: {
      type: 'object',
      properties: {
        agency_id: { type: 'string', description: 'agency 的 UUID，不填则返回所有' },
        stage: {
          type: 'string',
          description: 'KOL 阶段，例如 writing_idea / script_review / video_production / pre_publish / published',
        },
        limit: { type: 'number', description: '最多返回多少条，默认 50' },
      },
    },
  },
  {
    name: 'get_kol_detail',
    description: '获取单个 KOL 的完整信息（基础资料 + 最新视频数据 + 转化漏斗）',
    parameters: {
      type: 'object',
      properties: {
        kol_id: { type: 'string', description: 'KOL UUID' },
        kol_name: { type: 'string', description: 'KOL 名字（kol_id 不知道时可用）' },
      },
    },
  },
  {
    name: 'get_top_performers',
    description: '按某个指标对所有 KOL 排序，返回 Top N。可指定时间范围。',
    parameters: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: ['views', 'likes', 'comments', 'shares', 'signups', 'paid_users'],
          description: '排序指标',
        },
        limit: { type: 'number', description: 'Top N，默认 10' },
        days: { type: 'number', description: '只看最近 N 天的数据，不填则看历史累计' },
      },
      required: ['metric'],
    },
  },
  {
    name: 'get_recent_publishes',
    description: '最近发布的 KOL 列表（按 published_at 倒序），含初始数据',
    parameters: {
      type: 'object',
      properties: {
        days: { type: 'number', description: '最近 N 天，默认 7' },
      },
    },
  },
];

/** Execute a tool call by name with given args, return JSON-serializable result */
export async function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  try {
    switch (name) {
      case 'list_agencies':
        return await listAgencies();
      case 'list_kols':
        return await listKols(args);
      case 'get_kol_detail':
        return await getKolDetail(args);
      case 'get_top_performers':
        return await getTopPerformers(args);
      case 'get_recent_publishes':
        return await getRecentPublishes(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// --- Tool implementations ---

async function listAgencies() {
  const { data, error } = await supabase.from('agencies').select('id, name').order('name');
  if (error) throw error;
  return { agencies: data ?? [] };
}

async function listKols(args: Record<string, unknown>) {
  const limit = (args.limit as number) || 50;
  let query = supabase
    .from('kols')
    .select('id, name, platforms, current_stage, agency_id, published_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (args.agency_id) query = query.eq('agency_id', args.agency_id as string);
  if (args.stage) query = query.eq('current_stage', args.stage as string);

  const { data, error } = await query;
  if (error) throw error;
  return { kols: data ?? [], count: data?.length || 0 };
}

async function getKolDetail(args: Record<string, unknown>) {
  let kol;
  if (args.kol_id) {
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .eq('id', args.kol_id as string)
      .maybeSingle();
    if (error) throw error;
    kol = data;
  } else if (args.kol_name) {
    const { data, error } = await supabase
      .from('kols')
      .select('*')
      .ilike('name', `%${args.kol_name as string}%`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    kol = data;
  }

  if (!kol) return { error: 'KOL not found' };

  // Latest metrics per platform
  const { data: metrics } = await supabase
    .from('video_metrics')
    .select('platform, views, likes, comments, shares, recorded_at')
    .eq('kol_id', kol.id)
    .order('recorded_at', { ascending: false })
    .limit(50);

  // Conversion data
  const { data: conversions } = await supabase
    .from('kol_conversions')
    .select('platform, triggered_users, signups, paid_users')
    .eq('kol_id', kol.id);

  // Latest metric per platform
  const latestByPlatform: Record<string, unknown> = {};
  for (const m of metrics ?? []) {
    if (!latestByPlatform[m.platform]) latestByPlatform[m.platform] = m;
  }

  return { kol, latest_metrics: latestByPlatform, conversions: conversions ?? [] };
}

async function getTopPerformers(args: Record<string, unknown>) {
  const metric = args.metric as string;
  const limit = (args.limit as number) || 10;
  const days = args.days as number | undefined;

  // Conversion metrics come from kol_conversions
  if (metric === 'signups' || metric === 'paid_users') {
    const { data: convs, error } = await supabase
      .from('kol_conversions')
      .select('kol_id, signups, paid_users');
    if (error) throw error;

    const byKol = new Map<string, number>();
    for (const c of convs ?? []) {
      const v = (c[metric as 'signups' | 'paid_users'] as number) || 0;
      byKol.set(c.kol_id, (byKol.get(c.kol_id) || 0) + v);
    }
    const sorted = [...byKol.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

    const kolIds = sorted.map((s) => s[0]);
    const { data: kols } = await supabase.from('kols').select('id, name').in('id', kolIds);
    const nameMap = new Map((kols ?? []).map((k) => [k.id, k.name]));

    return {
      metric,
      top: sorted.map(([id, value]) => ({ kol_id: id, name: nameMap.get(id) || 'Unknown', value })),
    };
  }

  // Video metrics
  let query = supabase
    .from('video_metrics')
    .select(`kol_id, ${metric}, recorded_at`);
  if (days) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('recorded_at', since);
  }
  const { data: rows, error } = await query;
  if (error) throw error;

  // Take latest value per kol_id (highest views/likes/etc that are cumulative)
  const byKol = new Map<string, { value: number; recordedAt: string }>();
  for (const r of (rows ?? []) as Record<string, unknown>[]) {
    const v = (r[metric] as number) || 0;
    const recordedAt = r.recorded_at as string;
    const kolId = r.kol_id as string;
    const existing = byKol.get(kolId);
    if (!existing || recordedAt > existing.recordedAt) {
      byKol.set(kolId, { value: v, recordedAt });
    }
  }
  const sorted = [...byKol.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, limit);

  const kolIds = sorted.map((s) => s[0]);
  const { data: kols } = await supabase.from('kols').select('id, name, platforms').in('id', kolIds);
  const kolMap = new Map((kols ?? []).map((k) => [k.id, k]));

  return {
    metric,
    days_filter: days || 'all',
    top: sorted.map(([id, { value }]) => ({
      kol_id: id,
      name: kolMap.get(id)?.name || 'Unknown',
      platforms: kolMap.get(id)?.platforms || [],
      value,
    })),
  };
}

async function getRecentPublishes(args: Record<string, unknown>) {
  const days = (args.days as number) || 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('kols')
    .select('id, name, platforms, published_at, agency_id')
    .not('published_at', 'is', null)
    .gte('published_at', since)
    .order('published_at', { ascending: false });
  if (error) throw error;

  return { recent_publishes: data ?? [], count: data?.length || 0 };
}
