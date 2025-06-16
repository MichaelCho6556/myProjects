/**
 * Axios Mock for Testing (TypeScript)
 * Manual mock for axios that Jest will use automatically
 */

// Store responses for specific endpoints
const endpointResponses = new Map<string, any>();

// Simple mock that mimics axios behavior
const mockAxios = {
  get: jest.fn((url: string): Promise<any> => {
    // Normalize URL by removing base URL if present
    const normalizedUrl = url.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");

    // Check for specific endpoint responses first
    const endpoints = Array.from(endpointResponses.entries());
    for (const [endpoint, response] of endpoints) {
      if (normalizedUrl.includes(endpoint)) {
        return Promise.resolve(response);
      }
    }

    // Handle different API endpoints with normalized URLs
    if (normalizedUrl.includes("/distinct-values")) {
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

    // Handle item detail endpoints (e.g., /items/123)
    if (normalizedUrl.match(/\/items\/[^\/\?]+(?:\?|$)/)) {
      return Promise.resolve({
        data: {
          uid: "test-uid-1",
          title: "Test Anime Title",
          media_type: "anime",
          genres: ["Action", "Adventure"],
          themes: ["School", "Military"],
          demographics: ["Shounen"],
          score: 8.5,
          scored_by: 10000,
          status: "Finished Airing",
          episodes: 24,
          start_date: "2020-01-01",
          rating: "PG-13",
          popularity: 100,
          members: 50000,
          favorites: 5000,
          synopsis: "Test synopsis for anime",
          producers: ["Test Producer"],
          licensors: ["Test Licensor"],
          studios: ["Test Studio"],
          authors: [],
          serializations: [],
          image_url: "https://example.com/test-image.jpg",
          title_synonyms: ["Alt Title"],
        },
      });
    }

    // Handle recommendations endpoints
    if (normalizedUrl.includes("/recommendations/")) {
      return Promise.resolve({
        data: {
          source_item_uid: "test-uid-1",
          source_item_title: "Test Anime Title",
          recommendations: [],
        },
      });
    }

    // Default response for /items endpoint (list)
    if (normalizedUrl.includes("/items") && !normalizedUrl.match(/\/items\/[^\/\?]+/)) {
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

    // Fallback for unknown endpoints
    return Promise.resolve({ data: {} });
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
  isAxiosError: jest.fn((error: any) => {
    // Always return a boolean
    if (!error) return false;

    // Check if it has axios-like properties
    const hasAxiosProperties = !!(
      error.response ||
      error.request ||
      error.config ||
      error.isAxiosError === true
    );

    return hasAxiosProperties;
  }),

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
    endpointResponses.clear();

    // Re-apply default implementation after reset
    this.get.mockImplementation((url: string): Promise<any> => {
      const normalizedUrl = url.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");

      // Check for specific endpoint responses first
      const endpoints = Array.from(endpointResponses.entries());
      for (const [endpoint, response] of endpoints) {
        if (normalizedUrl.includes(endpoint)) {
          return Promise.resolve(response);
        }
      }

      if (normalizedUrl.includes("/distinct-values")) {
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

      if (normalizedUrl.includes("/items") && !normalizedUrl.match(/\/items\/[^\/\?]+/)) {
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
    data: {
      items,
      total_items: totalItems ?? items.length,
      total_pages: totalPages,
      current_page: 1,
      items_per_page: 30,
    },
  };

  endpointResponses.set("/items", response);

  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    const normalizedUrl = url.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");

    // Check for specific endpoint responses first
    const endpoints = Array.from(endpointResponses.entries());
    for (const [endpoint, endpointResponse] of endpoints) {
      if (normalizedUrl.includes(endpoint)) {
        return Promise.resolve(endpointResponse);
      }
    }

    // Default handlers with fallbacks
    if (normalizedUrl.includes("/distinct-values")) {
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

    if (normalizedUrl.includes("/items") && !normalizedUrl.match(/\/items\/[^\/\?]+/)) {
      return Promise.resolve(response);
    }

    // Handle item detail endpoints (e.g., /items/123)
    if (normalizedUrl.match(/\/items\/[^\/\?]+(?:\?|$)/)) {
      return Promise.resolve({
        data: {
          uid: "test-uid-1",
          title: "Test Anime Title",
          media_type: "anime",
          genres: ["Action", "Adventure"],
          themes: ["School", "Military"],
          demographics: ["Shounen"],
          score: 8.5,
          scored_by: 10000,
          status: "Finished Airing",
          episodes: 24,
          start_date: "2020-01-01",
          rating: "PG-13",
          popularity: 100,
          members: 50000,
          favorites: 5000,
          synopsis: "Test synopsis for anime",
          producers: ["Test Producer"],
          licensors: ["Test Licensor"],
          studios: ["Test Studio"],
          authors: [],
          serializations: [],
          image_url: "https://example.com/test-image.jpg",
          title_synonyms: ["Alt Title"],
        },
      });
    }

    // Handle recommendations endpoints
    if (normalizedUrl.includes("/recommendations/")) {
      return Promise.resolve({
        data: {
          source_item_uid: "test-uid-1",
          source_item_title: "Test Anime Title",
          recommendations: [],
        },
      });
    }

    // Fallback for unknown endpoints
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

  endpointResponses.set("/distinct-values", { data: defaultValues });

  // Update the mock implementation to handle the distinct-values endpoint
  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    const normalizedUrl = url.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");

    // Check for specific endpoint responses first
    const endpoints = Array.from(endpointResponses.entries());
    for (const [endpoint, endpointResponse] of endpoints) {
      if (normalizedUrl.includes(endpoint)) {
        return Promise.resolve(endpointResponse);
      }
    }

    // Default handlers
    if (normalizedUrl.includes("/distinct-values")) {
      return Promise.resolve({ data: defaultValues });
    }

    if (normalizedUrl.includes("/items") && !normalizedUrl.match(/\/items\/[^\/\?]+/)) {
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

    // Handle item detail endpoints (e.g., /items/123)
    if (normalizedUrl.match(/\/items\/[^\/\?]+(?:\?|$)/)) {
      return Promise.resolve({
        data: {
          uid: "test-uid-1",
          title: "Test Anime Title",
          media_type: "anime",
          genres: ["Action", "Adventure"],
          themes: ["School", "Military"],
          demographics: ["Shounen"],
          score: 8.5,
          scored_by: 10000,
          status: "Finished Airing",
          episodes: 24,
          start_date: "2020-01-01",
          rating: "PG-13",
          popularity: 100,
          members: 50000,
          favorites: 5000,
          synopsis: "Test synopsis for anime",
          producers: ["Test Producer"],
          licensors: ["Test Licensor"],
          studios: ["Test Studio"],
          authors: [],
          serializations: [],
          image_url: "https://example.com/test-image.jpg",
          title_synonyms: ["Alt Title"],
        },
      });
    }

    // Handle recommendations endpoints
    if (normalizedUrl.includes("/recommendations/")) {
      return Promise.resolve({
        data: {
          source_item_uid: "test-uid-1",
          source_item_title: "Test Anime Title",
          recommendations: [],
        },
      });
    }

    // Fallback for unknown endpoints
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
  endpointResponses.set(`/items/${item.uid}`, { data: item });

  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    const normalizedUrl = url.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");

    // Check for specific endpoint responses first
    const endpoints = Array.from(endpointResponses.entries());
    for (const [endpoint, response] of endpoints) {
      if (normalizedUrl.includes(endpoint)) {
        return Promise.resolve(response);
      }
    }

    // Handle item detail requests - check for specific UID pattern
    const itemDetailMatch = normalizedUrl.match(/\/items\/([^\/\?]+)/);
    if (itemDetailMatch && !normalizedUrl.includes("/recommendations")) {
      const itemUid = itemDetailMatch[1];

      // Check if we have a specific response for this item
      const specificResponse = endpointResponses.get(`/items/${itemUid}`);
      if (specificResponse) {
        return Promise.resolve(specificResponse);
      }

      // Return the item passed to this function as fallback
      return Promise.resolve({ data: item });
    }

    // Handle recommendations requests
    if (normalizedUrl.includes("/recommendations/")) {
      const recMatch = normalizedUrl.match(/\/recommendations\/([^\/\?]+)/);
      if (recMatch) {
        const itemUid = recMatch[1];
        const recResponse = endpointResponses.get(`/recommendations/${itemUid}`);
        if (recResponse) {
          return Promise.resolve(recResponse);
        }
      }
      return Promise.resolve({ data: [] });
    }

    if (normalizedUrl.includes("/distinct-values")) {
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

    if (normalizedUrl.includes("/items") && !normalizedUrl.match(/\/items\/[^\/\?]+/)) {
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

// Helper for related items responses (API still uses "recommendations" field for compatibility)
export const mockRelatedItemsResponse = (relatedItems: any[] = []) => {
  // Store related items in our endpoint map with correct backend format
  endpointResponses.set("/recommendations/", {
    data: {
      source_item_uid: "test-uid-1",
      source_item_title: "Test Anime Title",
      recommendations: relatedItems, // Keep API field name for compatibility
    },
  });
};

// Helper to set specific mock responses
export const setMockResponse = (endpoint: string, response: any) => {
  // Normalize endpoint
  const normalizedEndpoint = endpoint.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");
  endpointResponses.set(normalizedEndpoint, response);

  // Update the mock implementation to handle the new responses
  mockAxios.get.mockImplementation((url: string): Promise<any> => {
    const normalizedUrl = url.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api/, "");

    // Check for specific endpoint responses first
    const endpoints = Array.from(endpointResponses.entries());
    for (const [endpoint, endpointResponse] of endpoints) {
      if (normalizedUrl.includes(endpoint)) {
        return Promise.resolve(endpointResponse);
      }
    }

    // Default handlers
    if (normalizedUrl.includes("/distinct-values")) {
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

    // Handle item detail requests
    if (normalizedUrl.match(/\/items\/[^\/\?]+/) && !normalizedUrl.includes("/recommendations")) {
      return Promise.resolve({
        data: {
          uid: "test-uid-1",
          title: "Test Anime Title",
          media_type: "anime",
          genres: ["Action", "Adventure"],
          themes: ["School", "Military"],
          demographics: ["Shounen"],
          score: 8.5,
          scored_by: 10000,
          status: "Finished Airing",
          episodes: 24,
          start_date: "2020-01-01",
          rating: "PG-13",
          popularity: 100,
          members: 50000,
          favorites: 5000,
          synopsis: "Test synopsis for anime",
          producers: ["Test Producer"],
          licensors: ["Test Licensor"],
          studios: ["Test Studio"],
          authors: [],
          serializations: [],
          image_url: "https://example.com/test-image.jpg",
          title_synonyms: ["Alt Title"],
        },
      });
    }

    // Handle recommendations requests
    if (normalizedUrl.includes("/recommendations/")) {
      return Promise.resolve({ data: [] });
    }

    if (normalizedUrl.includes("/items") && !normalizedUrl.match(/\/items\/[^\/\?]+/)) {
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

// Export the mock as default (this is what Jest will use)
export default mockAxios;

// Named export for direct access in tests
export { mockAxios };
