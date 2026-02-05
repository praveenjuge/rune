import { app, BrowserWindow, dialog, ipcMain, protocol } from 'electron';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import {
  DEFAULT_LICENSE_KEY,
  IMAGE_EXTENSIONS,
  IPC_CHANNELS,
  RUNE_PROTOCOL,
  RUNE_PROTOCOL_HOST,
  type DeleteImagePayload,
  type DeleteImageResult,
  type IpcResult,
  type LibraryImage,
  type LibrarySettings,
  type SearchImagesInput,
  type SearchImagesResult,
  isSupportedImage,
  toRuneUrl,
} from './shared/library';
import {
  deleteImageById,
  getImageById,
  insertImages,
  searchImages,
} from './main/db';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

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
    titleBarStyle: isMac ? 'default' : 'hidden',
    titleBarOverlay: isWindows
      ? {
          color: '#ffffff',
          symbolColor: '#000000',
          height: 40,
        }
      : undefined,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
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

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

const SETTINGS_FILENAME = 'settings.json';
const getSettingsPath = () =>
  path.join(app.getPath('userData'), SETTINGS_FILENAME);

const normalizeLibraryPath = (libraryPath: string) =>
  path.normalize(libraryPath.trim());

const ensureLibraryDir = async (libraryPath: string) => {
  await fs.mkdir(libraryPath, { recursive: true });
};


const loadSettings = async (): Promise<LibrarySettings | null> => {
  try {
    const raw = await fs.readFile(getSettingsPath(), 'utf-8');
    const parsed = JSON.parse(raw) as LibrarySettings;
    if (
      !parsed ||
      typeof parsed.libraryPath !== 'string' ||
      typeof parsed.licenseKey !== 'string'
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    return null;
  }
};

const saveSettings = async (
  settings: LibrarySettings,
): Promise<LibrarySettings> => {
  const now = new Date().toISOString();
  const normalized: LibrarySettings = {
    libraryPath: normalizeLibraryPath(settings.libraryPath),
    licenseKey: settings.licenseKey.trim() || DEFAULT_LICENSE_KEY,
    createdAt: settings.createdAt ?? now,
    updatedAt: now,
  };

  await fs.mkdir(path.dirname(getSettingsPath()), { recursive: true });
  await fs.writeFile(
    getSettingsPath(),
    JSON.stringify(normalized, null, 2),
    'utf-8',
  );
  return normalized;
};

const validateSettingsInput = (settings: LibrarySettings): string | null => {
  if (!settings || typeof settings.libraryPath !== 'string') {
    return 'Library path is required.';
  }

  const normalizedPath = normalizeLibraryPath(settings.libraryPath);
  if (!normalizedPath) {
    return 'Library path is required.';
  }

  if (!path.isAbsolute(normalizedPath)) {
    return 'Library path must be absolute.';
  }

  if (typeof settings.licenseKey !== 'string' || !settings.licenseKey.trim()) {
    return 'License key is required.';
  }

  return null;
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
    };

    imported.push(record);
  }

  try {
    await insertImages(libraryPath, imported);
    return success(imported);
  } catch (error) {
    return failure('Unable to save images.');
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
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

  createWindow();

  ipcMain.handle(IPC_CHANNELS.getBootstrap, async () => {
    const settings = await loadSettings();
    const defaultLibraryPath = path.join(app.getPath('documents'), 'Rune');
    return { settings, defaultLibraryPath };
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
    async (_event, settings: LibrarySettings): Promise<IpcResult<LibrarySettings>> => {
      const error = validateSettingsInput(settings);
      if (error) {
        return failure(error);
      }

      const normalizedPath = normalizeLibraryPath(settings.libraryPath);

      try {
        await ensureLibraryDir(normalizedPath);
        const next = await saveSettings({
          ...settings,
          libraryPath: normalizedPath,
        });

        return success(next);
      } catch (saveError) {
        return failure('Unable to save settings.');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.importImages,
    async (): Promise<IpcResult<LibraryImage[]>> => {
      const settings = await loadSettings();
      if (!settings) {
        return failure('Library settings not found.');
      }

      return importImages(settings.libraryPath);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.searchImages,
    async (_event, payload: SearchImagesInput): Promise<IpcResult<SearchImagesResult>> => {
      const settings = await loadSettings();
      if (!settings) {
        return failure('Library settings not found.');
      }

      return searchImagesHandler(settings.libraryPath, payload);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.deleteImage,
    async (_event, payload: DeleteImagePayload): Promise<IpcResult<DeleteImageResult>> => {
      const settings = await loadSettings();
      if (!settings) {
        return failure('Library settings not found.');
      }

      return deleteImage(settings.libraryPath, payload);
    },
  );
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
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
