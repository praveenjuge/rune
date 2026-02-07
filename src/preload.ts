import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  IPC_EVENTS,
  type DeleteImagePayload,
  type SearchImagesInput,
  type DownloadProgress,
  type ImageTagsUpdated,
  type UpdateStatus,
} from './shared/library';

contextBridge.exposeInMainWorld('rune', {
  getBootstrap: () => ipcRenderer.invoke(IPC_CHANNELS.getBootstrap),
  selectLibrary: (defaultPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.selectLibrary, defaultPath),
  saveSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.saveSettings),
  importImages: () => ipcRenderer.invoke(IPC_CHANNELS.importImages),
  searchImages: (payload: SearchImagesInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.searchImages, payload),
  deleteImage: (payload: DeleteImagePayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteImage, payload),
  
  // Ollama APIs
  getOllamaStatus: () => ipcRenderer.invoke(IPC_CHANNELS.getOllamaStatus),
  downloadOllama: () => ipcRenderer.invoke(IPC_CHANNELS.downloadOllama),
  downloadModel: (model?: string) => ipcRenderer.invoke(IPC_CHANNELS.downloadModel, model),
  cancelModelDownload: () => ipcRenderer.invoke(IPC_CHANNELS.cancelModelDownload),
  restartOllama: () => ipcRenderer.invoke(IPC_CHANNELS.restartOllama),
  deleteOllamaModel: (model?: string) => ipcRenderer.invoke(IPC_CHANNELS.deleteOllamaModel, model),
  deleteOllamaBinary: () => ipcRenderer.invoke(IPC_CHANNELS.deleteOllamaBinary),
  getAvailableVlModels: () => ipcRenderer.invoke(IPC_CHANNELS.getAvailableVlModels),
  getCurrentModel: () => ipcRenderer.invoke(IPC_CHANNELS.getCurrentModel),
  setCurrentModel: (model: string) => ipcRenderer.invoke(IPC_CHANNELS.setCurrentModel, model),
  getInstalledModels: () => ipcRenderer.invoke(IPC_CHANNELS.getInstalledModels),
  
  // Tagging APIs
  getTaggingQueueStatus: () => ipcRenderer.invoke(IPC_CHANNELS.getTaggingQueueStatus),
  retryTagging: (imageId: string) => ipcRenderer.invoke(IPC_CHANNELS.retryTagging, imageId),
  
  // Auto-update APIs
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.updateCheck),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.updateInstall),
  getUpdateStatus: () => ipcRenderer.invoke(IPC_CHANNELS.updateGetStatus),
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.updateGetVersion),
  
  // Event listeners
  onOllamaDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on(IPC_EVENTS.ollamaDownloadProgress, listener);
    return () => ipcRenderer.removeListener(IPC_EVENTS.ollamaDownloadProgress, listener);
  },
  onModelDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on(IPC_EVENTS.modelDownloadProgress, listener);
    return () => ipcRenderer.removeListener(IPC_EVENTS.modelDownloadProgress, listener);
  },
  onImageTagsUpdated: (callback: (update: ImageTagsUpdated) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, update: ImageTagsUpdated) => callback(update);
    ipcRenderer.on(IPC_EVENTS.imageTagsUpdated, listener);
    return () => ipcRenderer.removeListener(IPC_EVENTS.imageTagsUpdated, listener);
  },
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
    ipcRenderer.on(IPC_EVENTS.updateStatus, listener);
    return () => ipcRenderer.removeListener(IPC_EVENTS.updateStatus, listener);
  },
});
