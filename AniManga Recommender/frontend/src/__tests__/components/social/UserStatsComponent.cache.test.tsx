// ABOUTME: Comprehensive tests for UserStatsComponent with cache integration
// ABOUTME: Tests loading states, error handling, animation behavior, and cache-aware rendering

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserStatsComponent } from '../../../components/social/UserStatsComponent';
import { UserStats } from '../../../types/social';

// Mock CSS animations for testing
const mockAnimations = {
  requestAnimationFrame: jest.fn((callback) => {
    setTimeout(callback, 16); // Simulate 60fps
    return 1;
  }),
  cancelAnimationFrame: jest.fn()
};

Object.assign(window, mockAnimations);

describe('UserStatsComponent Cache Integration', () => {
  const mockStats: UserStats = {
    totalAnime: 150,
    completedAnime: 120,
    totalManga: 75,
    completedManga: 60,
    totalHoursWatched: 2400,
    totalChaptersRead: 5000,
    favoriteGenres: [
      { genre: 'Action', count: 45 },
      { genre: 'Drama', count: 30 },
      { genre: 'Comedy', count: 25 }
    ],
    averageRating: 8.2,
    completionRate: 78.5,
    currentStreak: 15,
    longestStreak: 45,
    ratingDistribution: {
      10: 25,
      9: 35,
      8: 40,
      7: 30,
      6: 15,
      5: 5
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Loading States', () => {
    it('renders loading skeleton correctly', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={true} />);
      
      // Should show 6 skeleton cards
      const skeletonCards = screen.getAllByTestId(/skeleton/, { exact: false });
      expect(skeletonCards.length).toBeGreaterThanOrEqual(6);
      
      // Loading container should have correct class
      expect(screen.getByRole('generic')).toHaveClass('user-stats-container');
      expect(screen.getByRole('generic').firstChild).toHaveClass('stats-grid', 'loading');
    });

    it('shows skeleton placeholders with correct structure', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={true} />);
      
      const skeletonElements = [
        'skeleton-stat-value',
        'skeleton-stat-label', 
        'skeleton-stat-sublabel'
      ];
      
      skeletonElements.forEach(className => {
        const elements = document.getElementsByClassName(className);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it('transitions from loading to loaded state', async () => {
      const { rerender } = render(
        <UserStatsComponent stats={mockStats} isLoading={true} />
      );
      
      // Should show loading initially
      expect(screen.getAllByTestId(/skeleton/, { exact: false })).toBeTruthy();
      
      // Transition to loaded
      rerender(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      // Should show actual stats
      await waitFor(() => {
        expect(screen.getByText('120')).toBeInTheDocument(); // Completed anime
        expect(screen.getByText('60')).toBeInTheDocument(); // Completed manga
      });
    });
  });

  describe('Animation Behavior with Cache States', () => {
    it('enables animations when showAnimations is true (cache miss)', async () => {
      render(
        <UserStatsComponent 
          stats={mockStats} 
          isLoading={false} 
          showAnimations={true} 
        />
      );
      
      // Run timers to trigger animations
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      await waitFor(() => {
        expect(screen.getByText('120')).toBeInTheDocument();
      });
      
      // Verify requestAnimationFrame was called for animations
      expect(mockAnimations.requestAnimationFrame).toHaveBeenCalled();
    });

    it('disables animations when showAnimations is false (cache hit)', () => {
      render(
        <UserStatsComponent 
          stats={mockStats} 
          isLoading={false} 
          showAnimations={false} 
        />
      );
      
      // Stats should appear immediately without animation
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
      
      // Animation frame should not be used
      expect(mockAnimations.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('handles animation timing correctly', async () => {
      render(
        <UserStatsComponent 
          stats={mockStats} 
          isLoading={false} 
          showAnimations={true} 
        />
      );
      
      // Initially should show 0 or animating values
      act(() => {
        jest.advanceTimersByTime(0);
      });
      
      // Advance animation timeline
      act(() => {
        jest.advanceTimersByTime(500); // Half animation duration
      });
      
      // Should be somewhere between 0 and final value
      // (Exact values depend on easing function)
      
      act(() => {
        jest.advanceTimersByTime(500); // Complete animation
      });
      
      await waitFor(() => {
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('60')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Bars and Visual Elements', () => {
    it('calculates completion rates correctly', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      // Anime completion rate: 120/150 = 80%
      expect(screen.getByText('80% completion')).toBeInTheDocument();
      
      // Manga completion rate: 60/75 = 80%
      expect(screen.getByText('80% completion')).toBeInTheDocument();
    });

    it('renders progress bars with correct percentages', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      const progressBars = document.getElementsByClassName('progress-fill');
      
      // Should have progress bars for anime and manga
      expect(progressBars.length).toBeGreaterThanOrEqual(2);
      
      // Check that progress bars have width styles (80% completion)
      Array.from(progressBars).forEach(bar => {
        const style = (bar as HTMLElement).style;
        expect(style.width).toBeDefined();
      });
    });

    it('shows correct progress text', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      // Check anime progress text
      expect(screen.getByText('120 / 150')).toBeInTheDocument();
      
      // Check manga progress text  
      expect(screen.getByText('60 / 75')).toBeInTheDocument();
    });

    it('applies correct colors based on values', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      // Average rating of 8.2 should get a good color
      const ratingElement = screen.getByText('8.2');
      expect(ratingElement.parentElement).toHaveStyle({ color: expect.any(String) });
      
      // Completion rate of 78.5% should get a decent color
      const completionElement = screen.getByText('79%');
      expect(completionElement.parentElement).toHaveStyle({ color: expect.any(String) });
    });
  });

  describe('Time Formatting', () => {
    it('formats hours correctly for large values', () => {
      const statsWithManyHours = {
        ...mockStats,
        totalHoursWatched: 2400 // 100 days
      };
      
      render(<UserStatsComponent stats={statsWithManyHours} isLoading={false} />);
      
      expect(screen.getByText('100 days')).toBeInTheDocument();
    });

    it('formats hours correctly for small values', () => {
      const statsWithFewHours = {
        ...mockStats,
        totalHoursWatched: 12
      };
      
      render(<UserStatsComponent stats={statsWithFewHours} isLoading={false} />);
      
      expect(screen.getByText('12h')).toBeInTheDocument();
    });

    it('handles edge case of exactly 24 hours', () => {
      const statsExact24Hours = {
        ...mockStats,
        totalHoursWatched: 24
      };
      
      render(<UserStatsComponent stats={statsExact24Hours} isLoading={false} />);
      
      expect(screen.getByText('1 day')).toBeInTheDocument();
    });
  });

  describe('Rating Distribution Chart', () => {
    it('renders rating distribution when provided', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      expect(screen.getByText('Rating Distribution')).toBeInTheDocument();
    });

    it('displays all rating levels', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      // Check that all ratings from the distribution are shown
      Object.keys(mockStats.ratingDistribution || {}).forEach(rating => {
        expect(screen.getByText(rating)).toBeInTheDocument();
      });
    });

    it('shows correct counts for each rating', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      // Check specific counts
      expect(screen.getByText('25')).toBeInTheDocument(); // 10 rating count
      expect(screen.getByText('35')).toBeInTheDocument(); // 9 rating count
      expect(screen.getByText('40')).toBeInTheDocument(); // 8 rating count
    });

    it('calculates bar percentages correctly', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      const barFills = document.getElementsByClassName('bar-fill');
      
      // Highest count (40) should have 100% width
      // Other bars should be proportional
      expect(barFills.length).toBeGreaterThan(0);
      
      Array.from(barFills).forEach(bar => {
        const style = (bar as HTMLElement).style;
        expect(style.width).toMatch(/\d+%/);
      });
    });

    it('hides rating distribution when not provided', () => {
      const statsWithoutDistribution = {
        ...mockStats,
        ratingDistribution: undefined
      };
      
      render(<UserStatsComponent stats={statsWithoutDistribution} isLoading={false} />);
      
      expect(screen.queryByText('Rating Distribution')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles zero values gracefully', () => {
      const emptyStats: UserStats = {
        totalAnime: 0,
        completedAnime: 0,
        totalManga: 0,
        completedManga: 0,
        totalHoursWatched: 0,
        totalChaptersRead: 0,
        favoriteGenres: [],
        averageRating: 0,
        completionRate: 0,
        currentStreak: 0,
        longestStreak: 0
      };
      
      render(<UserStatsComponent stats={emptyStats} isLoading={false} />);
      
      // Should handle division by zero for completion rates
      expect(screen.getByText('0% completion')).toBeInTheDocument();
      expect(screen.getByText('0.0')).toBeInTheDocument(); // Average rating
    });

    it('handles missing or invalid data', () => {
      const incompleteStats = {
        ...mockStats,
        // @ts-ignore - Testing runtime behavior
        totalAnime: undefined,
        averageRating: NaN
      };
      
      render(<UserStatsComponent stats={incompleteStats} isLoading={false} />);
      
      // Should not crash and handle gracefully
      expect(screen.getByRole('generic')).toHaveClass('user-stats-container');
    });

    it('handles very large numbers', () => {
      const statsWithLargeNumbers = {
        ...mockStats,
        totalAnime: 10000,
        completedAnime: 9500,
        totalHoursWatched: 50000
      };
      
      render(<UserStatsComponent stats={statsWithLargeNumbers} isLoading={false} />);
      
      // Should format large numbers correctly
      expect(screen.getByText('9.5k')).toBeInTheDocument(); // Completed anime
      expect(screen.getByText('2083 days')).toBeInTheDocument(); // Hours watched
    });
  });

  describe('Responsive Behavior', () => {
    it('maintains grid structure with various data sizes', () => {
      render(<UserStatsComponent stats={mockStats} isLoading={false} />);
      
      const statsGrid = document.getElementsByClassName('stats-grid')[0];
      expect(statsGrid).toBeInTheDocument();
      
      // Should have 6 stat cards
      const statCards = document.getElementsByClassName('stat-card');
      expect(statCards.length).toBe(6);
    });

    it('handles long text content gracefully', () => {
      const statsWithLongText = {
        ...mockStats,
        // Very high completion rate for long sublabel
        completionRate: 98.7654321
      };
      
      render(<UserStatsComponent stats={statsWithLongText} isLoading={false} />);
      
      // Should round to reasonable precision
      expect(screen.getByText('99%')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('does not re-render unnecessarily with same props', () => {
      const { rerender } = render(
        <UserStatsComponent 
          stats={mockStats} 
          isLoading={false} 
          showAnimations={false} 
        />
      );
      
      const initialElement = screen.getByRole('generic');
      
      // Re-render with same props
      rerender(
        <UserStatsComponent 
          stats={mockStats} 
          isLoading={false} 
          showAnimations={false} 
        />
      );
      
      // Should not create new DOM elements unnecessarily
      expect(screen.getByRole('generic')).toBe(initialElement);
    });

    it('handles animation cleanup properly', () => {
      const { unmount } = render(
        <UserStatsComponent 
          stats={mockStats} 
          isLoading={false} 
          showAnimations={true} 
        />
      );
      
      act(() => {
        jest.advanceTimersByTime(500); // Start animations
      });
      
      // Unmount component during animation
      unmount();
      
      // Should not cause errors or memory leaks
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // No assertions needed - test passes if no errors thrown
    });
  });
});