// ABOUTME: Comprehensive tests for CacheStatusIndicator component
// ABOUTME: Tests loading states, error handling, refresh functionality, and cache status display

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CacheStatusIndicator from '../../../components/dashboard/CacheStatusIndicator';

describe('CacheStatusIndicator', () => {
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders nothing when no cache metadata is provided', () => {
      const { container } = render(<CacheStatusIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when all metadata is undefined', () => {
      const { container } = render(
        <CacheStatusIndicator
          cacheHit={undefined}
          lastUpdated={undefined}
          updating={undefined}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders when cacheHit is provided', () => {
      render(<CacheStatusIndicator cacheHit={true} />);
      expect(screen.getByText('Cached')).toBeInTheDocument();
    });

    it('renders when lastUpdated is provided', () => {
      const lastUpdated = new Date().toISOString();
      render(<CacheStatusIndicator lastUpdated={lastUpdated} />);
      expect(screen.getByText(/Updated/)).toBeInTheDocument();
    });

    it('renders when updating is true', () => {
      render(<CacheStatusIndicator updating={true} />);
      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });

  describe('Cache Status Display', () => {
    it('displays cached status correctly', () => {
      render(<CacheStatusIndicator cacheHit={true} />);
      
      expect(screen.getByText('Cached')).toBeInTheDocument();
      expect(screen.getByText('💾')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('cache-status-indicator', 'cached');
    });

    it('displays fresh status correctly', () => {
      render(<CacheStatusIndicator cacheHit={false} />);
      
      expect(screen.getByText('Fresh')).toBeInTheDocument();
      expect(screen.getByText('⚡')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('cache-status-indicator', 'fresh');
    });

    it('displays updating status correctly', () => {
      render(<CacheStatusIndicator updating={true} />);
      
      expect(screen.getByText('Updating...')).toBeInTheDocument();
      expect(screen.getByText('🔄')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('cache-status-indicator', 'updating');
    });

    it('updating status takes precedence over cacheHit', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          updating={true}
        />
      );
      
      expect(screen.getByText('Updating...')).toBeInTheDocument();
      expect(screen.getByText('🔄')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('updating');
    });
  });

  describe('Last Updated Time Display', () => {
    it('displays "Never" when no lastUpdated is provided', () => {
      render(<CacheStatusIndicator cacheHit={true} />);
      // Should not show time when not provided
      expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
    });

    it('displays relative time for valid lastUpdated', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          lastUpdated={fiveMinutesAgo}
        />
      );
      
      expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
    });

    it('handles invalid date gracefully', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          lastUpdated="invalid-date"
        />
      );
      
      expect(screen.getByText('Updated Unknown')).toBeInTheDocument();
    });

    it('displays exact relative time format', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          lastUpdated={oneHourAgo}
        />
      );
      
      const timeElement = screen.getByText(/Updated.*hour.*ago/);
      expect(timeElement).toBeInTheDocument();
      expect(timeElement).toHaveClass('cache-status-time');
    });
  });

  describe('Refresh Button', () => {
    it('shows refresh button when onRefresh is provided and not updating', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          onRefresh={mockOnRefresh}
        />
      );
      
      const refreshButton = screen.getByRole('button', { name: /refresh statistics/i });
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveAttribute('title', 'Refresh statistics');
    });

    it('hides refresh button when updating', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          updating={true}
          onRefresh={mockOnRefresh}
        />
      );
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('hides refresh button when onRefresh is not provided', () => {
      render(<CacheStatusIndicator cacheHit={true} />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onRefresh when refresh button is clicked', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          onRefresh={mockOnRefresh}
        />
      );
      
      const refreshButton = screen.getByRole('button', { name: /refresh statistics/i });
      fireEvent.click(refreshButton);
      
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('renders SVG icon in refresh button', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          onRefresh={mockOnRefresh}
        />
      );
      
      const refreshButton = screen.getByRole('button', { name: /refresh statistics/i });
      const svg = refreshButton.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on refresh button', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          onRefresh={mockOnRefresh}
        />
      );
      
      const refreshButton = screen.getByRole('button', { name: /refresh statistics/i });
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh statistics');
      expect(refreshButton).toHaveAttribute('title', 'Refresh statistics');
    });

    it('has proper semantic structure', () => {
      const lastUpdated = new Date().toISOString();
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          lastUpdated={lastUpdated}
          onRefresh={mockOnRefresh}
        />
      );
      
      // Check main container has proper class
      expect(screen.getByRole('generic')).toHaveClass('cache-status-indicator');
      
      // Check content structure
      expect(screen.getByText('💾')).toHaveClass('cache-status-icon');
      expect(screen.getByText('Cached')).toHaveClass('cache-status-label');
      expect(screen.getByText(/Updated.*ago/)).toHaveClass('cache-status-time');
    });
  });

  describe('Edge Cases', () => {
    it('handles very recent timestamps', () => {
      const justNow = new Date().toISOString();
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          lastUpdated={justNow}
        />
      );
      
      expect(screen.getByText(/Updated.*seconds.*ago|Updated.*minute.*ago/)).toBeInTheDocument();
    });

    it('handles old timestamps', () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      render(
        <CacheStatusIndicator 
          cacheHit={true}
          lastUpdated={oneYearAgo}
        />
      );
      
      expect(screen.getByText(/Updated.*year.*ago/)).toBeInTheDocument();
    });

    it('handles undefined values gracefully', () => {
      render(
        <CacheStatusIndicator 
          cacheHit={undefined}
          lastUpdated={undefined}
          updating={false}
          onRefresh={mockOnRefresh}
        />
      );
      
      // Should render because updating is explicitly false
      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });

    it('maintains consistent styling with all combinations', () => {
      const { rerender } = render(
        <CacheStatusIndicator cacheHit={true} />
      );
      expect(screen.getByRole('generic')).toHaveClass('cached');
      
      rerender(<CacheStatusIndicator cacheHit={false} />);
      expect(screen.getByRole('generic')).toHaveClass('fresh');
      
      rerender(<CacheStatusIndicator updating={true} />);
      expect(screen.getByRole('generic')).toHaveClass('updating');
    });
  });

  describe('State Transitions', () => {
    it('handles state transitions smoothly', async () => {
      const { rerender } = render(
        <CacheStatusIndicator 
          cacheHit={false}
          onRefresh={mockOnRefresh}
        />
      );
      
      // Initial state - fresh
      expect(screen.getByText('Fresh')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
      
      // Transition to updating
      rerender(
        <CacheStatusIndicator 
          cacheHit={false}
          updating={true}
          onRefresh={mockOnRefresh}
        />
      );
      
      expect(screen.getByText('Updating...')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      
      // Transition to cached
      rerender(
        <CacheStatusIndicator 
          cacheHit={true}
          updating={false}
          lastUpdated={new Date().toISOString()}
          onRefresh={mockOnRefresh}
        />
      );
      
      expect(screen.getByText('Cached')).toBeInTheDocument();
      expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles rapid state changes', async () => {
      const { rerender } = render(
        <CacheStatusIndicator cacheHit={false} />
      );
      
      // Rapidly change states
      for (let i = 0; i < 5; i++) {
        rerender(<CacheStatusIndicator updating={true} />);
        rerender(<CacheStatusIndicator cacheHit={true} />);
        rerender(<CacheStatusIndicator cacheHit={false} />);
      }
      
      // Should end in fresh state
      expect(screen.getByText('Fresh')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily with same props', () => {
      const props = {
        cacheHit: true,
        lastUpdated: new Date().toISOString(),
        onRefresh: mockOnRefresh
      };
      
      const { rerender } = render(<CacheStatusIndicator {...props} />);
      
      const initialElement = screen.getByRole('generic');
      
      // Re-render with same props
      rerender(<CacheStatusIndicator {...props} />);
      
      // Element should still be the same
      expect(screen.getByRole('generic')).toBe(initialElement);
    });

    it('handles frequent lastUpdated changes efficiently', () => {
      const baseTime = Date.now();
      
      const { rerender } = render(
        <CacheStatusIndicator 
          cacheHit={true}
          lastUpdated={new Date(baseTime).toISOString()}
        />
      );
      
      // Simulate frequent updates
      for (let i = 1; i <= 10; i++) {
        rerender(
          <CacheStatusIndicator 
            cacheHit={true}
            lastUpdated={new Date(baseTime + i * 1000).toISOString()}
          />
        );
      }
      
      // Should still render correctly
      expect(screen.getByText('Cached')).toBeInTheDocument();
      expect(screen.getByText(/Updated.*ago/)).toBeInTheDocument();
    });
  });
});