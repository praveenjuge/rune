import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import { PublisherGithub } from '@electron-forge/publisher-github';
import fs from 'node:fs';
import path from 'node:path';

// Copy native modules to the .vite/build directory
function copyNativeModules(buildPath: string) {
  const nativeModules = ['better-sqlite3'];

  for (const moduleName of nativeModules) {
    const srcDir = path.join(__dirname, 'node_modules', moduleName);
    const destDir = path.join(buildPath, 'node_modules', moduleName);

    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, destDir, { recursive: true });
      console.log(`Copied ${moduleName} to ${destDir}`);
    }
  }

  // Also copy bindings module (dependency of better-sqlite3)
  const bindingsModules = ['bindings', 'file-uri-to-path'];
  for (const moduleName of bindingsModules) {
    const srcDir = path.join(__dirname, 'node_modules', moduleName);
    const destDir = path.join(buildPath, 'node_modules', moduleName);

    if (fs.existsSync(srcDir)) {
      fs.cpSync(srcDir, destDir, { recursive: true });
      console.log(`Copied ${moduleName} to ${destDir}`);
    }
  }
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/node_modules/{better-sqlite3,bindings,file-uri-to-path}/**/*',
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: process.env.GITHUB_REPOSITORY_OWNER || 'praveenjuge',
        name: 'rune',
      },
      prerelease: false,
      draft: false,
    }),
  ],
  hooks: {
    packageAfterCopy: async (_config, buildPath) => {
      copyNativeModules(buildPath);
    },
  },
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: false,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
  ],
};

export default config;
