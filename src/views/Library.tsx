import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getBooks, saveBook } from '../services/storageService';
import { parseEpub, type Book } from '../services/epubService';

export default function Library() {
  const navigate = useNavigate();
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

  return (
    <div className="library-view">
      <div className="card-brutal" style={{ marginBottom: '20px' }}>
        <h2>Importar Novo Livro</h2>
        <p>Faça upload de um arquivo EPUB para começar a leitura paralela.</p>
        <div style={{ marginTop: '15px' }}>
          <input 
            type="file" 
            accept=".epub" 
            onChange={handleFileUpload}
            disabled={loading}
            className="btn-brutal" 
            style={{ marginRight: '10px' }} 
          />
          {loading && <span>Processando...</span>}
        </div>
      </div>
      
      <div className="card-brutal">
        <h2>Meus Livros</h2>
        {books.length === 0 ? (
          <p>Biblioteca vazia. Comece importando um novo livro!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginTop: '15px' }}>
            {books.map(book => (
              <div key={book.id} className="card-brutal" style={{ padding: '15px', backgroundColor: '#e2f1f8' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>{book.title}</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>{book.chapters.length} Capítulos</p>
                <button className="btn-brutal" onClick={() => navigate(`/reader?bookId=${book.id}`)}>
                  Ler
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
