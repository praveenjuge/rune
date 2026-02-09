import { execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, stat, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import https from 'node:https';

// Ollama version to download
const OLLAMA_VERSION = 'v0.15.4';
const OLLAMA_URL = `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-darwin.tgz`;

// Binary destination path
const BINARY_DIR = join(process.cwd(), 'bin', 'ollama');
const BINARY_PATH = join(BINARY_DIR, 'ollama');

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', reject);
      response.on('error', reject);
    }).on('error', reject);
  });
}

function extractTgz(archivePath: string, destDir: string): void {
  execFileSync('tar', ['-xzf', archivePath, '-C', destDir], { stdio: 'inherit' });
}

async function main() {
  console.info('Downloading Ollama binary from:', OLLAMA_URL);

  // Create bin/ollama directory
  await mkdir(BINARY_DIR, { recursive: true });
  console.info('Created directory:', BINARY_DIR);

  // Download the archive
  const archivePath = join(BINARY_DIR, 'ollama-darwin.tgz');
  console.info('Downloading to:', archivePath);
  await downloadFile(OLLAMA_URL, archivePath);
  console.info('Download complete.');

  // Extract the archive
  console.info('Extracting archive...');
  extractTgz(archivePath, BINARY_DIR);
  console.info('Extraction complete.');

  // Clean up archive
  try {
    await stat(archivePath);
    execFileSync('rm', [archivePath], { stdio: 'inherit' });
    console.info('Removed archive file.');
  } catch {
    // Archive doesn't exist, ignore
  }

  // Verify binary exists and make it executable
  try {
    await stat(BINARY_PATH);
    await chmod(BINARY_PATH, 0o755);
    console.info('Binary is executable:', BINARY_PATH);
  } catch {
    throw new Error(`Binary not found at ${BINARY_PATH}. Extraction may have failed.`);
  }

  console.info('Ollama binary downloaded successfully!');
  console.info('Path:', BINARY_PATH);
}

main().catch((error) => {
  console.error('Error downloading Ollama binary:', error);
  process.exit(1);
});
