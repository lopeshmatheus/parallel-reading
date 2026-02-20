import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Book } from './epubService';

interface ParallelReaderDB extends DBSchema {
  books: {
    key: string;
    value: Book & { id: string };
  };
  translations: {
    key: string; // The original sentence string
    value: { original: string; translated: string; lang: string };
  };
}

let dbPromise: Promise<IDBPDatabase<ParallelReaderDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ParallelReaderDB>('parallel-reader-db', 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('books', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('translations', { keyPath: 'original' });
        }
      },
    });
  }
  return dbPromise;
};

export const saveBook = async (book: Book): Promise<string> => {
  const db = await getDB();
  const id = crypto.randomUUID();
  const bookWithId = { ...book, id };
  await db.put('books', bookWithId);
  return id;
};

export const getBooks = async (): Promise<(Book & { id: string })[]> => {
  const db = await getDB();
  return db.getAll('books');
};

export const getBookById = async (id: string): Promise<(Book & { id: string }) | undefined> => {
  const db = await getDB();
  return db.get('books', id);
};
