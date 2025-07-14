// ABOUTME: Comprehensive tests for useUserProfile hook with cache integration
// ABOUTME: Tests cache metadata handling, polling behavior, refresh functionality, and error states

import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserProfile } from '../../hooks/useUserProfile';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: { session: { access_token: 'mock-token' } }
      }))
    }
  }
}));

describe('useUserProfile Cache Integration', () => {
  const mockUsername = 'testuser';
  const mockProfileResponse = {
    id: 'user-123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: '2023-01-01T00:00:00Z',
    is_self: false,
    is_following: false,
    follower_count: 10,
    following_count: 5
  };

  const mockStatsResponse = {
    stats: {
      user_id: 'user-123',
      total_anime_watched: 100,
      total_manga_read: 50,
      completion_rate: 0.85,
      current_streak_days: 7,
      favorite_genres: [
        { genre: 'Action', count: 25 },
        { genre: 'Drama', count: 15 }
      ],
      rating_distribution: {
        10: 20,
        9: 30,
        8: 35
      }
    },
    cache_hit: true,
    last_updated: '2024-01-15T10:30:00Z',
    updating: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Default successful responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/profile')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProfileResponse)
        });
      }
      if (url.includes('/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockStatsResponse)
        });
      }
      if (url.includes('/lists')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ lists: [] })
        });
      }
      if (url.includes('/activity')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Cache Metadata Handling', () => {
    it('extracts cache metadata from new format response', async () => {
      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statsCacheHit).toBe(true);
      expect(result.current.statsLastUpdated).toBe('2024-01-15T10:30:00Z');
      expect(result.current.statsUpdating).toBe(false);
    });

    it('handles old format response without cache metadata', async () => {
      const oldFormatResponse = {
        user_id: 'user-123',
        total_anime_watched: 100,
        completion_rate: 0.85
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(oldFormatResponse)
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statsCacheHit).toBeUndefined();
      expect(result.current.statsLastUpdated).toBeUndefined();
      expect(result.current.statsUpdating).toBe(false);
    });

    it('handles cache miss with updating status', async () => {
      const cacheMissResponse = {
        ...mockStatsResponse,
        cache_hit: false,
        updating: true,
        last_updated: undefined
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(cacheMissResponse)
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statsCacheHit).toBe(false);
      expect(result.current.statsLastUpdated).toBeUndefined();
      expect(result.current.statsUpdating).toBe(true);
    });
  });

  describe('Polling Behavior', () => {
    it('starts polling when stats are updating', async () => {
      const updatingResponse = {
        ...mockStatsResponse,
        updating: true
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(updatingResponse)
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statsUpdating).toBe(true);

      // Clear initial calls
      mockFetch.mockClear();

      // Advance timer to trigger polling
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/stats'),
          expect.any(Object)
        );
      });
    });

    it('stops polling when updating is complete', async () => {
      let callCount = 0;
      const responses = [
        { ...mockStatsResponse, updating: true },
        { ...mockStatsResponse, updating: true },
        { ...mockStatsResponse, updating: false, cache_hit: true }
      ];

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          const response = responses[callCount] || responses[responses.length - 1];
          callCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(response)
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should start polling
      expect(result.current.statsUpdating).toBe(true);

      // Advance time to trigger several polls
      act(() => {
        jest.advanceTimersByTime(6000); // 2 poll intervals
      });

      await waitFor(() => {
        expect(result.current.statsUpdating).toBe(false);
      });

      // Clear calls from polling
      mockFetch.mockClear();

      // Advance time further - should not poll anymore
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // Should not make additional calls
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('cleans up polling interval on unmount', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { result, unmount } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start polling by setting updating to true
      act(() => {
        // Simulate polling state
        jest.advanceTimersByTime(3000);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Manual Refresh Functionality', () => {
    it('refetches stats with force refresh parameter', async () => {
      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear initial fetch calls
      mockFetch.mockClear();

      // Trigger manual refresh
      await act(async () => {
        await result.current.refetchStats(true);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('refresh=true'),
        expect.any(Object)
      );
    });

    it('refetches stats without force refresh parameter', async () => {
      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockClear();

      await act(async () => {
        await result.current.refetchStats(false);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.not.stringContaining('refresh=true'),
        expect.any(Object)
      );
    });

    it('handles refresh errors gracefully', async () => {
      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock fetch to fail on refresh
      mockFetch.mockImplementationOnce(() => 
        Promise.reject(new Error('Network error'))
      );

      await act(async () => {
        await result.current.refetchStats(true);
      });

      // Should not crash and maintain existing state
      expect(result.current.stats).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles stats API errors gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: false,
            status: 500
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should set default empty stats
      expect(result.current.stats).toEqual({
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
      });
    });

    it('handles 404 stats responses', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: false,
            status: 404
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should set empty stats for 404
      expect(result.current.stats?.totalAnime).toBe(0);
    });

    it('handles network errors during polling', async () => {
      let isFirstCall = true;
      
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          if (isFirstCall) {
            isFirstCall = false;
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                ...mockStatsResponse,
                updating: true
              })
            });
          } else {
            return Promise.reject(new Error('Network error'));
          }
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.statsUpdating).toBe(true);

      // Advance timer to trigger polling that will fail
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should not crash and maintain existing state
      await waitFor(() => {
        expect(result.current.stats).toBeTruthy();
      });
    });
  });

  describe('Data Transformation', () => {
    it('transforms API response to frontend format correctly', async () => {
      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const stats = result.current.stats;
      expect(stats).toEqual({
        totalAnime: 100, // total_anime_watched
        completedAnime: 100, // total_anime_watched 
        totalManga: 50, // total_manga_read
        completedManga: 50, // total_manga_read
        totalHoursWatched: 0, // Not in mock response
        totalChaptersRead: 0, // Not in mock response
        favoriteGenres: [
          { genre: 'Action', count: 25 },
          { genre: 'Drama', count: 15 }
        ],
        averageRating: 0, // average_score not in mock
        completionRate: 85, // completion_rate * 100
        currentStreak: 7, // current_streak_days
        longestStreak: 0, // longest_streak_days not in mock
        ratingDistribution: {
          10: 20,
          9: 30,
          8: 35
        }
      });
    });

    it('handles missing favorite_genres array', async () => {
      const responseWithoutGenres = {
        ...mockStatsResponse,
        stats: {
          ...mockStatsResponse.stats,
          favorite_genres: null
        }
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(responseWithoutGenres)
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.stats?.favoriteGenres).toEqual([]);
    });

    it('calculates total items correctly with status counts', async () => {
      const responseWithStatusCounts = {
        ...mockStatsResponse,
        stats: {
          ...mockStatsResponse.stats,
          total_anime_watched: 50,
          status_counts: {
            watching: 10,
            on_hold: 5,
            dropped: 5,
            plan_to_watch: 30,
            completed: 50,
            reading: 20,
            plan_to_read: 15
          }
        }
      };

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(responseWithStatusCounts)
          });
        }
        if (url.includes('/profile')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockProfileResponse)
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      const { result } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const stats = result.current.stats;
      // Total anime: 50 + 10 + 5 + 5 + 30 = 100
      expect(stats?.totalAnime).toBe(100);
      // Total manga: 50 + 20 + 15 = 85
      expect(stats?.totalManga).toBe(85);
    });
  });

  describe('Performance and Memory', () => {
    it('does not create memory leaks with polling', async () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = renderHook(() => useUserProfile(mockUsername));

      await waitFor(() => {
        // Wait for initial load
      });

      const intervalCallsBefore = setIntervalSpy.mock.calls.length;
      
      unmount();

      // Should clear any intervals that were created
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('handles rapid username changes correctly', async () => {
      const { result, rerender } = renderHook(
        ({ username }) => useUserProfile(username),
        { initialProps: { username: 'user1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Rapidly change usernames
      rerender({ username: 'user2' });
      rerender({ username: 'user3' });
      rerender({ username: 'user4' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should handle gracefully without errors
      expect(result.current.profile?.username).toBe('testuser'); // From mock
    });
  });
});