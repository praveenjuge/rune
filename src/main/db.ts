import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MIN_SQLITE_VERSION,
  type LibraryImage,
  type SearchCursor,
  type SearchImagesInput,
  type SearchImagesResult,
  toRuneUrl,
} from '../shared/library';

const DB_DIRNAME = '.rune';
const DB_FILENAME = 'library.sqlite';
const DB_SCHEMA_VERSION = 1;
const MAX_PAGE_SIZE = 500;

type DbImageRow = Omit<LibraryImage, 'url'>;

type InsertImageParams = {
  id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  added_at: string;
  bytes: number;
};

type IdParam = { id: string };
type SearchPageParams = { limit: number };
type SearchPageAfterParams = { addedAt: string; id: string; limit: number };
type SearchFtsParams = { query: string; limit: number };
type SearchFtsAfterParams = {
  query: string;
  addedAt: string;
  id: string;
  limit: number;
};

type DbStatements = {
  insertImage: Database.Statement<InsertImageParams>;
  insertFts: Database.Statement<{ id: string; original_name: string }>;
  deleteImage: Database.Statement<IdParam>;
  deleteFts: Database.Statement<IdParam>;
  getImageById: Database.Statement<IdParam>;
  selectPage: Database.Statement<SearchPageParams>;
  selectPageAfter: Database.Statement<SearchPageAfterParams>;
  selectFtsPage: Database.Statement<SearchFtsParams>;
  selectFtsPageAfter: Database.Statement<SearchFtsAfterParams>;
};

type DbContext = {
  db: Database.Database;
  statements: DbStatements;
};

const dbCache = new Map<string, DbContext>();

const getDbPath = (libraryPath: string) =>
  path.join(libraryPath, DB_DIRNAME, DB_FILENAME);

const normalizeSqliteVersion = (version: string) =>
  version
    .split('.')
    .map((part) => Number(part))
    .filter((part) => Number.isFinite(part));

const isVersionAtLeast = (version: string, minimum: string) => {
  const left = normalizeSqliteVersion(version);
  const right = normalizeSqliteVersion(minimum);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return true;
    if (l < r) return false;
  }
  return true;
};

const hydrateImage = (row: DbImageRow): LibraryImage => ({
  ...row,
  url: toRuneUrl(row.filePath),
});

const buildFtsQuery = (raw: string) => {
  const normalized = raw.toLowerCase().replace(/[^\w-]+/g, ' ');
  const tokens = normalized.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return '';
  return tokens.map((token) => `${token}*`).join(' AND ');
};

const ensureSchema = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      added_at TEXT NOT NULL,
      bytes INTEGER NOT NULL
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS images_fts
      USING fts5(id UNINDEXED, original_name, tokenize='unicode61');
    CREATE INDEX IF NOT EXISTS images_added_at_idx
      ON images(added_at DESC, id DESC);
  `);
  db.pragma(`user_version = ${DB_SCHEMA_VERSION}`);
};

const prepareStatements = (db: Database.Database): DbStatements => ({
  insertImage: db.prepare(
    `
    INSERT INTO images (id, original_name, stored_name, file_path, added_at, bytes)
    VALUES (@id, @original_name, @stored_name, @file_path, @added_at, @bytes)
  `,
  ),
  insertFts: db.prepare(
    `INSERT INTO images_fts (id, original_name) VALUES (@id, @original_name)`,
  ),
  deleteImage: db.prepare(`DELETE FROM images WHERE id = @id`),
  deleteFts: db.prepare(`DELETE FROM images_fts WHERE id = @id`),
  getImageById: db.prepare(
    `
    SELECT
      id,
      original_name as originalName,
      stored_name as storedName,
      file_path as filePath,
      added_at as addedAt,
      bytes
    FROM images
    WHERE id = @id
  `,
  ),
  selectPage: db.prepare(
    `
    SELECT
      id,
      original_name as originalName,
      stored_name as storedName,
      file_path as filePath,
      added_at as addedAt,
      bytes
    FROM images
    ORDER BY added_at DESC, id DESC
    LIMIT @limit
  `,
  ),
  selectPageAfter: db.prepare(
    `
    SELECT
      id,
      original_name as originalName,
      stored_name as storedName,
      file_path as filePath,
      added_at as addedAt,
      bytes
    FROM images
    WHERE (added_at < @addedAt OR (added_at = @addedAt AND id < @id))
    ORDER BY added_at DESC, id DESC
    LIMIT @limit
  `,
  ),
  selectFtsPage: db.prepare(
    `
    SELECT
      images.id,
      images.original_name as originalName,
      images.stored_name as storedName,
      images.file_path as filePath,
      images.added_at as addedAt,
      images.bytes
    FROM images_fts
    JOIN images ON images.id = images_fts.id
    WHERE images_fts MATCH @query
    ORDER BY images.added_at DESC, images.id DESC
    LIMIT @limit
  `,
  ),
  selectFtsPageAfter: db.prepare(
    `
    SELECT
      images.id,
      images.original_name as originalName,
      images.stored_name as storedName,
      images.file_path as filePath,
      images.added_at as addedAt,
      images.bytes
    FROM images_fts
    JOIN images ON images.id = images_fts.id
    WHERE images_fts MATCH @query
      AND (images.added_at < @addedAt OR (images.added_at = @addedAt AND images.id < @id))
    ORDER BY images.added_at DESC, images.id DESC
    LIMIT @limit
  `,
  ),
});

const openDatabase = async (libraryPath: string): Promise<DbContext> => {
  const dbDir = path.join(libraryPath, DB_DIRNAME);
  await fs.mkdir(dbDir, { recursive: true });
  const dbPath = getDbPath(libraryPath);
  const db = new Database(dbPath, { timeout: 5000 });

  db.pragma('busy_timeout = 5000');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -64000');
  db.pragma('foreign_keys = ON');

  const versionRow = db.prepare('SELECT sqlite_version() as version').get() as {
    version: string;
  };
  if (!isVersionAtLeast(versionRow.version, MIN_SQLITE_VERSION)) {
    db.close();
    throw new Error(
      `SQLite ${MIN_SQLITE_VERSION}+ required. Found ${versionRow.version}.`,
    );
  }

  const ftsRow = db
    .prepare(`SELECT sqlite_compileoption_used('ENABLE_FTS5') as enabled`)
    .get() as { enabled: number };
  if (!ftsRow.enabled) {
    db.close();
    throw new Error('SQLite FTS5 is required but not available.');
  }

  const userVersion = db.pragma('user_version', { simple: true }) as number;
  if (!userVersion) {
    ensureSchema(db);
  }

  console.info(
    `[rune] SQLite ${versionRow.version} (FTS5 ${
      ftsRow.enabled ? 'enabled' : 'disabled'
    })`,
  );

  return { db, statements: prepareStatements(db) };
};

const getDb = async (libraryPath: string): Promise<DbContext> => {
  const resolvedPath = path.resolve(libraryPath);
  const cached = dbCache.get(resolvedPath);
  if (cached) return cached;
  const context = await openDatabase(resolvedPath);
  dbCache.set(resolvedPath, context);
  return context;
};

const clampLimit = (limit: number) => {
  if (!Number.isFinite(limit)) return MAX_PAGE_SIZE;
  return Math.max(1, Math.min(limit, MAX_PAGE_SIZE));
};

export const searchImages = async (
  libraryPath: string,
  input: SearchImagesInput,
): Promise<SearchImagesResult> => {
  const { statements } = await getDb(libraryPath);
  const limit = clampLimit(input.limit);
  const query = buildFtsQuery(input.query);
  const cursor = input.cursor ?? null;

  let rows: DbImageRow[];
  if (!query) {
    rows = cursor
      ? (statements.selectPageAfter.all({
          addedAt: cursor.addedAt,
          id: cursor.id,
          limit,
        }) as DbImageRow[])
      : (statements.selectPage.all({ limit }) as DbImageRow[]);
  } else {
    rows = cursor
      ? (statements.selectFtsPageAfter.all({
          query,
          addedAt: cursor.addedAt,
          id: cursor.id,
          limit,
        }) as DbImageRow[])
      : (statements.selectFtsPage.all({ query, limit }) as DbImageRow[]);
  }

  const items = rows.map(hydrateImage);
  const last = items[items.length - 1];
  const nextCursor: SearchCursor | null = last && items.length === limit
    ? { addedAt: last.addedAt, id: last.id }
    : null;

  return { items, nextCursor };
};

export const insertImages = async (
  libraryPath: string,
  images: LibraryImage[],
): Promise<void> => {
  if (images.length === 0) return;
  const { db, statements } = await getDb(libraryPath);
  const insertMany = db.transaction((rows: LibraryImage[]) => {
    for (const row of rows) {
      statements.insertImage.run({
        id: row.id,
        original_name: row.originalName,
        stored_name: row.storedName,
        file_path: row.filePath,
        added_at: row.addedAt,
        bytes: row.bytes,
      });
      statements.insertFts.run({
        id: row.id,
        original_name: row.originalName,
      });
    }
  });
  insertMany(images);
};

export const getImageById = async (
  libraryPath: string,
  id: string,
): Promise<LibraryImage | null> => {
  const { statements } = await getDb(libraryPath);
  const row = statements.getImageById.get({ id }) as DbImageRow | undefined;
  return row ? hydrateImage(row) : null;
};

export const deleteImageById = async (
  libraryPath: string,
  id: string,
): Promise<void> => {
  const { db, statements } = await getDb(libraryPath);
  const remove = db.transaction((imageId: string) => {
    statements.deleteFts.run({ id: imageId });
    statements.deleteImage.run({ id: imageId });
  });
  remove(id);
};

export const closeAllDatabases = () => {
  for (const [key, context] of dbCache.entries()) {
    context.db.close();
    dbCache.delete(key);
  }
};
