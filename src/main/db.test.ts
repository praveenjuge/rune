import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  closeAllDatabases,
  deleteImageById,
  insertImages,
  searchImages,
} from './db';

const makeImage = (
  id: string,
  name: string,
  addedAt: string,
): {
  id: string;
  originalName: string;
  storedName: string;
  filePath: string;
  url: string;
  addedAt: string;
  bytes: number;
} => ({
  id,
  originalName: name,
  storedName: `${id}.jpg`,
  filePath: path.join('/tmp', `${id}.jpg`),
  url: `rune://local?path=${encodeURIComponent(path.join('/tmp', `${id}.jpg`))}`,
  addedAt,
  bytes: 1024,
});

let libraryPath = '';

before(async () => {
  libraryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'rune-db-'));
});

after(() => {
  closeAllDatabases();
});

test('searchImages returns FTS prefix matches', async () => {
  const images = [
    makeImage('1', 'sunrise.jpg', '2025-01-01T00:00:00.000Z'),
    makeImage('2', 'sunset.png', '2025-01-02T00:00:00.000Z'),
    makeImage('3', 'mountain.png', '2025-01-03T00:00:00.000Z'),
  ];
  await insertImages(libraryPath, images);

  const result = await searchImages(libraryPath, {
    query: 'sun',
    limit: 10,
    cursor: null,
  });

  const names = result.items.map((item) => item.originalName).sort();
  assert.deepEqual(names, ['sunrise.jpg', 'sunset.png']);
});

test('searchImages paginates with a stable keyset', async () => {
  const result = await searchImages(libraryPath, {
    query: '',
    limit: 2,
    cursor: null,
  });

  assert.equal(result.items.length, 2);
  assert.ok(result.nextCursor);

  const next = await searchImages(libraryPath, {
    query: '',
    limit: 2,
    cursor: result.nextCursor,
  });

  assert.equal(next.items.length, 1);
});

test('deleteImageById removes rows and fts entry', async () => {
  await deleteImageById(libraryPath, '2');

  const result = await searchImages(libraryPath, {
    query: 'sun',
    limit: 10,
    cursor: null,
  });

  const names = result.items.map((item) => item.originalName);
  assert.deepEqual(names, ['sunrise.jpg']);
});
