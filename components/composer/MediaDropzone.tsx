'use client';

import { useCallback, useRef, useState } from 'react';

interface MediaDropzoneProps {
  disabled?: boolean;
  onFiles: (files: FileList | File[]) => void;
  hasImages: boolean;
}

export function MediaDropzone({ disabled, onFiles, hasImages }: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
    },
    [disabled, onFiles]
  );

  return (
    <div
      className={`composer-dropzone${dragOver ? ' composer-dropzone--active' : ''}${hasImages ? ' composer-dropzone--compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      aria-label="Upload images"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <span className="composer-dropzone-icon" aria-hidden>
        🖼
      </span>
      <span className="composer-dropzone-text">
        {dragOver ? 'Drop images here' : 'Drag & drop images, or click to browse'}
      </span>
      <span className="composer-dropzone-hint">JPEG, PNG, WebP, GIF · up to 5MB each</span>
    </div>
  );
}
