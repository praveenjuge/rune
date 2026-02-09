const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { mkdir, stat, chmod } = require('fs/promises');

const OLLAMA_VERSION = 'v0.15.4';
const OLLAMA_URL = `https://github.com/ollama/ollama/releases/download/${OLLAMA_VERSION}/ollama-darwin.tgz`;

const BINARY_DIR = path.join(process.cwd(), 'bin', 'ollama');
const BINARY_PATH = path.join(BINARY_DIR, 'ollama');

function downloadFile(url, destPath) {
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

      const fileStream = fs.createWriteStream(destPath);
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

async function main() {
  console.log('Downloading Ollama binary from:', OLLAMA_URL);

  await mkdir(BINARY_DIR, { recursive: true });
  console.log('Created directory:', BINARY_DIR);

  const archivePath = path.join(BINARY_DIR, 'ollama-darwin.tgz');
  console.log('Downloading to:', archivePath);
  await downloadFile(OLLAMA_URL, archivePath);
  console.log('Download complete.');

  console.log('Extracting archive...');
  execFileSync('tar', ['-xzf', archivePath, '-C', BINARY_DIR], { stdio: 'inherit' });
  console.log('Extraction complete.');

  fs.unlinkSync(archivePath);
  console.log('Removed archive file.');

  try {
    await stat(BINARY_PATH);
    await chmod(BINARY_PATH, 0o755);
    console.log('Binary is executable:', BINARY_PATH);
  } catch {
    throw new Error(`Binary not found at ${BINARY_PATH}. Extraction may have failed.`);
  }

  console.log('Ollama binary downloaded successfully!');
  console.log('Path:', BINARY_PATH);
}

main().catch((error) => {
  console.error('Error downloading Ollama binary:', error);
  process.exit(1);
});
