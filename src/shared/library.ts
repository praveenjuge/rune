export const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".bmp",
  ".tiff",
];

export const RUNE_PROTOCOL = "rune";
export const RUNE_PROTOCOL_HOST = "local";
export const SEARCH_PAGE_SIZE = 200;
export const MIN_SQLITE_VERSION = "3.51.2";
export const OLLAMA_MODEL = "qwen3-vl:2b";

export type AiTagStatus = 'pending' | 'generating' | 'complete' | 'failed';

// Settings are stored in the database, so this type is simpler
export type LibrarySettings = {
  createdAt: string;
  updatedAt: string;
};

export type LibraryImage = {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  url: string;
  addedAt: string;
  bytes: number;
  aiTags: string | null;
  aiTagStatus: AiTagStatus;
};

export type DeleteImagePayload = {
  id: string;
};

export type DeleteImageResult = {
  id: string;
};

export type SearchCursor = {
  addedAt: string;
  id: string;
};

export type SearchImagesInput = {
  query: string;
  limit: number;
  cursor?: SearchCursor | null;
};

export type SearchImagesResult = {
  items: LibraryImage[];
  nextCursor: SearchCursor | null;
};

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Ollama types
export type OllamaStatusType = 
  | 'not-installed' 
  | 'downloading-binary' 
  | 'downloading-model' 
  | 'ready' 
  | 'running'
  | 'error';

export type OllamaStatus = {
  binaryInstalled: boolean;
  modelInstalled: boolean;
  serverRunning: boolean;
  status: OllamaStatusType;
  error?: string;
};

export type DownloadProgress = {
  type: 'ollama' | 'model';
  percent: number;
  downloaded: number;
  total: number;
  status: 'downloading' | 'complete' | 'error';
  error?: string;
};

export type TaggingQueueStatus = {
  isProcessing: boolean;
  pending: number;
  completed: number;
  failed: number;
  currentImageId: string | null;
};

export type ImageTagsUpdated = {
  id: string;
  aiTags: string | null;
  aiTagStatus: AiTagStatus;
};

export const IPC_CHANNELS = {
  getBootstrap: "rune:get-bootstrap",
  selectLibrary: "rune:select-library",
  saveSettings: "rune:save-settings",
  importImages: "rune:import-images",
  searchImages: "rune:search-images",
  deleteImage: "rune:delete-image",
  // Ollama channels
  getOllamaStatus: "rune:ollama-status",
  downloadOllama: "rune:download-ollama",
  downloadModel: "rune:download-model",
  // Tagging channels
  getTaggingQueueStatus: "rune:tagging-queue-status",
  retryTagging: "rune:retry-tagging",
} as const;

export const IPC_EVENTS = {
  ollamaDownloadProgress: "rune:ollama-download-progress",
  modelDownloadProgress: "rune:model-download-progress",
  taggingProgress: "rune:tagging-progress",
  imageTagsUpdated: "rune:image-tags-updated",
} as const;

export function isSupportedImage(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function toRuneUrl(filePath: string): string {
  const encoded = encodeURIComponent(filePath);
  return `${RUNE_PROTOCOL}://${RUNE_PROTOCOL_HOST}?path=${encoded}`;
}
