import type {
  DeleteImagePayload,
  DeleteImageResult,
  IpcResult,
  LibraryImage,
  LibrarySettings,
} from './shared/library';

declare global {
  interface Window {
    rune: {
      getBootstrap: () => Promise<{
        settings: LibrarySettings | null;
        defaultLibraryPath: string;
      }>;
      selectLibrary: (defaultPath: string) => Promise<string | null>;
      saveSettings: (
        settings: LibrarySettings,
      ) => Promise<IpcResult<LibrarySettings>>;
      importImages: () => Promise<IpcResult<LibraryImage[]>>;
      listImages: () => Promise<IpcResult<LibraryImage[]>>;
      deleteImage: (
        payload: DeleteImagePayload,
      ) => Promise<IpcResult<DeleteImageResult>>;
    };
  }
}

export {};
