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
  UpdateStatus,
  VlModelInfo,
} from './shared/library';

// Readonly array of VL models
type VlModelsArray = readonly VlModelInfo[];

declare global {
  interface Window {
    rune: {
      getBootstrap: () => Promise<{
        settings: LibrarySettings | null;
        defaultLibraryPath: string;
        ollamaStatus: OllamaStatus;
      }>;
      selectLibrary: (defaultPath: string) => Promise<string | null>;
      saveSettings: () => Promise<IpcResult<LibrarySettings>>;
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
      downloadModel: (model?: string) => Promise<IpcResult<void>>;
      cancelModelDownload: () => Promise<IpcResult<void>>;
      restartOllama: () => Promise<IpcResult<void>>;
      deleteOllamaModel: (model?: string) => Promise<IpcResult<void>>;
      deleteOllamaBinary: () => Promise<IpcResult<void>>;
      getAvailableVlModels: () => Promise<IpcResult<VlModelsArray>>;
      getCurrentModel: () => Promise<IpcResult<string>>;
      setCurrentModel: (model: string) => Promise<IpcResult<void>>;
      getInstalledModels: () => Promise<IpcResult<string[]>>;
      
      // Tagging APIs
      getTaggingQueueStatus: () => Promise<TaggingQueueStatus>;
      retryTagging: (imageId: string) => Promise<IpcResult<void>>;
      
      // Auto-update APIs
      checkForUpdates: () => Promise<void>;
      installUpdate: () => Promise<void>;
      getUpdateStatus: () => Promise<UpdateStatus>;
      getVersion: () => Promise<string>;
      
      // Event listeners (return unsubscribe functions)
      onOllamaDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
      onModelDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
      onImageTagsUpdated: (callback: (update: ImageTagsUpdated) => void) => () => void;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
    };
  }
}

export {};
