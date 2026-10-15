import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeroBanner } from '../components/HeroBanner';

describe('HeroBanner Component', () => {
  it('renders heading, description and search input', () => {
    const handleSearch = vi.fn();
    render(<HeroBanner onSearch={handleSearch} />);

    expect(screen.getByText(/Discover/i)).toBeInTheDocument();
    expect(screen.getByText(/stories/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search for books, authors/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('submits search when query is typed and submitted', () => {
    const handleSearch = vi.fn();
    render(<HeroBanner onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText(/Search for books, authors/i);
    fireEvent.change(input, { target: { value: 'Artificial Intelligence' } });

    const submitBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(submitBtn);

    expect(handleSearch).toHaveBeenCalledWith('Artificial Intelligence');
  });

  it('does not submit when search text is empty or whitespace', () => {
    const handleSearch = vi.fn();
    render(<HeroBanner onSearch={handleSearch} />);

    const input = screen.getByPlaceholderText(/Search for books, authors/i);
    fireEvent.change(input, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(submitBtn);

    expect(handleSearch).not.toHaveBeenCalled();
  });
});
