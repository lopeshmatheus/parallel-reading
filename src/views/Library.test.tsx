import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Library from './Library';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../services/storageService', () => ({
  getBooks: vi.fn(),
  saveBook: vi.fn()
}));

vi.mock('../services/epubService', () => ({
  parseEpub: vi.fn()
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('Library View', () => {
  it('should render the upload area and empty state initially', async () => {
    const { getBooks } = await import('../services/storageService');
    vi.mocked(getBooks).mockResolvedValue([]);

    renderWithRouter(<Library />);
    
    expect(screen.getByText('Importar Novo Livro')).toBeInTheDocument();
    expect(screen.getByText('Biblioteca vazia. Comece importando um novo livro!')).toBeInTheDocument();
  });

  it('should render books when available', async () => {
    const { getBooks } = await import('../services/storageService');
    vi.mocked(getBooks).mockResolvedValue([
      { id: '1', title: 'Dom Casmurro', chapters: [] }
    ]);

    renderWithRouter(<Library />);

    await waitFor(() => {
      expect(screen.getByText('Dom Casmurro')).toBeInTheDocument();
    });
  });
});
