import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBooks, saveBook, removeBook } from '../services/storageService';
import { parseEpub, type Book } from '../services/epubService';
import { useAuth } from '../components/AuthContext';

export default function Library() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [books, setBooks] = useState<(Book & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    const data = await getBooks();
    setBooks(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const parsedBook = await parseEpub(file);
      await saveBook(parsedBook);
      await fetchBooks();
    } catch (err) {
      alert('Erro ao processar arquivo EPUB.');
    } finally {
      setLoading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este livro?')) {
      await removeBook(id);
      await fetchBooks();
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
              {loading ? 'Processando seu livro, aguarde...' : 'Formatos suportados: .epub'}
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
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--color-text)', marginBottom: '4px' }}>{book.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {book.chapters.length} Capítulos
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-secondary" style={{ padding: '0 24px', height: '40px', borderRadius: '20px' }} onClick={() => navigate(`/reader?bookId=${book.id}`)}>
                    Ler
                  </button>
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: '0 16px', height: '40px', borderRadius: '20px', backgroundColor: '#fee2e2', color: '#ef4444' }} 
                    onClick={() => handleDelete(book.id)}
                    title="Remover Livro"
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
