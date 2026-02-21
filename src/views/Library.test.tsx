import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Library from './Library';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../services/storageService', () => ({
  getBooks: vi.fn(),
  saveBook: vi.fn(),
  removeBook: vi.fn(),
}));

vi.mock('../services/epubService', () => ({
  parseEpub: vi.fn()
}));

vi.mock('../components/AuthContext', () => ({
  useAuth: vi.fn(() => ({ logout: vi.fn(), user: { uid: '123' } })),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('Library View', () => {
  it('should render the upload area and empty state initially', async () => {
    const { getBooks } = await import('../services/storageService');
    vi.mocked(getBooks).mockResolvedValue([]);

    renderWithRouter(<Library />);
    
    expect(screen.getByText('Toque ou arraste um livro aqui')).toBeInTheDocument();
    expect(await screen.findByText('Você ainda não adicionou nenhum livro.')).toBeInTheDocument();
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
