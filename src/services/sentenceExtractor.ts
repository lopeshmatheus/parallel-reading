import type { Book } from './epubService';

export interface ParsedSentence {
  text: string;
  chapterIndex: number;
}

export class BookStreamer {
  private book: Book;
  private language: string;
  private currentChapterIndex = 0;
  private segmentIterator: Iterator<Intl.SegmentData> | null = null;

  constructor(book: Book, startChapter: number = 0, language: string = 'en') {
    this.book = book;
    this.language = language;
    this.seekToChapter(startChapter);
  }

  public seekToChapter(index: number) {
    this.currentChapterIndex = index;
    this.initChapter(index);
  }

  private initChapter(index: number) {
    if (index >= this.book.chapters.length) {
      this.segmentIterator = null;
      return;
    }

    const htmlStr = this.book.chapters[index].htmlContent;
    const spacedHtml = htmlStr.replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '</$1>\n');
    const parser = new DOMParser();
    const doc = parser.parseFromString(spacedHtml, 'text/html');
    const textContent = doc.body.textContent || '';

    const segmenter = new Intl.Segmenter(this.language, { granularity: 'sentence' });
    this.segmentIterator = segmenter.segment(textContent)[Symbol.iterator]();
  }

  public getNextSentences(count: number): ParsedSentence[] {
    const results: ParsedSentence[] = [];

    while (results.length < count) {
      if (!this.segmentIterator) {
        break; // End of book
      }

      const next = this.segmentIterator.next();

      if (next.done) {
        this.currentChapterIndex++;
        this.initChapter(this.currentChapterIndex);
        continue;
      }

      const sentence = next.value.segment.trim().replace(/\s+/g, ' ');
      if (sentence.length > 0) {
        results.push({ text: sentence, chapterIndex: this.currentChapterIndex });
      }
    }

    return results;
  }

  public hasMore(): boolean {
    return this.segmentIterator !== null;
  }
  
  public getCurrentChapterIndex(): number {
    return this.currentChapterIndex;
  }
}

export const extractSentences = (htmlStr: string, language: string = 'en'): string[] => {
  // Add newlines after block elements to prevent text from gluing together
  const spacedHtml = htmlStr.replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '</$1>\n');

  // 1. Extract text content from HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(spacedHtml, 'text/html');
  const textContent = doc.body.textContent || '';

  // 2. Segment the text into sentences
  const segmenter = new Intl.Segmenter(language, { granularity: 'sentence' });
  const segments = Array.from(segmenter.segment(textContent));

  // 3. Clean and filter out empty segments
  const sentences = segments
    .map(segment => segment.segment.trim().replace(/\s+/g, ' '))
    .filter(segment => segment.length > 0);

  return sentences;
};
