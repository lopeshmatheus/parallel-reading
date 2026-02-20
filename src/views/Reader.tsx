import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBookById } from '../services/storageService';
import type { Book } from '../services/epubService';
import { extractSentences } from '../services/sentenceExtractor';
import { translateSentences } from '../services/translationService';
import SentencePair from '../components/SentencePair';
import TranslationProgress from '../components/TranslationProgress';

export default function Reader() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get('bookId');

  const [book, setBook] = useState<Book | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedSentences, setTranslatedSentences] = useState<string[]>([]);
  const [translationProgress, setTranslationProgress] = useState(0);

  const sentencesPerPage = 10;

  useEffect(() => {
    if (bookId) {
      getBookById(bookId).then(b => {
        if (b) {
          setBook(b);
          loadChapter(b, 0);
        }
      });
    }
  }, [bookId]);

  const loadChapter = (b: Book, idx: number) => {
    setCurrentChapterIndex(idx);
    if (b.chapters[idx]) {
      const extracted = extractSentences(b.chapters[idx].htmlContent);
      setSentences(extracted);
      setCurrentPage(0);
      loadPage(extracted, 0);
    }
  };

  const loadPage = async (allSentences: string[], pageIndex: number) => {
    const start = pageIndex * sentencesPerPage;
    const pageSentences = allSentences.slice(start, start + sentencesPerPage);
    
    // We will simulate translation loading block
    setIsTranslating(true);
    setTranslationProgress(0);
    setTranslatedSentences([]);

    try {
      // Create a progress simulate interval since we don't have stream parsing
      const simInt = setInterval(() => {
        setTranslationProgress(p => (p < pageSentences.length ? p + 1 : p));
      }, 300);

      const translations = await translateSentences(pageSentences);
      
      clearInterval(simInt);
      setTranslationProgress(pageSentences.length);
      setTranslatedSentences(translations);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleNext = () => {
    const totalPages = Math.ceil(sentences.length / sentencesPerPage);
    if (currentPage < totalPages - 1) {
      setCurrentPage(p => p + 1);
      loadPage(sentences, currentPage + 1);
    } else if (book && currentChapterIndex < book.chapters.length - 1) {
      loadChapter(book, currentChapterIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(p => p - 1);
      loadPage(sentences, currentPage - 1);
    } else if (book && currentChapterIndex > 0) {
      const prevChIdx = currentChapterIndex - 1;
      const extracted = extractSentences(book.chapters[prevChIdx].htmlContent);
      const totalPages = Math.ceil(extracted.length / sentencesPerPage);
      setCurrentChapterIndex(prevChIdx);
      setSentences(extracted);
      setCurrentPage(totalPages - 1);
      loadPage(extracted, totalPages - 1);
    }
  };

  if (!book) return <div style={{ padding: '20px' }}>Loading...</div>;

  const startIdx = currentPage * sentencesPerPage;
  const currentSentences = sentences.slice(startIdx, startIdx + sentencesPerPage);
  const totalPages = Math.ceil(sentences.length / sentencesPerPage);

  return (
    <div className="reader-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-brutal" onClick={() => navigate('/')}>
          ← Início
        </button>
        <h3 className="title-brutal" style={{ fontSize: '1.2rem', margin: 0, transform: 'rotate(0)' }}>
          {book.title} - Cap. {currentChapterIndex + 1}
        </h3>
        <div style={{ fontWeight: 'bold' }}>
          Página {currentPage + 1}/{totalPages || 1}
        </div>
      </div>
      
      {isTranslating ? (
        <TranslationProgress 
          current={translationProgress} 
          total={currentSentences.length} 
          message="Conectando à IA para preservar o sentido e pontuação..." 
        />
      ) : (
        <div style={{ minHeight: '300px' }}>
          {currentSentences.map((orig, i) => (
            <SentencePair key={i} original={orig} translated={translatedSentences[i]} />
          ))}
          {currentSentences.length === 0 && (
            <div className="card-brutal" style={{ padding: '20px' }}>Capítulo vazio.</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button 
          className="btn-brutal" 
          onClick={handlePrev}
          disabled={currentPage === 0 && currentChapterIndex === 0 || isTranslating}
        >
          Anterior
        </button>
        <button 
          className="btn-brutal" 
          onClick={handleNext}
          disabled={(currentPage === totalPages - 1 && currentChapterIndex === book.chapters.length - 1) || isTranslating}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
