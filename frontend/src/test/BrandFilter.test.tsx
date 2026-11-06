import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandFilter } from '../components/BrandFilter';
import { Brand } from '../types';

const mockBrands: Brand[] = [
  { id: 'b1', name: "O'Reilly Media", slug: 'oreilly-media' },
  { id: 'b2', name: 'MIT Press', slug: 'mit-press' },
];

describe('BrandFilter Component', () => {
  it('renders all brands and allows selection', () => {
    const handleSelectBrand = vi.fn();

    render(
      <BrandFilter
        brands={mockBrands}
        selectedBrandSlug={null}
        onSelectBrand={handleSelectBrand}
      />,
    );

    expect(screen.getByText('Publishers & Brands')).toBeInTheDocument();
    expect(screen.getByText('All Publishers')).toBeInTheDocument();
    expect(screen.getByText("O'Reilly Media")).toBeInTheDocument();
    expect(screen.getByText('MIT Press')).toBeInTheDocument();

    fireEvent.click(screen.getByText("O'Reilly Media"));
    expect(handleSelectBrand).toHaveBeenCalledWith('oreilly-media');
  });

  it('renders clear button and allows unselecting active brand', () => {
    const handleSelectBrand = vi.fn();

    render(
      <BrandFilter
        brands={mockBrands}
        selectedBrandSlug="oreilly-media"
        onSelectBrand={handleSelectBrand}
      />,
    );

    const clearBtn = screen.getByText('Clear');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(handleSelectBrand).toHaveBeenCalledWith(null);

    // Click active brand to toggle off
    fireEvent.click(screen.getByText("O'Reilly Media"));
    expect(handleSelectBrand).toHaveBeenCalledWith(null);
  });
});
