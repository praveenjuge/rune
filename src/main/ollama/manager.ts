import { app } from 'electron';
import { spawn, ChildProcess, execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fss, { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import {
  type OllamaStatus,
  type DownloadProgress,
  OLLAMA_MODEL,
} from '../../shared/library';

// Ollama version to download
const OLLAMA_VERSION = 'v0.15.4';

// Platform-specific Ollama download URLs (archives that need extraction)
const OLLAMA_RELEASES = {
  darwin: {
    x64: `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-darwin.tgz`,
    arm64: `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-darwin.tgz`,
  },
  win32: {
    x64: `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-windows-amd64.zip`,
    arm64: `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-windows-arm64.zip`,
  },
  linux: {
    x64: `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-linux-amd64.tar.zst`,
    arm64: `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-linux-arm64.tar.zst`,
  },
};

const OLLAMA_PORT = 11434;
const OLLAMA_HOST = `http://127.0.0.1:${OLLAMA_PORT}`;

class OllamaManager extends EventEmitter {
  private ollamaDir: string;
  private binaryPath: string;
  private serverProcess: ChildProcess | null = null;
  private isDownloadingBinary = false;
  private isDownloadingModel = false;
  private currentStatus: OllamaStatus = {
    binaryInstalled: false,
    modelInstalled: false,
    serverRunning: false,
    status: 'not-installed',
  };

  constructor() {
    super();
    this.ollamaDir = path.join(app.getPath('userData'), 'ollama');
    const ext = process.platform === 'win32' ? '.exe' : '';
    this.binaryPath = path.join(this.ollamaDir, `ollama${ext}`);
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
        modelInstalled = await this.isModelInstalled();
      }
    }

    let status: OllamaStatus['status'] = 'not-installed';
    if (this.isDownloadingBinary) {
      status = 'downloading-binary';
    } else if (this.isDownloadingModel) {
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
    try {
      await fs.access(this.binaryPath, fsConstants.X_OK);
      return true;
    } catch {
      return false;
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

  private async isModelInstalled(): Promise<boolean> {
    try {
      const response = await this.fetch(`${OLLAMA_HOST}/api/tags`, {
        method: 'GET',
        timeout: 5000,
      });
      if (!response.ok) return false;
      
      const data = await response.json() as { models?: Array<{ name: string }> };
      const models = data.models || [];
      return models.some((m) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL.split(':')[0]));
    } catch {
      return false;
    }
  }

  async downloadBinary(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (this.isDownloadingBinary) {
      throw new Error('Already downloading Ollama binary');
    }

    const platform = process.platform as keyof typeof OLLAMA_RELEASES;
    const arch = process.arch as 'x64' | 'arm64';

    const platformUrls = OLLAMA_RELEASES[platform];
    if (!platformUrls) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const url = platformUrls[arch];
    if (!url) {
      throw new Error(`Unsupported architecture: ${arch}`);
    }

    this.isDownloadingBinary = true;
    this.currentStatus.status = 'downloading-binary';

    // Ensure ollama directory exists
    await fs.mkdir(this.ollamaDir, { recursive: true });

    // Determine archive path based on URL
    const archiveExt = url.endsWith('.tgz') ? '.tgz' : url.endsWith('.zip') ? '.zip' : '.tar.zst';
    const archivePath = path.join(this.ollamaDir, `ollama${archiveExt}`);

    try {
      // Download the archive
      await this.downloadFile(url, archivePath, (downloaded, total) => {
        const progress: DownloadProgress = {
          type: 'ollama',
          percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
          downloaded,
          total,
          status: 'downloading',
        };
        onProgress?.(progress);
        this.emit('download-progress', progress);
      });

      // Extract the binary from the archive
      await this.extractBinary(archivePath, platform);

      // Clean up archive
      await fs.unlink(archivePath).catch(() => { /* ignore */ });

      // Make binary executable on Unix systems
      if (process.platform !== 'win32') {
        await fs.chmod(this.binaryPath, 0o755);
      }

      // Verify binary exists
      const exists = await this.isBinaryInstalled();
      if (!exists) {
        throw new Error('Binary extraction failed - file not found after extraction');
      }

      const completeProgress: DownloadProgress = {
        type: 'ollama',
        percent: 100,
        downloaded: 0,
        total: 0,
        status: 'complete',
      };
      onProgress?.(completeProgress);
      this.emit('download-progress', completeProgress);

      await this.checkStatus();
    } catch (error) {
      const errorProgress: DownloadProgress = {
        type: 'ollama',
        percent: 0,
        downloaded: 0,
        total: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      onProgress?.(errorProgress);
      this.emit('download-progress', errorProgress);
      throw error;
    } finally {
      this.isDownloadingBinary = false;
    }
  }

  private async extractBinary(archivePath: string, platform: string): Promise<void> {
    console.info('[ollama] Extracting from:', archivePath);
    
    if (platform === 'darwin') {
      // macOS: .tgz file - use tar command
      console.info('[ollama] Using tar to extract .tgz');
      try {
        execSync(`tar -xzf "${archivePath}" -C "${this.ollamaDir}"`, { stdio: 'pipe' });
        
        // List extracted contents for debugging
        const files = await fs.readdir(this.ollamaDir);
        console.info('[ollama] Extracted files:', files);
        
        // The ollama binary should be directly in the extracted contents
        // Check if it exists, if not look for it in subdirectories
        const binaryExists = await fs.access(this.binaryPath).then(() => true).catch(() => false);
        if (!binaryExists) {
          // Look for the binary in extracted directories
          for (const file of files) {
            const filePath = path.join(this.ollamaDir, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
              const subFiles = await fs.readdir(filePath);
              const ollamaBin = subFiles.find(f => f === 'ollama' || f === 'ollama.exe');
              if (ollamaBin) {
                const srcPath = path.join(filePath, ollamaBin);
                await fs.rename(srcPath, this.binaryPath);
                break;
              }
            } else if (file === 'ollama') {
              // Binary is directly extracted
              if (filePath !== this.binaryPath) {
                await fs.rename(filePath, this.binaryPath);
              }
              break;
            }
          }
        }
      } catch (error) {
        throw new Error(`Failed to extract archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (platform === 'win32') {
      try {
        execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${this.ollamaDir}' -Force"`, { stdio: 'pipe' });

        // Find and move the binary
        const files = await fs.readdir(this.ollamaDir);
        
        for (const file of files) {
          if (file.endsWith('.exe') && file.toLowerCase().includes('ollama')) {
            const srcPath = path.join(this.ollamaDir, file);
            if (srcPath !== this.binaryPath) {
              await fs.rename(srcPath, this.binaryPath);
            }
            break;
          }
        }
      } catch (error) {
        throw new Error(`Failed to extract archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      try {
        execSync(`tar --zstd -xf "${archivePath}" -C "${this.ollamaDir}"`, { stdio: 'pipe' });

        const files = await fs.readdir(this.ollamaDir);
        
        // Find the ollama binary
        for (const file of files) {
          const filePath = path.join(this.ollamaDir, file);
          const stat = await fs.stat(filePath);
          if (stat.isDirectory() && file.includes('ollama')) {
            const subFiles = await fs.readdir(filePath);
            const binDir = path.join(filePath, 'bin');
            if (await fs.access(binDir).then(() => true).catch(() => false)) {
              const binFiles = await fs.readdir(binDir);
              const ollamaBin = binFiles.find(f => f === 'ollama');
              if (ollamaBin) {
                await fs.rename(path.join(binDir, ollamaBin), this.binaryPath);
                break;
              }
            }
          } else if (file === 'ollama') {
            if (filePath !== this.binaryPath) {
              await fs.rename(filePath, this.binaryPath);
            }
            break;
          }
        }
      } catch (error) {
        throw new Error(`Failed to extract archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  async downloadModel(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (this.isDownloadingModel) {
      throw new Error('Already downloading model');
    }

    // Ensure server is running
    if (!(await this.isServerRunning())) {
      await this.startServer();
      // Wait for server to be ready
      await this.waitForServer();
    }

    this.isDownloadingModel = true;
    this.currentStatus.status = 'downloading-model';

    try {
      await this.pullModelWithProgress(onProgress);

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
    }
  }

  private pullModelWithProgress(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ name: OLLAMA_MODEL, stream: true });
      
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

  async deleteModel(): Promise<void> {
    // Start server if not running
    if (!(await this.isServerRunning())) {
      await this.startServer();
      await this.waitForServer();
    }

    return new Promise((resolve, reject) => {
      const modelData = JSON.stringify({ name: OLLAMA_MODEL });
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

  async deleteBinary(): Promise<void> {
    // Stop the server first if it's running
    if (this.serverProcess || (await this.isServerRunning())) {
      await this.stopServer();
    }

    // Delete the binary file
    try {
      await fs.unlink(this.binaryPath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'ENOENT') {
        throw new Error(`Failed to delete binary: ${nodeError.message}`);
      }
    }

    // Clean up any leftover archive files
    const extensions = ['.tgz', '.zip', '.tar.zst'];
    for (const ext of extensions) {
      const archivePath = path.join(this.ollamaDir, `ollama${ext}`);
      try {
        await fs.unlink(archivePath);
      } catch {
        // Ignore if file doesn't exist
      }
    }

    // Try to clean up the directory if it's empty (but don't force it)
    try {
      const files = await fs.readdir(this.ollamaDir);
      if (files.length === 0) {
        await fs.rmdir(this.ollamaDir);
      }
    } catch {
      // Ignore errors
    }

    await this.checkStatus();
  }

  async generateTags(imagePath: string): Promise<string> {
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
        model: OLLAMA_MODEL,
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

  private async downloadFile(
    url: string,
    destPath: string,
    onProgress: (downloaded: number, total: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const handleRedirect = (response: http.IncomingMessage, currentUrl: string) => {
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            this.downloadFile(redirectUrl, destPath, onProgress)
              .then(resolve)
              .catch(reject);
            return true;
          }
        }
        return false;
      };

      const makeRequest = (targetUrl: string) => {
        const protocol = targetUrl.startsWith('https') ? https : http;

        protocol.get(targetUrl, (response) => {
          if (handleRedirect(response, targetUrl)) return;

          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedSize = 0;

          const fileStream = fss.createWriteStream(destPath);

          response.on('data', (chunk: Buffer) => {
            downloadedSize += chunk.length;
            onProgress(downloadedSize, totalSize);
          });

          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            resolve();
          });

          fileStream.on('error', (error) => {
            fss.unlink(destPath, () => { /* ignore cleanup errors */ });
            reject(error);
          });

          response.on('error', (error) => {
            fss.unlink(destPath, () => { /* ignore cleanup errors */ });
            reject(error);
          });
        }).on('error', (error) => {
          reject(error);
        });
      };

      makeRequest(url);
    });
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
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const req = protocol.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname + urlObj.search,
          method: options.method || 'GET',
          headers: options.headers,
          timeout: options.timeout || 30000,
        },
        (res) => {
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
