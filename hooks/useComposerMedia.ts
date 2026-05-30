'use client';

import { useCallback, useEffect, useState } from 'react';
import { validateImageBatch } from '@/lib/media/validate';
import { MAX_IMAGES_PER_POST } from '@/lib/media/constants';

export interface ComposerMediaItem {
  id: string;
  file: File;
  previewUrl: string;
}

export function useComposerMedia() {
  const [items, setItems] = useState<ComposerMediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      if (!files.length) return;

      const combined = [...items.map((i) => i.file), ...files];
      const check = validateImageBatch(
        combined.map((f) => ({ name: f.name, type: f.type, size: f.size }))
      );
      if (!check.ok) {
        setError(check.error ?? 'Invalid image');
        return;
      }

      const remaining = MAX_IMAGES_PER_POST - items.length;
      const toAdd = files.slice(0, remaining);
      if (files.length > remaining) {
        setError(`Only ${MAX_IMAGES_PER_POST} images allowed — extra files skipped.`);
      } else {
        setError(null);
      }

      const newItems: ComposerMediaItem[] = toAdd.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setItems((prev) => [...prev, ...newItems]);
    },
    [items]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
    setError(null);
  }, []);

  const clearAll = useCallback(() => {
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    setError(null);
  }, [items]);

  useEffect(() => {
    return () => {
      items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    };
  }, [items]);

  return { items, error, addFiles, removeItem, clearAll, setError };
}
