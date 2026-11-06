import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandBrowseView } from '../components/BrandBrowseView';
import { Brand } from '../types';

const mockBrands: Brand[] = [
  { id: 'b1', name: "O'Reilly Media", slug: 'oreilly-media', description: 'Tech publisher' },
  { id: 'b2', name: 'MIT Press', slug: 'mit-press', description: 'Academic press' },
  { id: 'b3', name: 'Penguin Random House', slug: 'penguin-random-house', logoUrl: 'https://example.com/logo.png' },
];

describe('BrandBrowseView Component', () => {
  it('renders header, alphabet letters and publisher cards', () => {
    const handleSelectBrand = vi.fn();

    render(
      <BrandBrowseView
        brands={mockBrands}
        onSelectBrand={handleSelectBrand}
      />,
    );

    expect(screen.getByText('Browse by Brand')).toBeInTheDocument();
    expect(screen.getByText("O'Reilly Media")).toBeInTheDocument();
    expect(screen.getByText('MIT Press')).toBeInTheDocument();
    expect(screen.getByText('Penguin Random House')).toBeInTheDocument();
  });

  it('filters brands by alphabet letter', () => {
    render(
      <BrandBrowseView
        brands={mockBrands}
        onSelectBrand={vi.fn()}
      />,
    );

    // Filter by M
    const letterM = screen.getByRole('button', { name: 'M' });
    fireEvent.click(letterM);

    expect(screen.getByText('MIT Press')).toBeInTheDocument();
    expect(screen.queryByText("O'Reilly Media")).not.toBeInTheDocument();

    // Reset to All
    const letterAll = screen.getByRole('button', { name: 'All' });
    fireEvent.click(letterAll);
    expect(screen.getByText("O'Reilly Media")).toBeInTheDocument();
  });

  it('calls onSelectBrand when clicking a brand card', () => {
    const handleSelectBrand = vi.fn();

    render(
      <BrandBrowseView
        brands={mockBrands}
        onSelectBrand={handleSelectBrand}
      />,
    );

    fireEvent.click(screen.getByText("O'Reilly Media"));
    expect(handleSelectBrand).toHaveBeenCalledWith('oreilly-media');
  });
});
