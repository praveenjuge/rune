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

export const DEFAULT_LICENSE_KEY = "0000";
export const RUNE_PROTOCOL = "rune";
export const RUNE_PROTOCOL_HOST = "local";
export const SEARCH_PAGE_SIZE = 200;
export const MIN_SQLITE_VERSION = "3.51.2";

export type LibrarySettings = {
  libraryPath: string;
  licenseKey: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LibraryImage = {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  url: string;
  addedAt: string;
  bytes: number;
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

export const IPC_CHANNELS = {
  getBootstrap: "rune:get-bootstrap",
  selectLibrary: "rune:select-library",
  saveSettings: "rune:save-settings",
  importImages: "rune:import-images",
  searchImages: "rune:search-images",
  deleteImage: "rune:delete-image",
} as const;

export function isSupportedImage(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function toRuneUrl(filePath: string): string {
  const encoded = encodeURIComponent(filePath);
  return `${RUNE_PROTOCOL}://${RUNE_PROTOCOL_HOST}?path=${encoded}`;
}
