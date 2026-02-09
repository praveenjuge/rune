import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  IMAGE_EXTENSIONS,
  IPC_CHANNELS,
  IPC_EVENTS,
  RUNE_PROTOCOL,
  RUNE_PROTOCOL_HOST,
  AVAILABLE_VL_MODELS,
  type DeleteImagePayload,
  type DeleteImageResult,
  type DownloadProgress,
  type IpcResult,
  type LibraryImage,
  type LibrarySettings,
  type OllamaStatus,
  type SearchImagesInput,
  type SearchImagesResult,
  type TaggingQueueStatus,
  isSupportedImage,
  toRuneUrl,
} from './shared/library';
import {
  closeAllDatabases,
  deleteImageById,
  getImageById,
  insertImages,
  retryFailedTags,
  searchImages,
  loadSettings,
  saveSettings,
} from './main/db';
import { ollamaManager, taggingQueue } from './main/ollama';
import {
  initAutoUpdater,
  checkForUpdates,
  installUpdate,
  getUpdateStatus,
  getCurrentVersion,
} from './main/updater';

app.setName('Rune');

protocol.registerSchemesAsPrivileged([
  {
    scheme: RUNE_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const createWindow = () => {
  const isMac = process.platform === 'darwin';
  const isWindows = process.platform === 'win32';
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Rune',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools in development only.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Initialize auto-updater
  initAutoUpdater(mainWindow);

  return mainWindow;
};

const RUNE_FOLDER_NAME = 'Rune';

// Rune library is always at Documents/Rune - all data stored here
const getRuneLibraryPath = () =>
  path.join(app.getPath('documents'), RUNE_FOLDER_NAME);

const ensureLibraryDir = async (libraryPath: string) => {
  await fs.mkdir(libraryPath, { recursive: true });
};

const validateSearchInput = (payload: SearchImagesInput): string | null => {
  if (!payload || typeof payload.query !== 'string') {
    return 'Invalid search payload.';
  }

  if (typeof payload.limit !== 'number' || payload.limit <= 0) {
    return 'Invalid search limit.';
  }

  if (payload.cursor) {
    if (
      typeof payload.cursor.addedAt !== 'string' ||
      typeof payload.cursor.id !== 'string'
    ) {
      return 'Invalid search cursor.';
    }
  }

  return null;
};

const success = <T,>(data: T): IpcResult<T> => ({ ok: true, data });
const failure = (error: string): IpcResult<never> => ({ ok: false, error });

const searchImagesHandler = async (
  libraryPath: string,
  payload: SearchImagesInput,
): Promise<IpcResult<SearchImagesResult>> => {
  try {
    await ensureLibraryDir(libraryPath);
    const error = validateSearchInput(payload);
    if (error) {
      return failure(error);
    }
    const result = await searchImages(libraryPath, payload);
    return success(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to search library.';
    return failure(message);
  }
};

const isPathInside = (root: string, target: string) => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (process.platform === 'win32') {
    return resolvedTarget
      .toLowerCase()
      .startsWith(`${resolvedRoot.toLowerCase()}${path.sep}`);
  }
  return resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
};

const deleteImage = async (
  libraryPath: string,
  payload: DeleteImagePayload,
): Promise<IpcResult<DeleteImageResult>> => {
  if (!payload || typeof payload.id !== 'string') {
    return failure('Invalid image payload.');
  }

  let match: LibraryImage | null = null;
  try {
    match = await getImageById(libraryPath, payload.id);
  } catch (error) {
    return failure('Unable to delete image.');
  }
  if (!match) {
    return failure('Image not found.');
  }

  if (!isPathInside(libraryPath, match.filePath)) {
    return failure('Invalid image path.');
  }

  try {
    await fs.unlink(match.filePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      return failure('Unable to delete image.');
    }
  }

  try {
    await deleteImageById(libraryPath, payload.id);
  } catch (error) {
    return failure('Unable to delete image.');
  }

  return success({ id: payload.id });
};

const importImages = async (
  libraryPath: string,
): Promise<IpcResult<LibraryImage[]>> => {
  await ensureLibraryDir(libraryPath);
  const dialogResult = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      {
        name: 'Images',
        extensions: IMAGE_EXTENSIONS.map((ext) => ext.slice(1)),
      },
    ],
  });

  if (dialogResult.canceled) {
    return success([]);
  }

  const imported: LibraryImage[] = [];

  for (const filePath of dialogResult.filePaths) {
    if (!isSupportedImage(filePath)) continue;

    const ext = path.extname(filePath).toLowerCase();
    const storedName = `${randomUUID()}${ext}`;
    const destination = path.join(libraryPath, storedName);

    await fs.copyFile(filePath, destination);
    const stat = await fs.stat(destination);
    const now = new Date().toISOString();
    const record: LibraryImage = {
      id: randomUUID(),
      originalName: path.basename(filePath),
      storedName,
      filePath: destination,
      url: toRuneUrl(destination),
      addedAt: now,
      bytes: stat.size,
      aiTags: null,
      aiTagStatus: 'pending',
    };

    imported.push(record);
  }

  try {
    await insertImages(libraryPath, imported);

    // Enqueue new images for tagging
    if (imported.length > 0) {
      taggingQueue.enqueueNewImages(imported.map((img) => img.id));
    }

    return success(imported);
  } catch (error) {
    return failure('Unable to save images.');
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  protocol.registerFileProtocol(RUNE_PROTOCOL, (request, callback) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== RUNE_PROTOCOL_HOST) {
        callback({ error: -6 });
        return;
      }

      const encodedPath = url.searchParams.get('path');
      if (!encodedPath) {
        callback({ error: -6 });
        return;
      }

      const filePath = decodeURIComponent(encodedPath);
      callback({ path: filePath });
    } catch (error) {
      callback({ error: -6 });
    }
  });

  // Initialize Ollama manager
  await ollamaManager.initialize();

  // Set up Ollama event listeners
  ollamaManager.on('model-download-progress', (progress: DownloadProgress) => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      win.webContents.send(IPC_EVENTS.modelDownloadProgress, progress);
    }
  });

  // Register IPC handlers BEFORE creating the window to avoid race condition
  ipcMain.handle(IPC_CHANNELS.getBootstrap, async () => {
    const runeLibraryPath = getRuneLibraryPath();
    const settings = await loadSettings(runeLibraryPath);
    const ollamaStatus = await ollamaManager.checkStatus();

    // Create the Rune folder if it doesn't exist
    await ensureLibraryDir(runeLibraryPath);

    return { settings, defaultLibraryPath: runeLibraryPath, ollamaStatus };
  });

  ipcMain.handle(
    IPC_CHANNELS.selectLibrary,
    async (_event, defaultPath: string) => {
      const dialogResult = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        defaultPath,
      });

      if (dialogResult.canceled) {
        return null;
      }

      return dialogResult.filePaths[0] ?? null;
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.saveSettings,
    async (): Promise<IpcResult<LibrarySettings>> => {
      const runeLibraryPath = getRuneLibraryPath();

      try {
        await ensureLibraryDir(runeLibraryPath);
        console.info('[rune] Saving settings to:', runeLibraryPath);
        const saved = await saveSettings(runeLibraryPath);
        console.info('[rune] Settings saved successfully');

        // Update tagging queue library path
        taggingQueue.setLibraryPath(runeLibraryPath);

        return success(saved);
      } catch (saveError) {
        console.error('[rune] Failed to save settings:', saveError);
        const message = saveError instanceof Error ? saveError.message : 'Unable to save settings.';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.importImages,
    async (): Promise<IpcResult<LibraryImage[]>> => {
      const runeLibraryPath = getRuneLibraryPath();
      const settings = await loadSettings(runeLibraryPath);
      if (!settings) {
        return failure('Library settings not found.');
      }

      return importImages(runeLibraryPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.searchImages,
    async (_event, payload: SearchImagesInput): Promise<IpcResult<SearchImagesResult>> => {
      const runeLibraryPath = getRuneLibraryPath();
      const settings = await loadSettings(runeLibraryPath);
      if (!settings) {
        return failure('Library settings not found.');
      }

      return searchImagesHandler(runeLibraryPath, payload);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.deleteImage,
    async (_event, payload: DeleteImagePayload): Promise<IpcResult<DeleteImageResult>> => {
      const runeLibraryPath = getRuneLibraryPath();
      const settings = await loadSettings(runeLibraryPath);
      if (!settings) {
        return failure('Library settings not found.');
      }

      return deleteImage(runeLibraryPath, payload);
    },
  );

  // Ollama IPC handlers
  ipcMain.handle(
    IPC_CHANNELS.getOllamaStatus,
    async (): Promise<OllamaStatus> => {
      return ollamaManager.checkStatus();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.downloadModel,
    async (): Promise<IpcResult<void>> => {
      try {
        await ollamaManager.downloadModel();

        // Start tagging queue after model is installed
        const runeLibraryPath = getRuneLibraryPath();
        const settings = await loadSettings(runeLibraryPath);
        if (settings) {
          taggingQueue.setLibraryPath(runeLibraryPath);
          taggingQueue.start();
        }

        return success(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to download model';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.cancelModelDownload,
    async (): Promise<IpcResult<void>> => {
      try {
        ollamaManager.cancelModelDownload();
        return success(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cancel download';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.deleteOllamaModel,
    async (): Promise<IpcResult<void>> => {
      try {
        await ollamaManager.deleteModel();
        return success(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete model';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.getAvailableVlModels,
    async (): Promise<IpcResult<typeof AVAILABLE_VL_MODELS>> => {
      try {
        return success(AVAILABLE_VL_MODELS);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get available models';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.getCurrentModel,
    async (): Promise<IpcResult<string>> => {
      try {
        return success(ollamaManager.getCurrentModel());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get current model';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.setCurrentModel,
    async (_event, model: string): Promise<IpcResult<void>> => {
      try {
        ollamaManager.setCurrentModel(model);
        return success(undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to set current model';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.getInstalledModels,
    async (): Promise<IpcResult<string[]>> => {
      try {
        return success(await ollamaManager.listInstalledModels());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get installed models';
        return failure(message);
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.getTaggingQueueStatus,
    async (): Promise<TaggingQueueStatus> => {
      return taggingQueue.getStatus();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.retryTagging,
    async (_event, imageId: string): Promise<IpcResult<void>> => {
      const runeLibraryPath = getRuneLibraryPath();
      const settings = await loadSettings(runeLibraryPath);
      if (!settings) {
        return failure('Library settings not found.');
      }

      try {
        await retryFailedTags(runeLibraryPath, imageId);
        taggingQueue.retryImage(imageId);
        return success(undefined);
      } catch (error) {
        return failure('Failed to retry tagging.');
      }
    },
  );

  // Auto-update IPC handlers
  ipcMain.handle(IPC_CHANNELS.updateCheck, async () => {
    checkForUpdates();
  });

  ipcMain.handle(IPC_CHANNELS.updateInstall, async () => {
    installUpdate();
  });

  ipcMain.handle(IPC_CHANNELS.updateGetStatus, async () => {
    return getUpdateStatus();
  });

  ipcMain.handle(IPC_CHANNELS.updateGetVersion, async () => {
    return getCurrentVersion();
  });

  // Now create the window after all IPC handlers are registered
  createWindow();

  // Load settings and start tagging queue if model is installed
  const runeLibraryPath = getRuneLibraryPath();
  const settings = await loadSettings(runeLibraryPath);
  if (settings) {
    taggingQueue.setLibraryPath(runeLibraryPath);
    const status = await ollamaManager.checkStatus();
    if (status.binaryInstalled) {
      try {
        await ollamaManager.startServer();
        if (status.modelInstalled) {
          taggingQueue.start();
        }
      } catch (error) {
        console.error('[rune] Failed to start Ollama server:', error);
      }
    }
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Pause tagging queue
  taggingQueue.pause();

  // Stop Ollama server
  await ollamaManager.stopServer();

  // Close all database connections
  closeAllDatabases();
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
