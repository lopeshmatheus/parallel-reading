import { useEffect, useState, useRef, useCallback } from 'react';
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
  
  const PREFETCH_WINDOW = 4; // Lookahead amount of pages

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
      setTranslations({}); // clear dictionary on chapter change
      if (extracted.length > 0) {
        setIsCalculatingLayout(true);
      } else {
        setIsCalculatingLayout(false);
        setPages([]);
        setCurrentPage(0);
      }
    }
  };

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
        // Since they are side-by-side, translation doesn't add much vertical height.
        // We just add a small buffer + the 40px margin-bottom from SentencePair
        const estimatedHeight = el.offsetHeight + 40; 
        
        if (currentHeight + estimatedHeight > availableHeight && currentPageIndices.length > 0) {
          // Push current page and start a new one
          newPages.push(currentPageIndices);
          currentPageIndices = [idx];
          currentHeight = estimatedHeight;
        } else {
          // Add to current page
          currentPageIndices.push(idx);
          currentHeight += estimatedHeight;
        }
      });
      
      if (currentPageIndices.length > 0) {
        newPages.push(currentPageIndices);
      }
      
      // Fallback if measurement failed (e.g. everything was 0 height)
      if (newPages.length === 0 || newPages[0].length === 0) {
         console.warn("Layout calc failed or empty, falling back to 10 sentences per page");
         const fallbackPages = [];
         for(let i = 0; i < sentences.length; i+= 10) {
            fallbackPages.push(sentences.slice(i, i+10).map((_, localIdx) => i + localIdx));
         }
         setPages(fallbackPages);
         setCurrentPage(0);
         setIsCalculatingLayout(false);
         loadPageTranslations(fallbackPages, 0, sentences);
         return;
      }
      
      setPages(newPages);
      setCurrentPage(0);
      setIsCalculatingLayout(false);
      
      // Load first page immediately
      if (newPages.length > 0) {
        loadPageTranslations(newPages, 0, sentences);
      }
    }
  }, [isCalculatingLayout, sentences]);

  const loadPageTranslations = async (layoutPages: number[][], pageIndex: number, currentSentences: string[]) => {
    if (pageIndex >= layoutPages.length) return;
    
    const indices = layoutPages[pageIndex];
    
    // Check if we already have these translations in state to avoid loading bar flashing
    setTranslations((prev) => {
      const isCompletelyTranslated = indices.every(i => prev[i] !== undefined);
      if (isCompletelyTranslated) {
         triggerPrefetch(pageIndex, layoutPages, currentSentences);
         return prev;
      }
      
      // Not translated, proceed with load
      loadAsync(layoutPages, pageIndex, currentSentences);
      return prev;
    });
  };

  const loadAsync = async (layoutPages: number[][], pageIndex: number, currentSentences: string[]) => {
    setIsTranslating(true);
    setTranslationProgress(0);
    
    const indices = layoutPages[pageIndex];
    const pageSentences = indices.map(i => currentSentences[i]);
    
    try {
      const simInt = setInterval(() => {
        setTranslationProgress(p => (p < pageSentences.length ? p + 1 : p));
      }, 300);

      const translated = await translateSentences(pageSentences);
      clearInterval(simInt);
      
      setTranslations(prev => {
        const next = { ...prev };
        indices.forEach((globalIdx, localIdx) => {
          next[globalIdx] = translated[localIdx];
        });
        return next;
      });
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

  const triggerPrefetch = useCallback((currentPageIdx: number, layoutPages: number[][], currentSentences: string[]) => {
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

  const processPrefetchQueue = async (layoutPages: number[][], currentSentences: string[]) => {
     if (prefetchQueue.current.length === 0) {
       isPrefetching.current = false;
       return;
     }
     isPrefetching.current = true;
     const pageIdx = prefetchQueue.current.shift()!;
     const indices = layoutPages[pageIdx];
     
     // Only prefetch if we don't have it in state
     // We do a hacky check by looking at the first sentence of the page
     let needsFetch = false;
     setTranslations(prev => {
       needsFetch = indices.some(i => prev[i] === undefined);
       return prev;
     });

     if (needsFetch) {
       const pageSentences = indices.map(i => currentSentences[i]);
       try {
         // Grace period between background requests
         await new Promise(r => setTimeout(r, 1500)); 
         const translated = await translateSentences(pageSentences);
         setTranslations(prev => {
           const next = { ...prev };
           indices.forEach((globalIdx, localIdx) => {
             next[globalIdx] = translated[localIdx];
           });
           return next;
         });
       } catch(e) {
         console.error("Prefetch error", e);
       }
     }
     
     // Recurse
     processPrefetchQueue(layoutPages, currentSentences);
  };

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(p => p + 1);
      loadPageTranslations(pages, currentPage + 1, sentences);
    } else if (book && currentChapterIndex < book.chapters.length - 1) {
      loadChapter(book, currentChapterIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(p => p - 1);
      loadPageTranslations(pages, currentPage - 1, sentences);
    } else if (book && currentChapterIndex > 0) {
      loadChapter(book, currentChapterIndex - 1);
    }
  };

  if (!book) return <div style={{ padding: '20px' }}>Loading...</div>;

  const totalPages = pages.length;
  const currentPageIndices = totalPages > 0 && currentPage < totalPages ? pages[currentPage] : [];

  return (
    <div className="reader-view" style={{ paddingBottom: '120px', backgroundColor: 'var(--color-white)', minHeight: '100vh', padding: '0 8%' }}>
      
      {/* Hidden Buffer for height calculation */}
      {isCalculatingLayout && (
        <div 
          ref={containerRef} 
          style={{ position: 'absolute', top: '-9999px', left: '0', width: '100%', padding: '0 8%', visibility: 'hidden', display: 'block' }}
        >
          {sentences.map((orig, i) => (
            <SentencePair key={'calc-'+i} original={orig} translated={undefined} />
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
          <div style={{ 
            width: `${((currentPage + 1) / (totalPages || 1)) * 100}%`, 
            height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.3s ease' 
          }} />
        </div>
        
        <div style={{ fontWeight: '500', marginLeft: '24px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          Página {currentPage + 1} de {totalPages || 1}
        </div>
      </header>
      
      <div style={{ paddingTop: '100px' }}>
      
      {!isCalculatingLayout && isTranslating ? (
        <TranslationProgress 
          current={translationProgress} 
          total={currentPageIndices.length} 
          message="Traduzindo página..." 
        />
      ) : !isCalculatingLayout && (
        <div style={{ minHeight: '300px' }}>
          {currentPageIndices.map(globalIdx => (
            <SentencePair 
              key={globalIdx} 
              original={sentences[globalIdx]} 
              translated={translations[globalIdx]} 
            />
          ))}
          {currentPageIndices.length === 0 && (
            <div className="card" style={{ padding: '30px', textAlign: 'center' }}>Capítulo vazio.</div>
          )}
        </div>
      )}

      </div>

      <div className="sticky-bottom-bar" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <button 
          className="btn btn-secondary" 
          onClick={handlePrev}
          disabled={currentPage === 0 && currentChapterIndex === 0 || isTranslating || isCalculatingLayout}
          style={{ width: '48%' }}
        >
          Anterior
        </button>
        <button 
          className="btn" 
          onClick={handleNext}
          disabled={(currentPage >= Math.max(0, totalPages - 1) && currentChapterIndex === book.chapters.length - 1) || isTranslating || isCalculatingLayout}
          style={{ width: '48%' }}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
