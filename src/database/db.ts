import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'

let db: Database

export async function initDB() {
  db = await open({
    filename: './database.db',
    driver: sqlite3.Database
  })

  // Enabling foreign keys
  await db.exec(`PRAGMA foreign_keys = ON;`)

  await db.exec(
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
        );`
  )

  await db.exec(
    `CREATE TABLE IF NOT EXISTS content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        userId INTEGER NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );`
  )

  await db.exec(`
        CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT UNIQUE NOT NULL
        );`
  )

  await db.exec(`
    CREATE TABLE IF NOT EXISTS content_tags (
      contentId INTEGER,
      tagId INTEGER,
      PRIMARY KEY (contentId, tagId),
      FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );
  `)

  // SHARE LINKS
  await db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT UNIQUE NOT NULL,
      userId INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `)

  // EMBEDDINGS - vector store for semantic search
  await db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contentId INTEGER NOT NULL UNIQUE,
      embedding TEXT NOT NULL,
      FOREIGN KEY (contentId) REFERENCES content(id) ON DELETE CASCADE
    );
  `)

  console.log("Database initialized")

}
export function getDB() {
  if (!db) {
    throw new Error("Database not initialised call initDB() first")
  }
  return db
}