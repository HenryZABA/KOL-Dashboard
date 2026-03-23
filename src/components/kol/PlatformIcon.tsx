import { Youtube, Instagram, Facebook } from 'lucide-react';
import type { Platform } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.81a8.23 8.23 0 0 0 4.76 1.5V6.86a4.83 4.83 0 0 1-1-.17Z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const PLATFORM_ICONS: Record<Platform, React.FC<{ className?: string }>> = {
  youtube: ({ className }) => <Youtube className={cn('h-4 w-4', className)} />,
  tiktok: ({ className }) => <TikTokIcon className={cn('h-4 w-4', className)} />,
  instagram: ({ className }) => <Instagram className={cn('h-4 w-4', className)} />,
  x: ({ className }) => <XIcon className={cn('h-4 w-4', className)} />,
  facebook: ({ className }) => <Facebook className={cn('h-4 w-4', className)} />,
};

const PLATFORM_COLORS: Record<Platform, string> = {
  youtube: 'text-red-500',
  tiktok: 'text-foreground',
  instagram: 'text-pink-500',
  x: 'text-foreground',
  facebook: 'text-blue-600',
};

interface PlatformIconProps {
  platform: Platform;
  className?: string;
  showColor?: boolean;
}

export function PlatformIcon({ platform, className, showColor = true }: PlatformIconProps) {
  const IconComp = PLATFORM_ICONS[platform];
  return <IconComp className={cn(showColor && PLATFORM_COLORS[platform], className)} />;
}

interface PlatformIconsProps {
  platforms: Platform[];
  className?: string;
}

export function PlatformIcons({ platforms, className }: PlatformIconsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {platforms.map((p) => (
        <PlatformIcon key={p} platform={p} />
      ))}
    </div>
  );
}
