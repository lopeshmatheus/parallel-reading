import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateSentences } from './translationService';

describe('translationService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: 'Isso é um teste.\nOlá mundo.' }] }
        }]
      })
    }));
  });

  it('should translate sentences using fetch to Gemini API', async () => {
    const original = ['This is a test.', 'Hello world.'];
    const result = await translateSentences(original, 'pt-BR');
    
    expect(global.fetch).toHaveBeenCalled();
    expect(result.length).toBe(original.length);
    expect(result[0]).toBe('Isso é um teste.');
    expect(result[1]).toBe('Olá mundo.');
  });
});
