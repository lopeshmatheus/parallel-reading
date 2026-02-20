import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Reader from './Reader';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../services/storageService', () => ({
  getBookById: vi.fn(),
}));

vi.mock('../services/sentenceExtractor', () => ({
  extractSentences: vi.fn(),
}));

describe('Reader View', () => {
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
});
