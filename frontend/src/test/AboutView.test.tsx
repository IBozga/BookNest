import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AboutView } from '../components/AboutView';

describe('AboutView Component', () => {
  it('renders about header, mission and feature sections', () => {
    const handleExplore = vi.fn();

    render(<AboutView onExploreBooks={handleExplore} />);

    expect(screen.getByText('About BookNest')).toBeInTheDocument();
    expect(screen.getByText(/Connecting Curious Minds with World-Class Digital Literature/i)).toBeInTheDocument();
    expect(screen.getByText('A Modern Reading Sanctuary Built for Lifelong Readers')).toBeInTheDocument();
    expect(screen.getByText('Curated Quality')).toBeInTheDocument();
    expect(screen.getByText('Instant Access')).toBeInTheDocument();
    expect(screen.getByText('Multi-Currency')).toBeInTheDocument();
    expect(screen.getByText('Reader Rewards')).toBeInTheDocument();
    expect(screen.getByText('256-Bit Encrypted')).toBeInTheDocument();

    const exploreBtn = screen.getByRole('button', { name: /Explore Our Catalogue/i });
    fireEvent.click(exploreBtn);
    expect(handleExplore).toHaveBeenCalled();
  });
});
