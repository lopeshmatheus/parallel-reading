import { getDB } from './storageService'; // We'll export getDB for translation to use

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const translateSentences = async (sentences: string[], targetLang: string = 'pt-BR'): Promise<string[]> => {
  if (sentences.length === 0) return [];

  const db = await getDB();
  const results: string[] = new Array(sentences.length);
  const missingIndices: number[] = [];
  const missingSentences: string[] = [];

  // Check cache first
  for (let i = 0; i < sentences.length; i++) {
    const original = sentences[i];
    // IndexedDB keys cannot be empty strings, null, or undefined
    if (!original || typeof original !== 'string' || original.trim() === '') {
       results[i] = original; // just return it as is
       continue;
    }

    try {
      const cached = await db.get('translations', original);
      if (cached && cached.lang === targetLang) {
        results[i] = cached.translated;
      } else {
        missingIndices.push(i);
        missingSentences.push(original);
      }
    } catch(err) {
      // Fallback if DB get completely fails
      missingIndices.push(i);
      missingSentences.push(original);
    }
  }

  // If all are cached or empty, return
  if (missingSentences.length === 0) return results;

  // Otherwise, call Gemini API
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing Gemini API Key');
    // graceful UI degradation
    return sentences.map(s => `[Tradução Indisponível - Chave não configurada] ${s}`);
  }

  const prompt = `Traduza as seguintes frases para o idioma ${targetLang}. 
Mantenha o sentido máximo e a posição original das vírgulas e pontuações sempre que possível.
Retorne APENAS a tradução, uma por linha, na exata mesma ordem, sem numeração extra, nem formatação markdown.
Frases:
${missingSentences.join('\n')}`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('Gemini API Error details:', errorData);
      throw new Error(`API request failed with status ${res.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await res.json();
    const translationText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Split the translation by lines
    const translatedLines = translationText.split('\n').filter((l: string) => l.trim() !== '');

    // Map the new translations back and save to cache
    for (let i = 0; i < missingIndices.length; i++) {
      const idx = missingIndices[i];
      const original = missingSentences[i];
      const translated = translatedLines[i] || original; // fallback

      results[idx] = translated;
      await db.put('translations', { original, translated, lang: targetLang });
    }

  } catch (err) {
    console.error('Translation error:', err);
    // Fallback on error
    for (let i = 0; i < missingIndices.length; i++) {
      results[missingIndices[i]] = `[Erro na Tradução] ${missingSentences[i]}`;
    }
  }

  return results;
};
