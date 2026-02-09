import { app } from 'electron';
import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import {
  type OllamaStatus,
  type DownloadProgress,
  DEFAULT_MODEL,
} from '../../shared/library';

const OLLAMA_PORT = 11434;
const OLLAMA_HOST = `http://127.0.0.1:${OLLAMA_PORT}`;

/**
 * Get the Ollama binary path.
 * In production: app.getAppPath()/../Resources/bin/ollama/ollama
 * In development: projectRoot/bin/ollama/ollama
 */
function getBinaryPath(): string {
  const ext = process.platform === 'win32' ? '.exe' : '';

  // Check if we're in production (packaged app)
  // In production, the binary is in the app's Resources directory
  if (app.isPackaged) {
    const resourcesPath = path.join(process.resourcesPath, 'bin', 'ollama', `ollama${ext}`);
    return resourcesPath;
  }

  // In development, use the bin/ollama directory in the project root
  const projectRoot = process.cwd();
  return path.join(projectRoot, 'bin', 'ollama', `ollama${ext}`);
}

class OllamaManager extends EventEmitter {
  private ollamaDir: string;
  private binaryPath: string;
  private serverProcess: ChildProcess | null = null;
  private isDownloadingModel = false;
  private modelDownloadAbortController: AbortController | null = null;
  private currentModel: string = DEFAULT_MODEL;
  private currentStatus: OllamaStatus = {
    binaryInstalled: false,
    modelInstalled: false,
    serverRunning: false,
    status: 'not-installed',
  };

  constructor() {
    super();
    this.ollamaDir = path.join(app.getPath('userData'), 'ollama');
    // Binary is bundled with the app, so it's always "installed"
    this.binaryPath = getBinaryPath();
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.ollamaDir, { recursive: true });
    await this.checkStatus();
  }

  async checkStatus(): Promise<OllamaStatus> {
    const binaryInstalled = await this.isBinaryInstalled();

    let modelInstalled = false;
    let serverRunning = false;

    if (binaryInstalled) {
      serverRunning = await this.isServerRunning();
      if (serverRunning) {
        modelInstalled = await this.isModelInstalled(this.currentModel);
      }
    }

    let status: OllamaStatus['status'] = 'not-installed';
    if (this.isDownloadingModel) {
      status = 'downloading-model';
    } else if (binaryInstalled && modelInstalled && serverRunning) {
      status = 'running';
    } else if (binaryInstalled && modelInstalled) {
      status = 'ready';
    } else if (binaryInstalled) {
      status = 'ready';
    }

    this.currentStatus = {
      binaryInstalled,
      modelInstalled,
      serverRunning,
      status,
    };

    return this.currentStatus;
  }

  getStatus(): OllamaStatus {
    return this.currentStatus;
  }

  private async isBinaryInstalled(): Promise<boolean> {
    // Binary is bundled with the app, so it's always installed
    try {
      await fs.access(this.binaryPath, fsConstants.X_OK);
      return true;
    } catch {
      // Fallback: check if binary exists at userData location for backward compatibility
      const legacyPath = path.join(this.ollamaDir, process.platform === 'win32' ? 'ollama.exe' : 'ollama');
      try {
        await fs.access(legacyPath, fsConstants.X_OK);
        this.binaryPath = legacyPath;
        return true;
      } catch {
        return false;
      }
    }
  }

  private async isServerRunning(): Promise<boolean> {
    try {
      const response = await this.fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        timeout: 2000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async isModelInstalled(model: string = this.currentModel): Promise<boolean> {
    try {
      const response = await this.fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        timeout: 5000,
      });
      if (!response.ok) return false;

      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = data.models || [];
      return models.some((m) => m.name === model || m.name.startsWith(model.split(':')[0]));
    } catch {
      return false;
    }
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setCurrentModel(model: string): void {
    this.currentModel = model;
  }

  async listInstalledModels(): Promise<string[]> {
    if (!(await this.isServerRunning())) {
      return [];
    }
    try {
      const response = await this.fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        timeout: 5000,
      });
      if (!response.ok) return [];

      const data = await response.json() as { models?: Array<{ name: string }> };
      return (data.models || []).map((m) => m.name);
    } catch {
      return [];
    }
  }

  async downloadModel(
    model?: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (this.isDownloadingModel) {
      throw new Error('Already downloading model');
    }

    const targetModel = model || this.currentModel;
    if (model) {
      this.currentModel = model;
    }

    // Ensure server is running
    if (!(await this.isServerRunning())) {
      await this.startServer();
      // Wait for server to be ready
      await this.waitForServer();
    }

    this.isDownloadingModel = true;
    this.currentStatus.status = 'downloading-model';
    this.modelDownloadAbortController = new AbortController();

    try {
      await this.pullModelWithProgress(targetModel, onProgress, this.modelDownloadAbortController.signal);

      const completeProgress: DownloadProgress = {
        type: 'model',
        percent: 100,
        downloaded: 0,
        total: 0,
        status: 'complete',
      };
      onProgress?.(completeProgress);
      this.emit('model-download-progress', completeProgress);

      await this.checkStatus();
    } catch (error) {
      const errorProgress: DownloadProgress = {
        type: 'model',
        percent: 0,
        downloaded: 0,
        total: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      onProgress?.(errorProgress);
      this.emit('model-download-progress', errorProgress);
      throw error;
    } finally {
      this.isDownloadingModel = false;
      this.modelDownloadAbortController = null;
    }
  }

  cancelModelDownload(): void {
    if (this.modelDownloadAbortController) {
      this.modelDownloadAbortController.abort();
      this.modelDownloadAbortController = null;
      this.isDownloadingModel = false;
    }
  }

  private pullModelWithProgress(
    model: string,
    onProgress?: (progress: DownloadProgress) => void,
    signal?: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ name: model, stream: true });

      // Handle abort signal
      if (signal) {
        if (signal.aborted) {
          reject(new Error('Download cancelled'));
          return;
        }
        signal.addEventListener('abort', () => {
          req.destroy();
          reject(new Error('Download cancelled'));
        });
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: OLLAMA_PORT,
          path: '/api/pull',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to pull model: ${res.statusCode}`));
            return;
          }

          let totalSize = 0;
          let downloadedSize = 0;
          let buffer = '';

          res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');

            // Keep incomplete line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                const data = JSON.parse(line) as {
                  status?: string;
                  total?: number;
                  completed?: number;
                  error?: string;
                };

                if (data.error) {
                  reject(new Error(data.error));
                  return;
                }

                if (data.total) {
                  totalSize = data.total;
                }
                if (data.completed !== undefined) {
                  downloadedSize = data.completed;
                }

                const progress: DownloadProgress = {
                  type: 'model',
                  percent: totalSize > 0 ? Math.round((downloadedSize / totalSize) * 100) : 0,
                  downloaded: downloadedSize,
                  total: totalSize,
                  status: 'downloading',
                };
                onProgress?.(progress);
                this.emit('model-download-progress', progress);
              } catch {
                // Skip invalid JSON lines
              }
            }
          });

          res.on('end', () => {
            resolve();
          });

          res.on('error', reject);
        }
      );

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  async startServer(): Promise<void> {
    if (this.serverProcess) {
      return;
    }

    if (!(await this.isBinaryInstalled())) {
      throw new Error('Ollama binary not installed');
    }

    this.serverProcess = spawn(this.binaryPath, ['serve'], {
      env: {
        ...process.env,
        OLLAMA_HOST: `127.0.0.1:${OLLAMA_PORT}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    this.serverProcess.stdout?.on('data', (data) => {
      console.info('[ollama]', data.toString().trim());
    });

    this.serverProcess.stderr?.on('data', (data) => {
      console.error('[ollama]', data.toString().trim());
    });

    this.serverProcess.on('close', (code) => {
      console.info(`[ollama] Server exited with code ${code}`);
      this.serverProcess = null;
      this.currentStatus.serverRunning = false;
    });

    this.serverProcess.on('error', (error) => {
      console.error('[ollama] Server error:', error);
      this.serverProcess = null;
      this.currentStatus.serverRunning = false;
    });

    await this.waitForServer();
    this.currentStatus.serverRunning = true;
  }

  private async waitForServer(maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isServerRunning()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Ollama server failed to start');
  }

  async stopServer(): Promise<void> {
    if (!this.serverProcess) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.serverProcess) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        if (this.serverProcess) {
          this.serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      this.serverProcess.once('close', () => {
        clearTimeout(timeout);
        this.serverProcess = null;
        this.currentStatus.serverRunning = false;
        resolve();
      });

      this.serverProcess.kill('SIGTERM');
    });
  }

  async restartServer(): Promise<void> {
    await this.stopServer();
    await this.startServer();
    await this.checkStatus();
  }

  async deleteModel(model?: string): Promise<void> {
    const targetModel = model || this.currentModel;

    // Start server if not running
    if (!(await this.isServerRunning())) {
      await this.startServer();
      await this.waitForServer();
    }

    return new Promise((resolve, reject) => {
      const modelData = JSON.stringify({ name: targetModel });
      const urlObj = new URL(`${OLLAMA_HOST}/api/delete`);

      const req = http.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || 11434,
          path: urlObj.pathname,
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(modelData),
          },
          timeout: 30000,
        },
        (res: any) => {
          let body = '';
          res.on('data', (chunk: any) => { body += chunk; });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              this.checkStatus().then(() => resolve());
            } else {
              reject(new Error(`Failed to delete model: ${res.statusCode} ${res.statusMessage}`));
            }
          });
        }
      );

      req.on('error', (err: Error) => {
        console.error('[ollama] Delete request error:', err);
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Delete request timeout'));
      });

      req.write(modelData);
      req.end();
    });
  }

  async generateTags(imagePath: string, model?: string): Promise<string> {
    const targetModel = model || this.currentModel;

    if (!(await this.isServerRunning())) {
      await this.startServer();
      await this.waitForServer();
    }

    // Read image and convert to base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await this.fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        prompt: 'Describe this image in 5-10 keyword tags, comma separated. Only output the tags, nothing else. Be concise and specific.',
        images: [base64Image],
        stream: false,
      }),
      timeout: 60000, // 60 second timeout for generation
    });

    if (!response.ok) {
      throw new Error(`Failed to generate tags: ${response.statusText}`);
    }

    const data = await response.json() as { response?: string; error?: string };
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Clean up the response - remove any extra whitespace and normalize
    const tags = (data.response || '')
      .trim()
      .replace(/\n/g, ', ')
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/^,\s*/, '')
      .replace(/,\s*$/, '');

    return tags;
  }

  private fetch(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    } = {}
  ): Promise<{
    ok: boolean;
    statusText: string;
    json: () => Promise<unknown>;
    body: AsyncIterable<Buffer> | null;
  }> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);

      const req = http.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: options.method || 'GET',
          headers: options.headers,
          timeout: options.timeout || 30000,
        },
        (res: any) => {
          const chunks: Buffer[] = [];

          res.on('data', (chunk: Buffer) => chunks.push(chunk));

          res.on('end', () => {
            const body = Buffer.concat(chunks);
            resolve({
              ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 300 : false,
              statusText: res.statusMessage || '',
              json: () => Promise.resolve(JSON.parse(body.toString())),
              body: options.method === 'POST' && options.body?.includes('stream')
                ? (async function* () { yield body; })()
                : null,
            });
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }
}

export const ollamaManager = new OllamaManager();
