import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.DATABASE_PATH ? path.resolve(here, '../../', process.env.DATABASE_PATH.replace(/^\.\//, '')) : path.join(dataDir, 'library.sqlite');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('member','librarian')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS authors(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS publishers(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS books(id INTEGER PRIMARY KEY, open_library_key TEXT UNIQUE, title TEXT NOT NULL, isbn TEXT, publisher_id INTEGER REFERENCES publishers(id), year INTEGER, language TEXT, description TEXT, cover_url TEXT, pages INTEGER, available_copies INTEGER NOT NULL DEFAULT 1 CHECK(available_copies >= 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS book_authors(book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE, author_id INTEGER NOT NULL REFERENCES authors(id), PRIMARY KEY(book_id,author_id));
CREATE TABLE IF NOT EXISTS subjects(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, broader_id INTEGER REFERENCES subjects(id));
CREATE TABLE IF NOT EXISTS book_subjects(book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE, subject_id INTEGER NOT NULL REFERENCES subjects(id), PRIMARY KEY(book_id,subject_id));
CREATE TABLE IF NOT EXISTS loans(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), book_id INTEGER NOT NULL REFERENCES books(id), borrowed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, due_date TEXT NOT NULL, returned_at TEXT, fine_amount REAL NOT NULL DEFAULT 0 CHECK(fine_amount >= 0));
CREATE TABLE IF NOT EXISTS reservations(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), book_id INTEGER NOT NULL REFERENCES books(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','fulfilled','cancelled')));
CREATE TABLE IF NOT EXISTS fines(id INTEGER PRIMARY KEY, loan_id INTEGER NOT NULL REFERENCES loans(id), user_id INTEGER NOT NULL REFERENCES users(id), amount REAL NOT NULL CHECK(amount >= 0), paid INTEGER NOT NULL DEFAULT 0 CHECK(paid IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS activity_log(id INTEGER PRIMARY KEY, event_type TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS inferred_facts(id INTEGER PRIMARY KEY, subject TEXT NOT NULL, predicate TEXT NOT NULL, object TEXT NOT NULL, rule TEXT NOT NULL, explanation TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title); CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id); CREATE INDEX IF NOT EXISTS idx_loans_due ON loans(due_date); CREATE INDEX IF NOT EXISTS idx_subject_name ON subjects(name);
`);
export function logActivity(type: string, message: string): void { db.prepare('INSERT INTO activity_log(event_type,message) VALUES(?,?)').run(type,message); }
