import type {
  DeleteImagePayload,
  DeleteImageResult,
  DownloadProgress,
  ImageTagsUpdated,
  IpcResult,
  LibraryImage,
  LibrarySettings,
  OllamaStatus,
  SearchImagesInput,
  SearchImagesResult,
  TaggingQueueStatus,
} from './shared/library';

declare global {
  interface Window {
    rune: {
      getBootstrap: () => Promise<{
        settings: LibrarySettings | null;
        defaultLibraryPath: string;
        ollamaStatus: OllamaStatus;
      }>;
      selectLibrary: (defaultPath: string) => Promise<string | null>;
      saveSettings: (
        settings: LibrarySettings,
      ) => Promise<IpcResult<LibrarySettings>>;
      importImages: () => Promise<IpcResult<LibraryImage[]>>;
      searchImages: (
        payload: SearchImagesInput,
      ) => Promise<IpcResult<SearchImagesResult>>;
      deleteImage: (
        payload: DeleteImagePayload,
      ) => Promise<IpcResult<DeleteImageResult>>;
      
      // Ollama APIs
      getOllamaStatus: () => Promise<OllamaStatus>;
      downloadOllama: () => Promise<IpcResult<void>>;
      downloadModel: () => Promise<IpcResult<void>>;
      
      // Tagging APIs
      getTaggingQueueStatus: () => Promise<TaggingQueueStatus>;
      retryTagging: (imageId: string) => Promise<IpcResult<void>>;
      
      // Event listeners (return unsubscribe functions)
      onOllamaDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
      onModelDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
      onImageTagsUpdated: (callback: (update: ImageTagsUpdated) => void) => () => void;
    };
  }
}

export {};
