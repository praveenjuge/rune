const { spawnSync } = require('node:child_process');

const electronBinary = process.platform === 'win32' ? 'electron.cmd' : 'electron';

const result = spawnSync(
  electronBinary,
  ['--test', '--import', 'tsx', 'src/main/db.test.ts'],
  {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  },
);

process.exit(result.status ?? 1);
