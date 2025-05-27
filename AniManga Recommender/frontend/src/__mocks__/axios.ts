/**
 * Axios Mock for Testing (TypeScript)
 * Manual mock for axios that Jest will use automatically
 */

// Simple mock that mimics axios behavior
const mockAxios = {
  get: jest.fn((url: string): Promise<any> => {
    // Handle different API endpoints
    if (url.includes("/api/distinct-values")) {
      return Promise.resolve({
        data: {
          media_types: ["anime", "manga"],
          genres: ["Action", "Adventure", "Comedy", "Drama"],
          themes: ["School", "Military", "Romance"],
          demographics: ["Shounen", "Shoujo"],
          statuses: ["Finished Airing", "Currently Airing"],
          studios: ["Studio A", "Studio B"],
          authors: ["Author X", "Author Y"],
          sources: ["Manga", "Light Novel"],
          ratings: ["G", "PG", "PG-13"],
        },
      });
    }

    // Default response for /api/items
    return Promise.resolve({
      data: {
        items: [],
        total_items: 0,
        total_pages: 1,
        current_page: 1,
        items_per_page: 30,
      },
    });
  }),
  post: jest.fn((): Promise<any> => Promise.resolve({ data: {} })),
  put: jest.fn((): Promise<any> => Promise.resolve({ data: {} })),
  delete: jest.fn((): Promise<any> => Promise.resolve({ data: {} })),
  create: jest.fn(function (this: any) {
    return this;
  }),
  defaults: {
    baseURL: "",
    timeout: 0,
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      delete: {},
    },
  },
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
  CancelToken: {
    source: jest.fn(() => ({
      token: {},
      cancel: jest.fn(),
    })),
  },
  isCancel: jest.fn(() => false),

  // Methods that tests expect
  mockResolvedValue: jest.fn(function (this: any, value: any) {
    this.get.mockResolvedValue(value);
    this.post.mockResolvedValue(value);
    this.put.mockResolvedValue(value);
    this.delete.mockResolvedValue(value);
    return this;
  }),

  mockRejectedValue: jest.fn(function (this: any, error: any) {
    this.get.mockRejectedValue(error);
    this.post.mockRejectedValue(error);
    this.put.mockRejectedValue(error);
    this.delete.mockRejectedValue(error);
    return this;
  }),

  mockResolvedValueOnce: jest.fn(function (this: any, value: any) {
    this.get.mockResolvedValueOnce(value);
    return this;
  }),

  mockRejectedValueOnce: jest.fn(function (this: any, error: any) {
    this.get.mockRejectedValueOnce(error);
    return this;
  }),

  reset: jest.fn(function (this: any) {
    this.get.mockReset();
    this.post.mockReset();
    this.put.mockReset();
    this.delete.mockReset();
    // Re-apply default implementation after reset
    this.get.mockImplementation((url: string): Promise<any> => {
      if (url.includes("/api/distinct-values")) {
        return Promise.resolve({
          data: {
            media_types: ["anime", "manga"],
            genres: ["Action", "Adventure", "Comedy", "Drama"],
            themes: ["School", "Military", "Romance"],
            demographics: ["Shounen", "Shoujo"],
            statuses: ["Finished Airing", "Currently Airing"],
            studios: ["Studio A", "Studio B"],
            authors: ["Author X", "Author Y"],
            sources: ["Manga", "Light Novel"],
            ratings: ["G", "PG", "PG-13"],
          },
        });
      }
      return Promise.resolve({
        data: {
          items: [],
          total_items: 0,
          total_pages: 1,
          current_page: 1,
          items_per_page: 30,
        },
      });
    });
    return this;
  }),

  clearMocks: jest.fn(function (this: any) {
    this.get.mockClear();
    this.post.mockClear();
    this.put.mockClear();
    this.delete.mockClear();
    return this;
  }),
};

// Helper functions for test setup with better implementation
export const mockItemsResponse = (items: any[] = [], totalPages: number = 1, totalItems?: number) => {
  const response = {
    items,
    total_items: totalItems ?? items.length,
    total_pages: totalPages,
    current_page: 1,
    items_per_page: 30,
  };

  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    if (url.includes("/api/items")) {
      return Promise.resolve({ data: response });
    }
    if (url.includes("/api/distinct-values")) {
      return Promise.resolve({
        data: {
          media_types: ["anime", "manga"],
          genres: ["Action", "Adventure", "Comedy", "Drama"],
          themes: ["School", "Military", "Romance"],
          demographics: ["Shounen", "Shoujo"],
          statuses: ["Finished Airing", "Currently Airing"],
          studios: ["Studio A", "Studio B"],
          authors: ["Author X", "Author Y"],
          sources: ["Manga", "Light Novel"],
          ratings: ["G", "PG", "PG-13"],
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
};

export const mockDistinctValuesResponse = (values: any = {}) => {
  const defaultValues = {
    media_types: ["anime", "manga"],
    genres: ["Action", "Adventure", "Comedy", "Drama"],
    themes: ["School", "Military", "Romance"],
    demographics: ["Shounen", "Shoujo"],
    statuses: ["Finished Airing", "Currently Airing"],
    studios: ["Studio A", "Studio B"],
    authors: ["Author X", "Author Y"],
    sources: ["Manga", "Light Novel"],
    ratings: ["G", "PG", "PG-13"],
    ...values,
  };

  // Store current items implementation
  const currentItemsImplementation =
    mockAxios.get.getMockImplementation() ||
    (() =>
      Promise.resolve({
        data: { items: [], total_items: 0, total_pages: 1, current_page: 1, items_per_page: 30 },
      }));

  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    if (url.includes("/api/distinct-values")) {
      return Promise.resolve({ data: defaultValues });
    }
    if (url.includes("/api/items")) {
      // Use current items implementation or default
      return currentItemsImplementation(url);
    }
    return Promise.resolve({ data: {} });
  });
};

// Helper to mock error responses
export const mockErrorResponse = (error: any = {}) => {
  const defaultError = {
    response: {
      data: { error: "Server Error" },
      status: 500,
      statusText: "Internal Server Error",
    },
    ...error,
  };

  mockAxios.get.mockRejectedValue(defaultError);
};

// Helper for item detail responses
export const mockItemDetailResponse = (item: any) => {
  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    // Handle item detail requests (includes full URL with base)
    if (url.includes("/items/") && !url.includes("/recommendations")) {
      return Promise.resolve({ data: item });
    }
    // Handle recommendations requests
    if (url.includes("/recommendations/")) {
      return Promise.resolve({ data: [] });
    }
    if (url.includes("/distinct-values") || url.includes("distinct-values")) {
      return Promise.resolve({
        data: {
          media_types: ["anime", "manga"],
          genres: ["Action", "Adventure", "Comedy", "Drama"],
          themes: ["School", "Military", "Romance"],
          demographics: ["Shounen", "Shoujo"],
          statuses: ["Finished Airing", "Currently Airing"],
          studios: ["Studio A", "Studio B"],
          authors: ["Author X", "Author Y"],
          sources: ["Manga", "Light Novel"],
          ratings: ["G", "PG", "PG-13"],
        },
      });
    }
    if (url.includes("/items") && !url.includes("/items/")) {
      return Promise.resolve({
        data: {
          items: [],
          total_items: 0,
          total_pages: 1,
          current_page: 1,
          items_per_page: 30,
        },
      });
    }
    return Promise.resolve({ data: {} });
  });
};

// Helper for recommendations responses
export const mockRecommendationsResponse = (recommendations: any[] = []) => {
  // Get current implementation or create one
  const currentImplementation = mockAxios.get.getMockImplementation();

  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    // Handle recommendations requests first
    if (url.includes("/recommendations/")) {
      return Promise.resolve({ data: recommendations });
    }
    // Handle item detail requests
    if (url.includes("/items/") && !url.includes("/recommendations")) {
      // If we have a current implementation, use it, otherwise return empty item
      if (currentImplementation) {
        return currentImplementation(url);
      }
      return Promise.resolve({ data: {} });
    }
    // Handle other endpoints
    if (url.includes("/distinct-values") || url.includes("distinct-values")) {
      return Promise.resolve({
        data: {
          media_types: ["anime", "manga"],
          genres: ["Action", "Adventure", "Comedy", "Drama"],
          themes: ["School", "Military", "Romance"],
          demographics: ["Shounen", "Shoujo"],
          statuses: ["Finished Airing", "Currently Airing"],
          studios: ["Studio A", "Studio B"],
          authors: ["Author X", "Author Y"],
          sources: ["Manga", "Light Novel"],
          ratings: ["G", "PG", "PG-13"],
        },
      });
    }
    if (url.includes("/items") && !url.includes("/items/")) {
      return Promise.resolve({
        data: {
          items: [],
          total_items: 0,
          total_pages: 1,
          current_page: 1,
          items_per_page: 30,
        },
      });
    }
    // Fall back to current implementation if available
    if (currentImplementation) {
      return currentImplementation(url);
    }
    return Promise.resolve({ data: {} });
  });
};

// Helper to set specific mock responses
export const setMockResponse = (endpoint: string, response: any) => {
  const currentImplementation = mockAxios.get.getMockImplementation();

  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    if (url.includes(endpoint)) {
      return Promise.resolve(response);
    }
    // Fall back to current implementation
    if (currentImplementation) {
      return currentImplementation(url);
    }
    return Promise.resolve({ data: {} });
  });
};

// Export the mock as default (this is what Jest will use)
export default mockAxios;

// Named export for direct access in tests
export { mockAxios };
