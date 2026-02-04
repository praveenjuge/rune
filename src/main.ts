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
  isSupportedImage,
  toRuneUrl,
} from './shared/library';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

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
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    titleBarOverlay: isWindows
      ? {
          color: '#ffffff',
          symbolColor: '#000000',
          height: 40,
        }
      : undefined,
    backgroundColor: isMac ? '#00000000' : '#ffffff',
    transparent: isMac,
    vibrancy: isMac ? 'sidebar' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
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
const INDEX_FILENAME = 'library.json';

type LibraryIndex = {
  version: 1;
  images: LibraryImage[];
};

const getSettingsPath = () =>
  path.join(app.getPath('userData'), SETTINGS_FILENAME);

const getIndexPath = (libraryPath: string) =>
  path.join(libraryPath, INDEX_FILENAME);

const normalizeLibraryPath = (libraryPath: string) =>
  path.normalize(libraryPath.trim());

const toLibraryUrl = (filePath: string) => toRuneUrl(filePath);

const ensureLibraryDir = async (libraryPath: string) => {
  await fs.mkdir(libraryPath, { recursive: true });
};

const hydrateImage = (image: LibraryImage): LibraryImage => ({
  ...image,
  url: toLibraryUrl(image.filePath),
});

const isValidImageRecord = (image: LibraryImage) =>
  Boolean(
    image &&
      typeof image.id === 'string' &&
      typeof image.originalName === 'string' &&
      typeof image.storedName === 'string' &&
      typeof image.filePath === 'string' &&
      typeof image.addedAt === 'string' &&
      typeof image.bytes === 'number',
  );

const rebuildIndex = async (libraryPath: string): Promise<LibraryIndex> => {
  try {
    const entries = await fs.readdir(libraryPath, { withFileTypes: true });
    const images: LibraryImage[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!isSupportedImage(entry.name)) continue;

      const filePath = path.join(libraryPath, entry.name);
      const stat = await fs.stat(filePath);
      const addedAt = (stat.birthtime ?? stat.mtime).toISOString();

      images.push({
        id: randomUUID(),
        originalName: entry.name,
        storedName: entry.name,
        filePath,
        url: toLibraryUrl(filePath),
        addedAt,
        bytes: stat.size,
      });
    }

    return { version: 1, images };
  } catch (error) {
    return { version: 1, images: [] };
  }
};

const readIndex = async (libraryPath: string): Promise<LibraryIndex> => {
  const indexPath = getIndexPath(libraryPath);
  try {
    const raw = await fs.readFile(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as LibraryIndex;
    if (!parsed || !Array.isArray(parsed.images)) {
      throw new Error('Invalid index shape');
    }

    return {
      version: 1,
      images: parsed.images.filter(isValidImageRecord).map(hydrateImage),
    };
  } catch (error) {
    const rebuilt = await rebuildIndex(libraryPath);
    await writeIndex(libraryPath, rebuilt);
    return rebuilt;
  }
};

const writeIndex = async (libraryPath: string, index: LibraryIndex) => {
  const indexPath = getIndexPath(libraryPath);
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
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

const success = <T,>(data: T): IpcResult<T> => ({ ok: true, data });
const failure = (error: string): IpcResult<never> => ({ ok: false, error });

const listImages = async (
  libraryPath: string,
): Promise<IpcResult<LibraryImage[]>> => {
  try {
    await ensureLibraryDir(libraryPath);
    const index = await readIndex(libraryPath);
    const sorted = [...index.images].sort((a, b) =>
      b.addedAt.localeCompare(a.addedAt),
    );
    return success(sorted);
  } catch (error) {
    return failure('Unable to read library index.');
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

  const index = await readIndex(libraryPath);
  const match = index.images.find((image) => image.id === payload.id);
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

  const nextIndex: LibraryIndex = {
    version: 1,
    images: index.images.filter((image) => image.id !== payload.id),
  };
  await writeIndex(libraryPath, nextIndex);

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

  const index = await readIndex(libraryPath);
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
      url: toLibraryUrl(destination),
      addedAt: now,
      bytes: stat.size,
    };

    imported.push(record);
    index.images.push(record);
  }

  await writeIndex(libraryPath, index);
  return success(imported);
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
    const defaultLibraryPath = path.join(app.getPath('documents'), 'rune');
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

        const indexPath = getIndexPath(normalizedPath);
        try {
          await fs.access(indexPath);
        } catch (indexError) {
          await writeIndex(normalizedPath, { version: 1, images: [] });
        }

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
    IPC_CHANNELS.listImages,
    async (): Promise<IpcResult<LibraryImage[]>> => {
      const settings = await loadSettings();
      if (!settings) {
        return failure('Library settings not found.');
      }

      return listImages(settings.libraryPath);
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
