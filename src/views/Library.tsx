import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBooks, saveBook, removeBook, getDB } from '../services/storageService';
import { parseEpub } from '../services/epubService';
import { useAuth } from '../components/AuthContext';
import { auth } from '../services/firebase';
import { uploadBookToCloud, getUserCloudBooks, downloadBookFromCloud, deleteBookFromCloud, fetchCloudTranslations } from '../services/cloudService';

type LibraryBook = {
  id: string;
  title: string;
  chapters?: any[];
  isCloudOnly?: boolean;
  storagePath?: string;
};

export default function Library() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Always load local books instantly on mount
    loadLocalBooks();
    
    // Subscribe to auth state so we reliably sync when user is confirmed
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Sync translations in background
        fetchCloudTranslations(user.uid).catch(err => {
          console.warn("Could not sync translations from cloud.", err);
        });
        // Sync books in background
        syncCloudBooks(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadLocalBooks = async () => {
    try {
      const localBooks = await getBooks();
      // Only keep local books if we are not actively syncing (otherwise we might overwrite cloud books on a re-render)
      // Actually, safest is to merge with current books state, giving preference to local
      setBooks(prev => {
        const cloudOnly = prev.filter(b => b.isCloudOnly);
        const localIds = new Set(localBooks.map(b => b.id));
        const missingCloud = cloudOnly.filter(cb => !localIds.has(cb.id));
        return [...localBooks, ...missingCloud];
      });
    } catch (err) {
      console.error("Critical error fetching local books", err);
    }
  };

  const syncCloudBooks = async (uid: string) => {
    try {
      setIsSyncing(true);
      const cloudBooks = await getUserCloudBooks(uid);
      const localBooks = await getBooks();
      
      const localIds = new Set(localBooks.map(b => b.id));
      const missingLocal = cloudBooks.filter(cb => !localIds.has(cb.id));
      
      setBooks([...localBooks, ...missingLocal]);
    } catch (err) {
      console.warn("Failed to fetch cloud books. An adblocker might be blocking Firestore.", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // 1. Process and save locally REALLY FAST
      const parsedBook = await parseEpub(file);
      const bookId = await saveBook(parsedBook);
      
      // 2. Refresh UI immediately
      await loadLocalBooks();
      
      // 3. Upload to cloud in the BACKGROUND without awaiting
      const currentUser = auth.currentUser;
      if (currentUser) {
        setIsSyncing(true);
        uploadBookToCloud(file, currentUser.uid, bookId, parsedBook.title)
          .catch((err: any) => {
            console.warn("Cloud upload failed, possibly due to an adblocker:", err);
          })
          .finally(() => setIsSyncing(false));
      }
      
    } catch (err) {
      console.error(err);
      alert('Erro ao processar arquivo EPUB.');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (book: LibraryBook) => {
    if (window.confirm('Tem certeza que deseja remover este livro?')) {
      setLoading(true); // UI block for deletion is very fast locally
      try {
        if (!book.isCloudOnly) {
          await removeBook(book.id);
        }
        await loadLocalBooks(); // Update UI immediately
        
        // Delete from cloud in background
        const currentUser = auth.currentUser;
        if (currentUser) {
          deleteBookFromCloud(currentUser.uid, book.id).catch(console.error);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRead = async (book: LibraryBook) => {
    if (book.isCloudOnly && book.storagePath) {
      setLoading(true);
      try {
         const blob = await downloadBookFromCloud(book.storagePath);
         const file = new File([blob], `${book.title}.epub`, { type: 'application/epub+zip' });
         const parsedBook = await parseEpub(file);
         
         const db = await getDB();
         await db.put('books', { ...parsedBook, id: book.id });
         
         navigate(`/reader?bookId=${book.id}`);
      } catch (err) {
         console.error('Download failed', err);
         alert('Erro ao baixar livro da nuvem. Verifique seu AdBlocker se estiver usando um.');
      } finally {
         setLoading(false);
      }
    } else {
      navigate(`/reader?bookId=${book.id}`);
    }
  };

  return (
    <>
      <header className="app-header" style={{ position: 'fixed', left: 0, right: 0, top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title">Leitor Paralelo</h1>
        <button 
          onClick={logout} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--color-primary)', 
            cursor: 'pointer', 
            fontWeight: 600,
            fontSize: '1rem',
            padding: '8px 16px'
          }}
        >
          Sair
        </button>
      </header>
      <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '100px 24px 40px' }}>
      <div className="library-view animate-fade-in-up">
      <div style={{ marginBottom: '40px' }}>
        <h2 className="title" style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '8px' }}>Comece a Ler</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', fontSize: '1.05rem', fontWeight: '400' }}>Adicione um novo arquivo EPUB e mergulhe no texto.</p>
        
        <label className="dropzone animate-fade-in-up animate-delay-100" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', padding: '64px 24px' }}>
          <div style={{ pointerEvents: 'none', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '16px' }}>📖</div>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text)', marginBottom: '8px', fontWeight: '500' }}>Toque ou arraste um livro aqui</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              {loading ? 'Processando livro, aguarde...' : 
               isSyncing ? 'Sincronizando com a nuvem...' : 
               'Formatos suportados: .epub'}
            </p>
          </div>
          <input 
            type="file" 
            accept=".epub" 
            onChange={handleFileUpload}
            disabled={loading}
            style={{ 
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
              opacity: 0, cursor: loading ? 'not-allowed' : 'pointer', height: '100%', width: '100%' 
            }} 
          />
        </label>
      </div>
      
      <div style={{ marginTop: '56px' }}>
        <h2 className="title" style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '24px' }}>Sua Biblioteca</h2>
        {books.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
             <p>Você ainda não adicionou nenhum livro.</p>
          </div>
        ) : (
          <div className="animate-fade-in-up animate-delay-200" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {books.map(book => (
              <div key={book.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', backgroundColor: 'var(--color-white)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--color-divider)' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--color-text)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {book.title}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: book.isCloudOnly ? '#3b82f6' : 'var(--color-text-secondary)' }}>
                    {book.isCloudOnly ? '☁️ Na Nuvem (Clique em Ler para Baixar)' : `${book.chapters?.length || 0} Capítulos (Local)`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" style={{ padding: '0 24px', height: '40px', borderRadius: '20px' }} onClick={() => handleRead(book)} disabled={loading}>
                    Ler
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '0 16px', height: '40px', borderRadius: '20px', backgroundColor: '#fee2e2', color: '#ef4444' }} 
                    onClick={() => handleDelete(book)}
                    title="Remover Livro"
                    disabled={loading}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
      </div>
    </>
  );
}
