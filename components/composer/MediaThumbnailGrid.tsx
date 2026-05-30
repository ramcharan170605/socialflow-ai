'use client';

import type { ComposerMediaItem } from '@/hooks/useComposerMedia';

interface MediaThumbnailGridProps {
  items: ComposerMediaItem[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function MediaThumbnailGrid({ items, onRemove, disabled }: MediaThumbnailGridProps) {
  if (!items.length) return null;

  return (
    <div className="composer-thumbnails" aria-label="Attached images">
      {items.map((item) => (
        <div key={item.id} className="composer-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.previewUrl} alt={item.file.name} className="composer-thumb-img" />
          <button
            type="button"
            className="composer-thumb-remove"
            onClick={() => onRemove(item.id)}
            disabled={disabled}
            aria-label={`Remove ${item.file.name}`}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
