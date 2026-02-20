import { describe, it, expect } from 'vitest';
import { saveBook, getBooks, getBookById } from './storageService';
import type { Book } from './epubService';

describe('storageService', () => {
  const dummyBook: Book = {
    title: 'IndexedDB Test Book',
    chapters: [
      { id: 'ch1', href: 'ch1.html', htmlContent: '<p>TDD rulez</p>' }
    ]
  };

  it('should save a book and retrieve it', async () => {
    const bookId = await saveBook(dummyBook);
    expect(bookId).toBeDefined();

    const books = await getBooks();
    expect(books.length).toBeGreaterThan(0);
    expect(books.some((b: Book) => b.title === dummyBook.title)).toBe(true);

    const retrieved = await getBookById(bookId);
    expect(retrieved?.title).toBe(dummyBook.title);
    expect(retrieved?.chapters.length).toBe(1);
  });
});
