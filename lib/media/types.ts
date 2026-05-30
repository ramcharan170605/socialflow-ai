export interface MediaAsset {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  /** Browser-accessible URL (via nginx / app). */
  url: string;
  /** URL reachable from n8n container on Docker network. */
  internalUrl: string;
}

export interface StoredMediaRecord extends MediaAsset {
  userId: string;
  storagePath: string;
}
