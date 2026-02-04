import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type DeleteImagePayload,
  type LibrarySettings,
} from './shared/library';

contextBridge.exposeInMainWorld('rune', {
  getBootstrap: () => ipcRenderer.invoke(IPC_CHANNELS.getBootstrap),
  selectLibrary: (defaultPath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.selectLibrary, defaultPath),
  saveSettings: (settings: LibrarySettings) =>
    ipcRenderer.invoke(IPC_CHANNELS.saveSettings, settings),
  importImages: () => ipcRenderer.invoke(IPC_CHANNELS.importImages),
  listImages: () => ipcRenderer.invoke(IPC_CHANNELS.listImages),
  deleteImage: (payload: DeleteImagePayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteImage, payload),
});
