# UTM/Mixpanel Conversion Data for KOL Cards

## Context
Add a new row below each KOL performance card showing conversion funnel data from UTM/Mixpanel: triggered users, signups, paid users, signup conversion rate, paid conversion rate.

## Database
New table `kol_conversions`:
- `id` uuid PK
- `kol_id` uuid FK → kols.id, UNIQUE (one record per KOL)
- `triggered_users` bigint (触发用户数)
- `signups` bigint (注册数)
- `paid_users` bigint (付费数)
- `updated_at` timestamptz
- RLS: anon can read + upsert (for external API)

## Frontend
1. **`src/hooks/useKolConversions.ts`** — fetch all kol_conversions, return Map<kol_id, data>
2. **`KolTickerCard.tsx`** — add conversion row below existing metrics:
   - Triggered Users | Signups | Signup CVR | Paid CVR | Paid Users
   - CVR = computed: signup_cvr = signups/triggered_users, paid_cvr = paid_users/signups

## Files to modify
- New migration (supabase_migration)
- `src/hooks/useKolConversions.ts` (new)
- `src/components/performance/KolTickerCard.tsx` (add conversion row)
- Parent component passing conversion data to KolTickerCard

## API Field Reference (for external agent)
| Display | DB column | Type |
|---------|-----------|------|
| 触发用户数 | `triggered_users` | bigint |
| 注册数 | `signups` | bigint |
| 付费数 | `paid_users` | bigint |

Table: `kol_conversions`, upsert on `kol_id`.
