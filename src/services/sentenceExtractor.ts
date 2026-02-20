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
