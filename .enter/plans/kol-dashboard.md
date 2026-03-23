# Fix: Agency Portal Link — Persist Data to localStorage

## Context
When a new agency is created, the portal link (`/agency/:token`) fails because:
- Agency/KOL data lives only in React `useState` (in-memory)
- Opening the link triggers a full page load, resetting state to initial mock data
- The newly created agency doesn't exist in mock data, so it shows "Invalid Access Link"

## Solution
Persist `kols` and `agencies` state to `localStorage` in `kol-store.tsx`:

1. **Initialize state from localStorage** — on mount, read saved data; fall back to mock data if nothing saved
2. **Sync state to localStorage** — use `useEffect` to write `kols` and `agencies` to localStorage whenever they change
3. **Maintain the same API** — no changes to any other files

## Files Modified
- `src/lib/kol-store.tsx` — Add localStorage read/write for both `kols` and `agencies`

## Implementation
```typescript
const STORAGE_KEY_KOLS = 'kol-store-kols';
const STORAGE_KEY_AGENCIES = 'kol-store-agencies';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return fallback;
}

// In KolStoreProvider:
const [kols, setKols] = useState<KOL[]>(() => loadFromStorage(STORAGE_KEY_KOLS, MOCK_KOLS));
const [agencies, setAgencies] = useState<Agency[]>(() => loadFromStorage(STORAGE_KEY_AGENCIES, MOCK_AGENCIES));

useEffect(() => { localStorage.setItem(STORAGE_KEY_KOLS, JSON.stringify(kols)); }, [kols]);
useEffect(() => { localStorage.setItem(STORAGE_KEY_AGENCIES, JSON.stringify(agencies)); }, [agencies]);
```

## Verification
1. Create a new agency from the Agencies page
2. Copy the portal link
3. Open the link — should show the agency portal (not "Invalid Access Link")
4. Refresh the dashboard — agencies and KOLs should persist
5. Existing mock agency links should still work
