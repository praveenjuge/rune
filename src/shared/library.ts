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
export const MIN_SQLITE_VERSION = "3.46.0";
export const DEFAULT_OLLAMA_MODEL = "qwen3-vl:2b";

export const AVAILABLE_VL_MODELS = [
  {
    name: "qwen3-vl:2b",
    displayName: "Qwen3-VL 2B",
    description: "Latest VL model with excellent OCR and reasoning.",
    size: "~1.5GB",
    recommended: true,
  },
  {
    name: "qwen3-vl:4b",
    displayName: "Qwen3-VL 4B",
    description: "Higher quality version of Qwen3.",
    size: "~3GB",
    recommended: false,
  },
  {
    name: "ministral-3:3b",
    displayName: "Ministral 3 3B",
    description: "Fast and efficient for edge deployment.",
    size: "~2GB",
    recommended: false,
  },
  {
    name: "gemma3:4b",
    displayName: "Gemma 3 4B",
    description: "Google's capable vision model.",
    size: "~3GB",
    recommended: false,
  },
  {
    name: "llava:7b",
    displayName: "LLaVA 7B",
    description: "Classic reliable model for image understanding.",
    size: "~4.0GB",
    recommended: false,
  },
  {
    name: "deepseek-ocr:3b",
    displayName: "DeepSeek-OCR 3B",
    description: "Specialized for OCR on text-heavy images.",
    size: "~2GB",
    recommended: false,
  },
] as const;

export type VlModelInfo = typeof AVAILABLE_VL_MODELS[number];

export const DEFAULT_MODEL = DEFAULT_OLLAMA_MODEL;

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

// Auto-update types
export type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'not-available';

export type UpdateStatus = {
  state: UpdateState;
  version?: string;
  error?: string;
  releaseNotes?: string;
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
  cancelModelDownload: "rune:cancel-model-download",
  restartOllama: "rune:restart-ollama",
  deleteOllamaModel: "rune:delete-ollama-model",
  deleteOllamaBinary: "rune:delete-ollama-binary",
  getAvailableVlModels: "rune:get-available-vl-models",
  getCurrentModel: "rune:get-current-model",
  setCurrentModel: "rune:set-current-model",
  getInstalledModels: "rune:get-installed-models",
  // Tagging channels
  getTaggingQueueStatus: "rune:tagging-queue-status",
  retryTagging: "rune:retry-tagging",
  // Auto-update channels
  updateCheck: "rune:update-check",
  updateInstall: "rune:update-install",
  updateGetStatus: "rune:update-get-status",
  updateGetVersion: "rune:update-get-version",
} as const;

export const IPC_EVENTS = {
  ollamaDownloadProgress: "rune:ollama-download-progress",
  modelDownloadProgress: "rune:model-download-progress",
  taggingProgress: "rune:tagging-progress",
  imageTagsUpdated: "rune:image-tags-updated",
  updateStatus: "rune:update-status",
} as const;

export function isSupportedImage(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function toRuneUrl(filePath: string): string {
  const encoded = encodeURIComponent(filePath);
  return `${RUNE_PROTOCOL}://${RUNE_PROTOCOL_HOST}?path=${encoded}`;
}
