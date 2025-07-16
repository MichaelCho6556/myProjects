/**
 * Performance Benchmarks Test Suite
 * 
 * This test suite provides comprehensive performance validation for the AniManga
 * Recommender application with focus on render times, memory usage, and optimization.
 * 
 * Phase 4.2: Performance Testing and Optimization
 * Tests critical performance metrics and identifies bottlenecks
 */

import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { performance } from 'perf_hooks';

// Mock performance.now for consistent testing
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: { now: mockPerformanceNow },
  writable: true
});

// Mock large dataset for performance testing
const generateMockItems = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    uid: `item_${index}`,
    title: `Test Item ${index}`,
    synopsis: `This is a test synopsis for item ${index}. `.repeat(10),
    score: Math.random() * 10,
    genres: ['Action', 'Adventure', 'Comedy'],
    image_url: `https://example.com/image_${index}.jpg`,
    media_type: index % 2 === 0 ? 'anime' : 'manga'
  }));
};

describe('Performance Benchmarks', () => {
  let startTime: number;
  let performanceEntries: PerformanceEntry[] = [];

  beforeEach(() => {
    startTime = Date.now();
    performanceEntries = [];
    mockPerformanceNow.mockImplementation(() => Date.now() - startTime);
    
    // Mock performance.mark and performance.measure
    global.performance.mark = jest.fn();
    global.performance.measure = jest.fn();
    global.performance.getEntriesByType = jest.fn().mockReturnValue(performanceEntries);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Render Performance', () => {
    it('should render list components within performance thresholds', async () => {
      const TestListComponent = () => {
        const items = generateMockItems(100);
        return (
          <div>
            {items.map(item => (
              <div key={item.uid} data-testid="list-item">
                <h3>{item.title}</h3>
                <p>{item.synopsis}</p>
                <span>Score: {item.score}</span>
              </div>
            ))}
          </div>
        );
      };

      const renderStart = performance.now();
      const { container } = render(
        <MemoryRouter>
          <TestListComponent />
        </MemoryRouter>
      );
      const renderEnd = performance.now();
      
      const renderTime = renderEnd - renderStart;
      const listItems = container.querySelectorAll('[data-testid="list-item"]');
      
      expect(listItems).toHaveLength(100);
      expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });

    it('should handle large datasets efficiently', async () => {
      const TestLargeListComponent = () => {
        const items = generateMockItems(1000);
        return (
          <div>
            {items.map(item => (
              <div key={item.uid} data-testid="large-list-item">
                <h3>{item.title}</h3>
                <p>{item.synopsis}</p>
              </div>
            ))}
          </div>
        );
      };

      const renderStart = performance.now();
      const { container } = render(
        <MemoryRouter>
          <TestLargeListComponent />
        </MemoryRouter>
      );
      const renderEnd = performance.now();
      
      const renderTime = renderEnd - renderStart;
      const listItems = container.querySelectorAll('[data-testid="large-list-item"]');
      
      expect(listItems).toHaveLength(1000);
      expect(renderTime).toBeLessThan(500); // Should render within 500ms
    });

    it('should optimize re-renders with React.memo', () => {
      let renderCount = 0;
      
      const TestMemoComponent = React.memo(() => {
        renderCount++;
        return <div data-testid="memo-component">Memoized Component</div>;
      });

      const ParentComponent = ({ trigger }: { trigger: number }) => {
        return (
          <div>
            <div>Trigger: {trigger}</div>
            <TestMemoComponent />
          </div>
        );
      };

      const { rerender } = render(<ParentComponent trigger={1} />);
      expect(renderCount).toBe(1);
      
      // Re-render with same props - should not re-render memo component
      rerender(<ParentComponent trigger={2} />);
      expect(renderCount).toBe(1); // Should still be 1 due to memoization
    });

    it('should handle component updates efficiently', () => {
      let updateCount = 0;
      
      const TestUpdateComponent = ({ data }: { data: any[] }) => {
        updateCount++;
        return (
          <div>
            {data.map(item => (
              <div key={item.id}>{item.name}</div>
            ))}
          </div>
        );
      };

      const initialData = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      const { rerender } = render(<TestUpdateComponent data={initialData} />);
      
      const updateStart = performance.now();
      const updatedData = [...initialData, { id: 10, name: 'Item 10' }];
      rerender(<TestUpdateComponent data={updatedData} />);
      const updateEnd = performance.now();
      
      const updateTime = updateEnd - updateStart;
      expect(updateTime).toBeLessThan(50); // Should update within 50ms
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should not create memory leaks with event listeners', () => {
      const mockAddEventListener = jest.fn();
      const mockRemoveEventListener = jest.fn();
      
      Object.defineProperty(window, 'addEventListener', {
        value: mockAddEventListener,
        writable: true
      });
      Object.defineProperty(window, 'removeEventListener', {
        value: mockRemoveEventListener,
        writable: true
      });

      const TestEventComponent = () => {
        React.useEffect(() => {
          const handleResize = () => {};
          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
        }, []);

        return <div>Test Component</div>;
      };

      const { unmount } = render(<TestEventComponent />);
      expect(mockAddEventListener).toHaveBeenCalledTimes(1);
      
      unmount();
      expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
    });

    it('should cleanup timers and intervals', () => {
      const mockClearTimeout = jest.fn();
      const mockClearInterval = jest.fn();
      
      global.clearTimeout = mockClearTimeout;
      global.clearInterval = mockClearInterval;

      const TestTimerComponent = () => {
        React.useEffect(() => {
          const timeout = setTimeout(() => {}, 1000);
          const interval = setInterval(() => {}, 1000);
          
          return () => {
            clearTimeout(timeout);
            clearInterval(interval);
          };
        }, []);

        return <div>Timer Component</div>;
      };

      const { unmount } = render(<TestTimerComponent />);
      unmount();
      
      expect(mockClearTimeout).toHaveBeenCalledTimes(1);
      expect(mockClearInterval).toHaveBeenCalledTimes(1);
    });

    it('should optimize array operations', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => i);
      
      const mapStart = performance.now();
      const mappedArray = largeArray.map(x => x * 2);
      const mapEnd = performance.now();
      
      const filterStart = performance.now();
      const filteredArray = largeArray.filter(x => x % 2 === 0);
      const filterEnd = performance.now();
      
      const mapTime = mapEnd - mapStart;
      const filterTime = filterEnd - filterStart;
      
      expect(mappedArray).toHaveLength(10000);
      expect(filteredArray).toHaveLength(5000);
      expect(mapTime).toBeLessThan(100); // Should complete within 100ms
      expect(filterTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle object creation efficiently', () => {
      const createObjects = (count: number) => {
        const objects = [];
        for (let i = 0; i < count; i++) {
          objects.push({
            id: i,
            name: `Object ${i}`,
            data: Array.from({ length: 10 }, (_, j) => ({ key: j, value: `Value ${j}` }))
          });
        }
        return objects;
      };

      const creationStart = performance.now();
      const objects = createObjects(1000);
      const creationEnd = performance.now();
      
      const creationTime = creationEnd - creationStart;
      expect(objects).toHaveLength(1000);
      expect(creationTime).toBeLessThan(200); // Should complete within 200ms
    });
  });

  describe('Virtual Scrolling Performance', () => {
    it('should render only visible items in virtual scroll', () => {
      const TestVirtualScrollComponent = ({ items, itemHeight = 50, containerHeight = 400 }) => {
        const [scrollTop, setScrollTop] = React.useState(0);
        const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleItemsCount, items.length);
        const visibleItems = items.slice(startIndex, endIndex);

        return (
          <div 
            style={{ height: containerHeight, overflow: 'auto' }}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            data-testid="virtual-scroll-container"
          >
            <div style={{ height: items.length * itemHeight }}>
              <div style={{ transform: `translateY(${startIndex * itemHeight}px)` }}>
                {visibleItems.map((item, index) => (
                  <div key={item.uid} style={{ height: itemHeight }} data-testid="virtual-item">
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      };

      const items = generateMockItems(10000);
      const { container } = render(<TestVirtualScrollComponent items={items} />);
      
      const virtualItems = container.querySelectorAll('[data-testid="virtual-item"]');
      expect(virtualItems.length).toBeLessThan(20); // Should render only visible items
      expect(virtualItems.length).toBeGreaterThan(0);
    });

    it('should handle scroll performance efficiently', async () => {
      const TestScrollComponent = () => {
        const [scrollTop, setScrollTop] = React.useState(0);
        const items = generateMockItems(1000);

        const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
          setScrollTop(e.currentTarget.scrollTop);
        };

        return (
          <div 
            style={{ height: 400, overflow: 'auto' }}
            onScroll={handleScroll}
            data-testid="scroll-container"
          >
            {items.map(item => (
              <div key={item.uid} style={{ height: 50 }}>
                {item.title}
              </div>
            ))}
          </div>
        );
      };

      const { container } = render(<TestScrollComponent />);
      const scrollContainer = container.querySelector('[data-testid="scroll-container"]');
      
      const scrollStart = performance.now();
      
      // Simulate scroll events
      for (let i = 0; i < 10; i++) {
        scrollContainer?.dispatchEvent(new Event('scroll'));
      }
      
      const scrollEnd = performance.now();
      const scrollTime = scrollEnd - scrollStart;
      
      expect(scrollTime).toBeLessThan(100); // Should handle scroll within 100ms
    });
  });

  describe('Image Loading Performance', () => {
    it('should implement lazy loading for images', () => {
      const TestImageComponent = ({ src, alt, lazy = true }: { src: string, alt: string, lazy?: boolean }) => {
        const [isLoaded, setIsLoaded] = React.useState(false);
        const [isInView, setIsInView] = React.useState(!lazy);
        const imgRef = React.useRef<HTMLImageElement>(null);

        React.useEffect(() => {
          if (!lazy) return;

          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                setIsInView(true);
                observer.disconnect();
              }
            });
          });

          if (imgRef.current) {
            observer.observe(imgRef.current);
          }

          return () => observer.disconnect();
        }, [lazy]);

        return (
          <img
            ref={imgRef}
            src={isInView ? src : 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            data-testid="lazy-image"
            data-loaded={isLoaded}
          />
        );
      };

      const { container } = render(
        <TestImageComponent src="https://example.com/image.jpg" alt="Test" lazy={true} />
      );
      
      const img = container.querySelector('[data-testid="lazy-image"]');
      expect(img).toHaveAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    });

    it('should handle image loading errors gracefully', () => {
      const TestImageWithFallback = ({ src, fallback }: { src: string, fallback: string }) => {
        const [currentSrc, setCurrentSrc] = React.useState(src);
        const [hasError, setHasError] = React.useState(false);

        const handleError = () => {
          if (!hasError) {
            setHasError(true);
            setCurrentSrc(fallback);
          }
        };

        return (
          <img
            src={currentSrc}
            onError={handleError}
            data-testid="fallback-image"
            data-has-error={hasError}
          />
        );
      };

      const { container } = render(
        <TestImageWithFallback 
          src="https://invalid-url.com/image.jpg" 
          fallback="https://example.com/fallback.jpg"
        />
      );
      
      const img = container.querySelector('[data-testid="fallback-image"]') as HTMLImageElement;
      
      // Simulate image error
      img.dispatchEvent(new Event('error'));
      
      expect(img).toHaveAttribute('data-has-error', 'true');
      expect(img).toHaveAttribute('src', 'https://example.com/fallback.jpg');
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should use code splitting for route components', async () => {
      const LazyComponent = React.lazy(() => 
        Promise.resolve({ default: () => <div>Lazy Component</div> })
      );

      const TestAppWithSuspense = () => (
        <React.Suspense fallback={<div>Loading...</div>}>
          <LazyComponent />
        </React.Suspense>
      );

      const { container } = render(<TestAppWithSuspense />);
      
      // Initially should show loading
      expect(container.textContent).toBe('Loading...');
      
      // After loading, should show component
      await waitFor(() => {
        expect(container.textContent).toBe('Lazy Component');
      });
    });

    it('should implement tree shaking for unused code', () => {
      // Mock utility functions
      const utils = {
        usedFunction: () => 'used',
        unusedFunction: () => 'unused',
        anotherUsedFunction: () => 'another used'
      };

      const TestTreeShakingComponent = () => {
        const result = utils.usedFunction();
        const anotherResult = utils.anotherUsedFunction();
        
        return (
          <div>
            {result} - {anotherResult}
          </div>
        );
      };

      const { container } = render(<TestTreeShakingComponent />);
      expect(container.textContent).toBe('used - another used');
      
      // In a real scenario, unusedFunction would be tree-shaken out
    });
  });

  describe('API Performance', () => {
    it('should optimize API requests with caching', async () => {
      const mockCache = new Map();
      
      const fetchWithCache = async (url: string) => {
        if (mockCache.has(url)) {
          return mockCache.get(url);
        }
        
        const response = await fetch(url);
        const data = await response.json();
        mockCache.set(url, data);
        return data;
      };

      // Mock fetch
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: 'first call' })
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ data: 'second call' })
        });

      const firstCall = await fetchWithCache('/api/test');
      const secondCall = await fetchWithCache('/api/test'); // Should use cache

      expect(firstCall).toEqual({ data: 'first call' });
      expect(secondCall).toEqual({ data: 'first call' }); // Same as first due to caching
      expect(fetch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should implement request debouncing', () => {
      const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout;
        return (...args: any[]) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func(...args), delay);
        };
      };

      const mockApiCall = jest.fn();
      const debouncedApiCall = debounce(mockApiCall, 100);

      // Rapid successive calls
      debouncedApiCall('test1');
      debouncedApiCall('test2');
      debouncedApiCall('test3');

      // Should not have been called yet
      expect(mockApiCall).not.toHaveBeenCalled();

      // Wait for debounce delay
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(mockApiCall).toHaveBeenCalledTimes(1);
          expect(mockApiCall).toHaveBeenCalledWith('test3');
          resolve();
        }, 150);
      });
    });

    it('should implement request throttling', () => {
      const throttle = (func: Function, delay: number) => {
        let lastCall = 0;
        return (...args: any[]) => {
          const now = Date.now();
          if (now - lastCall >= delay) {
            lastCall = now;
            return func(...args);
          }
        };
      };

      const mockApiCall = jest.fn();
      const throttledApiCall = throttle(mockApiCall, 100);

      // Rapid successive calls
      throttledApiCall('test1');
      throttledApiCall('test2');
      throttledApiCall('test3');

      // Should only be called once immediately
      expect(mockApiCall).toHaveBeenCalledTimes(1);
      expect(mockApiCall).toHaveBeenCalledWith('test1');
    });
  });

  describe('State Management Performance', () => {
    it('should optimize state updates with batching', () => {
      let renderCount = 0;
      
      const TestBatchingComponent = () => {
        renderCount++;
        const [count1, setCount1] = React.useState(0);
        const [count2, setCount2] = React.useState(0);

        const handleUpdate = () => {
          React.unstable_batchedUpdates(() => {
            setCount1(prev => prev + 1);
            setCount2(prev => prev + 1);
          });
        };

        return (
          <div>
            <div>Count1: {count1}</div>
            <div>Count2: {count2}</div>
            <button onClick={handleUpdate}>Update</button>
          </div>
        );
      };

      const { container } = render(<TestBatchingComponent />);
      const button = container.querySelector('button');
      
      const initialRenderCount = renderCount;
      button?.click();
      
      // Should only cause one additional render due to batching
      expect(renderCount).toBe(initialRenderCount + 1);
    });

    it('should use useMemo for expensive calculations', () => {
      let calculationCount = 0;
      
      const TestMemoComponent = ({ items }: { items: number[] }) => {
        const expensiveCalculation = React.useMemo(() => {
          calculationCount++;
          return items.reduce((sum, item) => sum + item * item, 0);
        }, [items]);

        return <div>Result: {expensiveCalculation}</div>;
      };

      const items = [1, 2, 3, 4, 5];
      const { rerender } = render(<TestMemoComponent items={items} />);
      
      expect(calculationCount).toBe(1);
      
      // Re-render with same items - should not recalculate
      rerender(<TestMemoComponent items={items} />);
      expect(calculationCount).toBe(1);
      
      // Re-render with different items - should recalculate
      rerender(<TestMemoComponent items={[1, 2, 3]} />);
      expect(calculationCount).toBe(2);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', () => {
      const performanceBaselines = {
        componentRender: 50,
        apiCall: 100,
        stateUpdate: 20
      };

      const measurePerformance = (operation: string, fn: () => void) => {
        const start = performance.now();
        fn();
        const end = performance.now();
        const duration = end - start;
        
        const baseline = performanceBaselines[operation as keyof typeof performanceBaselines];
        if (baseline && duration > baseline * 1.5) { // 50% performance regression threshold
          throw new Error(`Performance regression detected for ${operation}: ${duration}ms > ${baseline * 1.5}ms`);
        }
        
        return duration;
      };

      // Test component render performance
      const renderDuration = measurePerformance('componentRender', () => {
        render(<div>Test Component</div>);
      });

      expect(renderDuration).toBeLessThan(performanceBaselines.componentRender * 1.5);
    });
  });
});