import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getBookById } from '../services/storageService';
import type { Book } from '../services/epubService';
import { BookStreamer, type ParsedSentence } from '../services/sentenceExtractor';
import { translateSentences } from '../services/translationService';
import SentencePair from '../components/SentencePair';
import TranslationProgress from '../components/TranslationProgress';

export default function Reader() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookId = searchParams.get('bookId');

  const [book, setBook] = useState<Book | null>(null);
  
  // Streamer State
  const streamerRef = useRef<BookStreamer | null>(null);
  const [sentences, setSentences] = useState<ParsedSentence[]>([]);
  const CHUNK_SIZE = 100; // How many sentences to parse ahead at a time
  
  // Layout State
  const [isCalculatingLayout, setIsCalculatingLayout] = useState(false);
  const [pages, setPages] = useState<number[][]>([]); // Array of pages (arrays of sentence indices)
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Translation State
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  // Dictionary of index -> translation
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const translationsRef = useRef<Record<number, string>>({});
  
  const PREFETCH_WINDOW = 4; // Lookahead amount of pages

  useEffect(() => {
    if (bookId) {
      getBookById(bookId).then(b => {
        if (b) {
          setBook(b);
          streamerRef.current = new BookStreamer(b, 0, 'en');
          fetchMoreSentences();
        }
      });
    }
  }, [bookId]);

  const fetchMoreSentences = useCallback(() => {
    if (!streamerRef.current || !streamerRef.current.hasMore()) return;
    const newChunk = streamerRef.current.getNextSentences(CHUNK_SIZE);
    if (newChunk.length > 0) {
      setSentences(prev => [...prev, ...newChunk]);
      setIsCalculatingLayout(true);
    } else {
      // Edge case: if chunk was empty but hasMore is true (empty chapter), recursively skip
      if (streamerRef.current.hasMore()) {
        fetchMoreSentences();
      }
    }
  }, []);

  // 1. Layout Calculation Effect
  useEffect(() => {
    const handleResize = () => {
      if (sentences.length > 0) setIsCalculatingLayout(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sentences]);

  // Handle the actual height measuring
  useEffect(() => {
    if (isCalculatingLayout && containerRef.current && sentences.length > 0) {
      const availableHeight = window.innerHeight - 200; // Margin for header, footer + spacing
      const sentenceElements = Array.from(containerRef.current.children) as HTMLElement[];
      
      const newPages: number[][] = [];
      let currentPageIndices: number[] = [];
      let currentHeight = 0;

      sentenceElements.forEach((el, idx) => {
        const estimatedHeight = el.offsetHeight + 40; 
        
        if (currentHeight + estimatedHeight > availableHeight && currentPageIndices.length > 0) {
          newPages.push(currentPageIndices);
          currentPageIndices = [idx];
          currentHeight = estimatedHeight;
        } else {
          currentPageIndices.push(idx);
          currentHeight += estimatedHeight;
        }
      });
      
      if (currentPageIndices.length > 0) {
        newPages.push(currentPageIndices);
      }
      
      // Fallback if measurement failed
      if (newPages.length === 0 || newPages[0].length === 0) {
         console.warn("Layout calc failed or empty, falling back to 10 sentences per page");
         const fallbackPages = [];
         for(let i = 0; i < sentences.length; i+= 10) {
            fallbackPages.push(sentences.slice(i, i+10).map((_, localIdx) => i + localIdx));
         }
         setPages(fallbackPages);
         if (currentPage >= fallbackPages.length) setCurrentPage(Math.max(0, fallbackPages.length - 1));
         setIsCalculatingLayout(false);
         loadPageTranslations(fallbackPages, currentPage, sentences);
         return;
      }
      
      setPages(newPages);
      // Make sure current page is still valid after resizing/appending
      const nextCurrentPage = currentPage < newPages.length ? currentPage : Math.max(0, newPages.length - 1);
      setCurrentPage(nextCurrentPage);
      setIsCalculatingLayout(false);
      
      if (newPages.length > 0) {
        loadPageTranslations(newPages, nextCurrentPage, sentences);
      }
    }
  }, [isCalculatingLayout, sentences]);

  const loadPageTranslations = async (layoutPages: number[][], pageIndex: number, currentSentences: ParsedSentence[]) => {
    if (pageIndex >= layoutPages.length) return;
    
    // Trigger appending more parsed sentences if we are getting close to the edge
    if (pageIndex >= layoutPages.length - PREFETCH_WINDOW - 2 && !isCalculatingLayout) {
       fetchMoreSentences();
    }
    
    const indices = layoutPages[pageIndex];
    
    const isCompletelyTranslated = indices.every(i => translationsRef.current[i] !== undefined);
    if (isCompletelyTranslated) {
       triggerPrefetch(pageIndex, layoutPages, currentSentences);
       return;
    }
    
    loadAsync(layoutPages, pageIndex, currentSentences);
  };

  const loadAsync = async (layoutPages: number[][], pageIndex: number, currentSentences: ParsedSentence[]) => {
    setIsTranslating(true);
    setTranslationProgress(0);
    
    const indices = layoutPages[pageIndex];
    const pageSentences = indices.map(i => currentSentences[i]);
    
    try {
      const simInt = setInterval(() => {
        setTranslationProgress(p => (p < pageSentences.length ? p + 1 : p));
      }, 300);

      const translated = await translateSentences(pageSentences.map(s => s.text));
      clearInterval(simInt);
      
      const next = { ...translationsRef.current };
      indices.forEach((globalIdx, localIdx) => {
        next[globalIdx] = translated[localIdx];
      });
      translationsRef.current = next;
      setTranslations(next);
      setTranslationProgress(pageSentences.length);
    } catch(e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
      triggerPrefetch(pageIndex, layoutPages, currentSentences);
    }
  };

  // Background sliding window prefetcher
  const prefetchQueue = useRef<number[]>([]);
  const isPrefetching = useRef(false);

  const triggerPrefetch = useCallback((currentPageIdx: number, layoutPages: number[][], currentSentences: ParsedSentence[]) => {
     const pagesToFetch = [];
     for(let i = 1; i <= PREFETCH_WINDOW; i++) {
        const target = currentPageIdx + i;
        if (target < layoutPages.length) {
          pagesToFetch.push(target);
        }
     }
     
     prefetchQueue.current = pagesToFetch;
     if (!isPrefetching.current) {
        processPrefetchQueue(layoutPages, currentSentences);
     }
  }, []);

  const processPrefetchQueue = async (layoutPages: number[][], currentSentences: ParsedSentence[]) => {
     if (prefetchQueue.current.length === 0) {
       isPrefetching.current = false;
       return;
     }
     isPrefetching.current = true;
     const pageIdx = prefetchQueue.current.shift()!;
     const indices = layoutPages[pageIdx];
     
     const needsFetch = indices.some(i => translationsRef.current[i] === undefined);

     if (needsFetch) {
       const pageSentences = indices.map(i => currentSentences[i].text);
       try {
         await new Promise(r => setTimeout(r, 1500)); 
         const translated = await translateSentences(pageSentences);
         const next = { ...translationsRef.current };
         indices.forEach((globalIdx, localIdx) => {
           next[globalIdx] = translated[localIdx];
         });
         translationsRef.current = next;
         setTranslations(next);
       } catch(e) {
         console.error("Prefetch error", e);
       }
     }
     
     processPrefetchQueue(layoutPages, currentSentences);
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(p => p + 1);
      loadPageTranslations(pages, currentPage + 1, sentences);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(p => p - 1);
      loadPageTranslations(pages, currentPage - 1, sentences);
    }
  };

  if (!book) return <div style={{ padding: '20px' }}>Loading...</div>;

  const totalPages = pages.length;
  const currentPageIndices = totalPages > 0 && currentPage < totalPages ? pages[currentPage] : [];
  const firstSentenceIdx = currentPageIndices[0];
  const currentChapter = firstSentenceIdx !== undefined && sentences[firstSentenceIdx] ? sentences[firstSentenceIdx].chapterIndex : 0;
  const hasMoreToRead = currentPage < totalPages - 1 || (streamerRef.current?.hasMore() ?? false);

  return (
    <div className="reader-view reader-container" style={{ paddingBottom: '100px', backgroundColor: 'var(--color-white)', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Hidden Buffer for height calculation */}
      {isCalculatingLayout && (
        <div 
          ref={containerRef} 
          className="reader-container"
          style={{ position: 'absolute', top: '-9999px', left: '0', width: '100%', visibility: 'hidden', display: 'block' }}
        >
          {sentences.map((sentence, i) => (
            <SentencePair key={'calc-'+i} original={sentence.text} translated={sentence.text} />
          ))}
        </div>
      )}

      <header style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, height: '60px', 
        backgroundColor: 'rgba(255, 255, 255, 0.9)', zIndex: 100, display: 'flex', 
        alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(0,0,0,0.05)',
        backdropFilter: 'blur(8px)'
      }}>
        <button className="btn btn-secondary" style={{ padding: '0 12px', height: '36px', minWidth: 'auto', marginRight: '24px', fontSize: '0.85rem' }} onClick={() => navigate('/')}>
          Sair
        </button>
        
        <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--color-divider)', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
           {/* In continuous scrolling, we base progress on chapter index rather than exactly pages */}
          <div style={{ 
            width: `${((currentChapter + 1) / (book.chapters.length || 1)) * 100}%`, 
            height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.5s ease' 
          }} />
        </div>
        
        <div style={{ fontWeight: '500', marginLeft: '24px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          {Math.round(((currentChapter + 1) / (book.chapters.length || 1)) * 100)}% concluído
        </div>
      </header>
      
      <div style={{ paddingTop: '80px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      
      {!isCalculatingLayout && isTranslating ? (
        <TranslationProgress 
          current={translationProgress} 
          total={currentPageIndices.length} 
          message="Traduzindo página..." 
        />
      ) : !isCalculatingLayout && (
        <div style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', margin: 'auto 0' }}>
          {currentPageIndices.map(globalIdx => (
            <SentencePair 
              key={globalIdx} 
              original={sentences[globalIdx].text} 
              translated={translations[globalIdx]} 
            />
          ))}
          {currentPageIndices.length === 0 && !hasMoreToRead && (
            <div className="card" style={{ padding: '30px', textAlign: 'center' }}>Fim do Livro.</div>
          )}
        </div>
      )}

      </div>

      <div className="sticky-bottom-bar" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <button 
          className="btn btn-secondary" 
          onClick={handlePrev}
          disabled={currentPage === 0 || isTranslating || isCalculatingLayout}
          style={{ width: '48%' }}
        >
          Anterior
        </button>
        <button 
          className="btn" 
          onClick={handleNext}
          disabled={!hasMoreToRead || isTranslating || isCalculatingLayout}
          style={{ width: '48%' }}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
