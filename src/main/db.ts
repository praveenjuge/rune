import { DatabaseSync, StatementSync } from 'node:sqlite';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  MIN_SQLITE_VERSION,
  type LibraryImage,
  type LibrarySettings,
  type SearchCursor,
  type SearchImagesInput,
  type SearchImagesResult,
  toRuneUrl,
} from '../shared/library';

const DB_DIRNAME = '.rune';
const DB_FILENAME = 'library.sqlite';
const DB_SCHEMA_VERSION = 4;
const MAX_PAGE_SIZE = 500;

type DbImageRow = Omit<LibraryImage, 'url'>;
type AiTagStatus = 'pending' | 'generating' | 'complete' | 'failed';

type InsertImageParams = {
  id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  added_at: string;
  bytes: number;
  ai_tags: string | null;
  ai_tag_status: string;
};

type UpdateImageTagsParams = {
  id: string;
  ai_tags: string | null;
  ai_tag_status: string;
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
  insertImage: StatementSync;
  insertFts: StatementSync;
  deleteImage: StatementSync;
  deleteFts: StatementSync;
  getImageById: StatementSync;
  selectPage: StatementSync;
  selectPageAfter: StatementSync;
  selectFtsPage: StatementSync;
  selectFtsPageAfter: StatementSync;
  updateImageTags: StatementSync;
  updateFtsTags: StatementSync;
  selectPendingTags: StatementSync;
  setTagStatus: StatementSync;
};

type DbContext = {
  db: DatabaseSync;
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

const prepareStmt = (db: DatabaseSync, sql: string): StatementSync => {
  const stmt = db.prepare(sql);
  stmt.setAllowBareNamedParameters(true);
  return stmt;
};

const ensureSchema = (db: DatabaseSync) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      added_at TEXT NOT NULL,
      bytes INTEGER NOT NULL,
      ai_tags TEXT DEFAULT NULL,
      ai_tag_status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS images_fts
      USING fts5(id UNINDEXED, original_name, ai_tags, tokenize='unicode61');
    CREATE INDEX IF NOT EXISTS images_added_at_idx
      ON images(added_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS images_ai_tag_status_idx
      ON images(ai_tag_status);
  `);
  db.exec(`PRAGMA user_version = ${DB_SCHEMA_VERSION}`);
};

const migrateSchema = (db: DatabaseSync, fromVersion: number) => {
  if (fromVersion < 2) {
    // Migration from version 1 to 2: Add AI tags columns
    console.info('[rune] Migrating database to version 2 (AI tags)...');

    const columns = db.prepare(`PRAGMA table_info(images)`).all() as Array<{ name: string }>;
    const columnNames = columns.map(c => c.name);

    if (!columnNames.includes('ai_tags')) {
      db.exec(`ALTER TABLE images ADD COLUMN ai_tags TEXT DEFAULT NULL`);
    }
    if (!columnNames.includes('ai_tag_status')) {
      db.exec(`ALTER TABLE images ADD COLUMN ai_tag_status TEXT DEFAULT 'pending'`);
    }

    const ftsExists = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='images_fts'`
    ).get();

    if (ftsExists) {
      db.exec(`DROP TABLE IF EXISTS images_fts`);
    }

    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS images_fts
        USING fts5(id UNINDEXED, original_name, ai_tags, tokenize='unicode61');
    `);

    db.exec(`
      INSERT INTO images_fts (id, original_name, ai_tags)
      SELECT id, original_name, ai_tags FROM images
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS images_ai_tag_status_idx
        ON images(ai_tag_status);
    `);

    db.exec(`PRAGMA user_version = 2`);
    console.info('[rune] Migration to version 2 complete.');
  }

  if (fromVersion < 3) {
    // Migration from version 2 to 3: Add settings table
    console.info('[rune] Migrating database to version 3 (settings table)...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`PRAGMA user_version = 3`);
    console.info('[rune] Migration to version 3 complete.');
  }

  if (fromVersion < 4) {
    // Migration from version 3 to 4: Fix settings table schema
    console.info('[rune] Migrating database to version 4 (fix settings schema)...');

    // Check if settings table has any extra columns and recreate if needed
    const tableInfo = db.prepare('PRAGMA table_info(settings)').all() as Array<{ name: string }>;
    const hasExtraColumns = tableInfo.some(col =>
      col.name !== 'id' && col.name !== 'created_at' && col.name !== 'updated_at'
    );

    if (hasExtraColumns) {
      console.info('[rune] Recreating settings table with correct schema...');
      db.exec('DROP TABLE IF EXISTS settings;');
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(`PRAGMA user_version = 4`);
    console.info('[rune] Migration to version 4 complete.');
  }
};

const prepareStatements = (db: DatabaseSync): DbStatements => ({
  insertImage: prepareStmt(db,
    `
    INSERT INTO images (id, original_name, stored_name, file_path, added_at, bytes, ai_tags, ai_tag_status)
    VALUES (@id, @original_name, @stored_name, @file_path, @added_at, @bytes, @ai_tags, @ai_tag_status)
  `,
  ),
  insertFts: prepareStmt(db,
    `INSERT INTO images_fts (id, original_name, ai_tags) VALUES (@id, @original_name, @ai_tags)`,
  ),
  deleteImage: prepareStmt(db, `DELETE FROM images WHERE id = @id`),
  deleteFts: prepareStmt(db, `DELETE FROM images_fts WHERE id = @id`),
  getImageById: prepareStmt(db,
    `
    SELECT
      id,
      original_name as originalName,
      stored_name as storedName,
      file_path as filePath,
      added_at as addedAt,
      bytes,
      ai_tags as aiTags,
      ai_tag_status as aiTagStatus
    FROM images
    WHERE id = @id
  `,
  ),
  selectPage: prepareStmt(db,
    `
    SELECT
      id,
      original_name as originalName,
      stored_name as storedName,
      file_path as filePath,
      added_at as addedAt,
      bytes,
      ai_tags as aiTags,
      ai_tag_status as aiTagStatus
    FROM images
    ORDER BY added_at DESC, id DESC
    LIMIT @limit
  `,
  ),
  selectPageAfter: prepareStmt(db,
    `
    SELECT
      id,
      original_name as originalName,
      stored_name as storedName,
      file_path as filePath,
      added_at as addedAt,
      bytes,
      ai_tags as aiTags,
      ai_tag_status as aiTagStatus
    FROM images
    WHERE (added_at < @addedAt OR (added_at = @addedAt AND id < @id))
    ORDER BY added_at DESC, id DESC
    LIMIT @limit
  `,
  ),
  selectFtsPage: prepareStmt(db,
    `
    SELECT
      images.id,
      images.original_name as originalName,
      images.stored_name as storedName,
      images.file_path as filePath,
      images.added_at as addedAt,
      images.bytes,
      images.ai_tags as aiTags,
      images.ai_tag_status as aiTagStatus
    FROM images_fts
    JOIN images ON images.id = images_fts.id
    WHERE images_fts MATCH @query
    ORDER BY images.added_at DESC, images.id DESC
    LIMIT @limit
  `,
  ),
  selectFtsPageAfter: prepareStmt(db,
    `
    SELECT
      images.id,
      images.original_name as originalName,
      images.stored_name as storedName,
      images.file_path as filePath,
      images.added_at as addedAt,
      images.bytes,
      images.ai_tags as aiTags,
      images.ai_tag_status as aiTagStatus
    FROM images_fts
    JOIN images ON images.id = images_fts.id
    WHERE images_fts MATCH @query
      AND (images.added_at < @addedAt OR (images.added_at = @addedAt AND images.id < @id))
    ORDER BY images.added_at DESC, images.id DESC
    LIMIT @limit
  `,
  ),
  updateImageTags: prepareStmt(db,
    `UPDATE images SET ai_tags = @ai_tags, ai_tag_status = @ai_tag_status WHERE id = @id`,
  ),
  updateFtsTags: prepareStmt(db,
    `UPDATE images_fts SET ai_tags = @ai_tags WHERE id = @id`,
  ),
  selectPendingTags: prepareStmt(db,
    `
    SELECT
      id,
      original_name as originalName,
      stored_name as storedName,
      file_path as filePath,
      added_at as addedAt,
      bytes,
      ai_tags as aiTags,
      ai_tag_status as aiTagStatus
    FROM images
    WHERE ai_tag_status = 'pending'
    ORDER BY added_at DESC
    LIMIT @limit
  `,
  ),
  setTagStatus: prepareStmt(db,
    `UPDATE images SET ai_tag_status = @ai_tag_status WHERE id = @id`,
  ),
});

const openDatabase = async (libraryPath: string): Promise<DbContext> => {
  const dbDir = path.join(libraryPath, DB_DIRNAME);
  await fs.mkdir(dbDir, { recursive: true });
  const dbPath = getDbPath(libraryPath);
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA busy_timeout = 5000');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA temp_store = MEMORY');
  db.exec('PRAGMA cache_size = -64000');
  db.exec('PRAGMA foreign_keys = ON');

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

  const userVersion = (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  if (!userVersion) {
    ensureSchema(db);
  } else if (userVersion < DB_SCHEMA_VERSION) {
    migrateSchema(db, userVersion);
  }

  // Safety check: ensure settings table exists (in case of previous bug)
  const settingsTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
    .get() as { name: string } | undefined;
  if (!settingsTableExists) {
    console.info('[rune] Settings table missing, creating it...');
    db.exec('CREATE TABLE settings (' +
      'id INTEGER PRIMARY KEY CHECK (id = 1), ' +
      'created_at TEXT NOT NULL, ' +
      'updated_at TEXT NOT NULL' +
      ');');
  }

  const ftsEnabled = ftsRow.enabled ? 'enabled' : 'disabled';
  console.info('[rune] SQLite ' + versionRow.version + ' (FTS5 ' + ftsEnabled + ')');

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
  db.exec('BEGIN');
  try {
    for (const row of images) {
      statements.insertImage.run({
        id: row.id,
        original_name: row.originalName,
        stored_name: row.storedName,
        file_path: row.filePath,
        added_at: row.addedAt,
        bytes: row.bytes,
        ai_tags: row.aiTags ?? null,
        ai_tag_status: row.aiTagStatus ?? 'pending',
      });
      statements.insertFts.run({
        id: row.id,
        original_name: row.originalName,
        ai_tags: row.aiTags ?? null,
      });
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
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
  db.exec('BEGIN');
  try {
    statements.deleteFts.run({ id });
    statements.deleteImage.run({ id });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

export const closeAllDatabases = () => {
  for (const [key, context] of dbCache.entries()) {
    context.db.close();
    dbCache.delete(key);
  }
};

// AI Tagging functions

export const updateImageTags = async (
  libraryPath: string,
  id: string,
  tags: string | null,
  status: AiTagStatus,
): Promise<void> => {
  const { db, statements } = await getDb(libraryPath);
  db.exec('BEGIN');
  try {
    statements.updateImageTags.run({
      id,
      ai_tags: tags,
      ai_tag_status: status,
    });
    statements.updateFtsTags.run({
      id,
      ai_tags: tags,
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

export const setImageTagStatus = async (
  libraryPath: string,
  id: string,
  status: AiTagStatus,
): Promise<void> => {
  const { statements } = await getDb(libraryPath);
  statements.setTagStatus.run({ id, ai_tag_status: status });
};

export const getImagesNeedingTags = async (
  libraryPath: string,
  limit = 10,
): Promise<LibraryImage[]> => {
  const { statements } = await getDb(libraryPath);
  const rows = statements.selectPendingTags.all({ limit }) as DbImageRow[];
  return rows.map(hydrateImage);
};

export const retryFailedTags = async (
  libraryPath: string,
  id: string,
): Promise<void> => {
  const { statements } = await getDb(libraryPath);
  statements.setTagStatus.run({ id, ai_tag_status: 'pending' });
};

// Settings functions
type DbSettingsRow = {
  id: number;
  created_at: string;
  updated_at: string;
};

export const loadSettings = async (
  libraryPath: string,
): Promise<LibrarySettings | null> => {
  try {
    const { db } = await getDb(libraryPath);
    const row = db
      .prepare('SELECT * FROM settings WHERE id = 1')
      .get() as DbSettingsRow | undefined;

    if (!row) return null;

    return {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
};

export const saveSettings = async (
  libraryPath: string,
): Promise<LibrarySettings> => {
  const { db } = await getDb(libraryPath);
  const now = new Date().toISOString();

  try {
    const existing = db.prepare('SELECT id, created_at FROM settings WHERE id = 1').get() as { id: number; created_at: string } | undefined;

    if (existing) {
      db.prepare('UPDATE settings SET updated_at = ? WHERE id = 1').run(now);
      return {
        createdAt: existing.created_at,
        updatedAt: now,
      };
    } else {
      db.prepare('INSERT INTO settings (id, created_at, updated_at) VALUES (1, ?, ?)').run(
        now,
        now,
      );
      return {
        createdAt: now,
        updatedAt: now,
      };
    }
  } catch (error) {
    console.error('[rune] Failed to save settings:', error);
    throw error;
  }
};
