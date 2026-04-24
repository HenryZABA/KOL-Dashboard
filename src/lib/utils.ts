import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Safely open a URL in a new tab, works inside iframes */
export function openExternal(url: string) {
  try {
    const w = window.top || window;
    w.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Format a number to human-readable string (e.g. 1.2K, 3.4M) */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** Parse pub_* entries from stageLinks into a platform -> url map */
export function parsePubLinks(stageLinks?: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  if (!stageLinks) return map;
  for (const [key, val] of Object.entries(stageLinks)) {
    if (key.startsWith('pub_')) {
      const i = val.indexOf('|');
      if (i >= 0) {
        const platform = val.slice(0, i);
        const url = val.slice(i + 1);
        if (url) map[platform] = url;
      }
    }
  }
  return map;
}
