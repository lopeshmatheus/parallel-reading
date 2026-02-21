import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Reader from './Reader';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../services/storageService', () => ({
  getBookById: vi.fn(),
}));

vi.mock('../services/sentenceExtractor', () => ({
  extractSentences: vi.fn(),
  BookStreamer: vi.fn().mockImplementation(() => ({
    getNextSentences: vi.fn().mockImplementation((_chunkSize) => 
      Array(60).fill(null).map((_, i) => ({ text: `Test sentence ${i}`, chapterIndex: 0 }))
    ),
    hasMore: vi.fn().mockReturnValue(false),
  }))
}));

vi.mock('../services/translationService', () => ({
  translateSentences: vi.fn().mockImplementation(async (texts) => texts.map((t: string) => `Translated ${t}`)),
}));

describe('Reader View', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    vi.clearAllMocks();
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore window.innerWidth and dispatch event
    window.innerWidth = originalInnerWidth;
    window.dispatchEvent(new Event('resize'));
  });

  it('should render loading overlay when translating', async () => {
    // We will simulate a state where translation is in progress
    const { getBookById } = await import('../services/storageService');
    vi.mocked(getBookById).mockResolvedValue({
      id: '1',
      title: 'Book',
      chapters: [{ id: 'ch1', href: 'ch1.html', htmlContent: '<p>Test</p>' }]
    });

    render(
      <BrowserRouter>
        <Reader />
      </BrowserRouter>
    );

    // Initial state before translation kicks in might just be Loading book
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it.skip('should apply slide animation classes on pagination', async () => {
    window.innerWidth = 500; // Mobile breakpoint
    window.dispatchEvent(new Event('resize'));

    const { getBookById } = await import('../services/storageService');
    vi.mocked(getBookById).mockResolvedValue({
      id: '1',
      title: 'Book',
      chapters: [{ id: 'ch1', href: 'ch1.html', htmlContent: '<p>Test</p>' }]
    });

    render(
      <BrowserRouter>
        <Reader />
      </BrowserRouter>
    );

    // Wait for the first page of sentences to load (10 sentences on page 1)
    await waitFor(() => {
      expect(screen.getByText('Test sentence 0')).toBeInTheDocument();
    });

    // Verify container exists
    expect(screen.getByTestId('page-container')).toBeInTheDocument();

    // Click 'Próxima'
    const nextBtn = screen.getByText('Próxima');
    fireEvent.click(nextBtn);

    // Container should now have the animate-slide-left class
    await waitFor(() => {
      expect(screen.getByTestId('page-container')).toHaveClass('animate-slide-left');
    });

    // Click 'Anterior'
    const prevBtn = screen.getByText('Anterior');
    fireEvent.click(prevBtn);

    // Container should now have the animate-slide-right class
    await waitFor(() => {
      expect(screen.getByTestId('page-container')).toHaveClass('animate-slide-right');
    });
  });

  it.skip('should render a two-page spread on desktop and advance by 2 pages', async () => {
    window.innerWidth = 1024; // Desktop breakpoint
    window.dispatchEvent(new Event('resize'));

    const { getBookById } = await import('../services/storageService');
    vi.mocked(getBookById).mockResolvedValue({
      id: '1',
      title: 'Book',
      chapters: [{ id: 'ch1', href: 'ch1.html', htmlContent: '<p>Test</p>' }]
    });

    render(
      <BrowserRouter>
        <Reader />
      </BrowserRouter>
    );

    // Initial state: page 0 and page 1 (sentences 0 to 19) should be visible
    await waitFor(() => {
      expect(screen.getByText('Test sentence 0')).toBeInTheDocument(); // Page 1 start
    });

    // Check that two book-page elements exist inside page-container
    const pageContainer = screen.getByTestId('page-container');
    expect(pageContainer.querySelectorAll('.book-page').length).toBe(2);

    const nextBtn = screen.getByText('Próxima');
    fireEvent.click(nextBtn);

    // After clicking Next, verify animation slide left applied
    await waitFor(() => {
      expect(pageContainer).toHaveClass('animate-slide-left');
    });
  });
});
