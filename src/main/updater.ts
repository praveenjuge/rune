import { app, autoUpdater, BrowserWindow } from 'electron';
import { IPC_EVENTS, type UpdateStatus } from '../shared/library';

const UPDATE_SERVER_URL = process.env.UPDATE_SERVER_URL || 'https://hazel-rho-vert.vercel.app';

let mainWindow: BrowserWindow | null = null;
let currentStatus: UpdateStatus = { state: 'idle' };

function sendStatusToRenderer(status: UpdateStatus) {
  currentStatus = status;
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    win.webContents.send(IPC_EVENTS.updateStatus, status);
  }
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Only run auto-updater in packaged app
  if (!app.isPackaged) {
    return;
  }

  // Only supported on macOS and Windows
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    return;
  }

  const feedURL = `${UPDATE_SERVER_URL}/update/${process.platform}/${app.getVersion()}`;

  try {
    autoUpdater.setFeedURL({ url: feedURL });
  } catch (error) {
    return;
  }

  // Event: checking-for-update
  autoUpdater.on('checking-for-update', () => {
    sendStatusToRenderer({ state: 'checking' });
  });

  // Event: update-available
  autoUpdater.on('update-available', () => {
    sendStatusToRenderer({ state: 'downloading' });
  });

  // Event: update-not-available
  autoUpdater.on('update-not-available', () => {
    sendStatusToRenderer({ state: 'not-available' });
  });

  // Event: update-downloaded
  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
    sendStatusToRenderer({
      state: 'downloaded',
      version: releaseName,
      releaseNotes: releaseNotes,
    });
  });

  // Event: error
  autoUpdater.on('error', (error) => {
    sendStatusToRenderer({
      state: 'error',
      error: error.message,
    });
  });

  // Check for updates on startup (after a short delay)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Check for updates every hour
  setInterval(() => {
    checkForUpdates();
  }, 60 * 60 * 1000);
}

export function checkForUpdates(): void {
  if (!app.isPackaged) {
    // In development, simulate the flow for testing UI
    sendStatusToRenderer({ state: 'checking' });
    setTimeout(() => {
      sendStatusToRenderer({ state: 'not-available' });
    }, 1000);
    return;
  }

  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    sendStatusToRenderer({
      state: 'error',
      error: error instanceof Error ? error.message : 'Failed to check for updates',
    });
  }
}

export function installUpdate(): void {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.quitAndInstall();
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

export function getCurrentVersion(): string {
  return app.getVersion();
}
