import { app, autoUpdater, BrowserWindow } from 'electron';
import { IPC_EVENTS, type UpdateStatus } from '../shared/library';

// TODO: Replace with your actual Hazel deployment URL
// Deploy Hazel to Vercel: https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fvercel%2Fhazel
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
    console.log('[updater] Auto-updater disabled in development mode');
    return;
  }

  // Only supported on macOS and Windows
  if (process.platform !== 'darwin' && process.platform !== 'win32') {
    console.log('[updater] Auto-updater not supported on this platform');
    return;
  }

  const feedURL = `${UPDATE_SERVER_URL}/update/${process.platform}/${app.getVersion()}`;
  console.log('[updater] Setting feed URL:', feedURL);

  try {
    autoUpdater.setFeedURL({ url: feedURL });
  } catch (error) {
    console.error('[updater] Failed to set feed URL:', error);
    return;
  }

  // Event: checking-for-update
  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for updates...');
    sendStatusToRenderer({ state: 'checking' });
  });

  // Event: update-available
  autoUpdater.on('update-available', () => {
    console.log('[updater] Update available, downloading...');
    sendStatusToRenderer({ state: 'downloading' });
  });

  // Event: update-not-available
  autoUpdater.on('update-not-available', () => {
    console.log('[updater] No update available');
    sendStatusToRenderer({ state: 'not-available' });
  });

  // Event: update-downloaded
  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
    console.log('[updater] Update downloaded:', releaseName);
    sendStatusToRenderer({
      state: 'downloaded',
      version: releaseName,
      releaseNotes: releaseNotes,
    });
  });

  // Event: error
  autoUpdater.on('error', (error) => {
    console.error('[updater] Error:', error.message);
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
    console.log('[updater] Skipping update check in development');
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
    console.error('[updater] Failed to check for updates:', error);
    sendStatusToRenderer({
      state: 'error',
      error: error instanceof Error ? error.message : 'Failed to check for updates',
    });
  }
}

export function installUpdate(): void {
  if (!app.isPackaged) {
    console.log('[updater] Cannot install update in development');
    return;
  }

  console.log('[updater] Quitting and installing update...');
  autoUpdater.quitAndInstall();
}

export function getUpdateStatus(): UpdateStatus {
  return currentStatus;
}

export function getCurrentVersion(): string {
  return app.getVersion();
}
