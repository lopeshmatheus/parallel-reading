import { describe, it, expect } from 'vitest';
import { extractSentences } from './sentenceExtractor';

describe('sentenceExtractor - extractSentences', () => {
  it('should correctly segment an HTML text into sentences using Intl.Segmenter', () => {
    const htmlContent = `
      <p>Hello! How are you?</p>
      <p>I am fine. Thanks.</p>
    `;
    const sentences = extractSentences(htmlContent, 'en');

    expect(sentences.length).toBe(4);
    expect(sentences[0]).toBe('Hello!');
    expect(sentences[1]).toBe('How are you?');
    expect(sentences[2]).toBe('I am fine.');
    expect(sentences[3]).toBe('Thanks.');
  });
});
