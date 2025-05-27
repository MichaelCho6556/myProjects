/**
 * Axios Mock for Testing
 * Provides comprehensive mocking capabilities for HTTP requests
 */

export interface MockAxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: any;
}

export interface MockAxiosError {
  response?: {
    data: any;
    status: number;
    statusText: string;
  };
  request?: any;
  message: string;
  code?: string;
}

// Create mock functions
const createMockFunction = () => {
  const fn = (() => {}) as any;
  fn.mockImplementation = (impl: any) => {
    fn._impl = impl;
    return fn;
  };
  fn.mockResolvedValue = (value: any) => {
    fn._resolvedValue = value;
    return fn;
  };
  fn.mockRejectedValue = (error: any) => {
    fn._rejectedValue = error;
    return fn;
  };
  fn.mockResolvedValueOnce = (value: any) => {
    fn._resolvedValueOnce = value;
    return fn;
  };
  fn.mockRejectedValueOnce = (error: any) => {
    fn._rejectedValueOnce = error;
    return fn;
  };
  fn.mockReset = () => {
    delete fn._impl;
    delete fn._resolvedValue;
    delete fn._rejectedValue;
    fn.mock = { calls: [] };
    return fn;
  };
  fn.mockClear = () => {
    fn.mock = { calls: [] };
    return fn;
  };
  fn.mock = { calls: [] };
  return fn;
};

class MockAxios {
  private mockResponses: Map<string, MockAxiosResponse | MockAxiosError> = new Map();
  private defaultResponse: MockAxiosResponse = {
    data: {
      items: [],
      total_items: 0,
      total_pages: 1,
      current_page: 1,
      items_per_page: 30,
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  };

  // Mock implementation of axios.get
  get = createMockFunction();
  post = createMockFunction();
  put = createMockFunction();
  delete = createMockFunction();

  constructor() {
    this.setupMockImplementations();
  }

  private setupMockImplementations() {
    this.get.mockImplementation((url: string, config?: any) => {
      this.get.mock.calls.push([url, config]);

      // Debug logging for tests
      if (process.env.NODE_ENV === "test") {
        console.log("Axios GET called with URL:", url);
      }

      // Find matching response by checking if URL contains any of the registered paths
      let mockResponse: MockAxiosResponse | MockAxiosError | undefined;
      for (const [registeredUrl, response] of Array.from(this.mockResponses.entries())) {
        // Check various matching patterns
        if (url.includes(registeredUrl) || url.startsWith(registeredUrl) || url.indexOf(registeredUrl) > -1) {
          mockResponse = response;
          if (process.env.NODE_ENV === "test") {
            console.log("Found matching mock for:", registeredUrl);
          }
          break;
        }
      }

      // Fallback to default response if no match found
      if (!mockResponse) {
        mockResponse = this.defaultResponse;
        if (process.env.NODE_ENV === "test") {
          console.log("Using default response for:", url);
        }
      }

      if ("response" in mockResponse || "message" in mockResponse) {
        return Promise.reject(mockResponse);
      }

      return Promise.resolve(mockResponse);
    });

    this.post.mockImplementation((url: string, data?: any, config?: any) => {
      this.post.mock.calls.push([url, data, config]);

      let mockResponse: MockAxiosResponse | MockAxiosError | undefined;
      for (const [registeredUrl, response] of Array.from(this.mockResponses.entries())) {
        if (url.includes(registeredUrl) || url.startsWith(registeredUrl)) {
          mockResponse = response;
          break;
        }
      }

      if (!mockResponse) {
        mockResponse = this.defaultResponse;
      }

      if ("response" in mockResponse || "message" in mockResponse) {
        return Promise.reject(mockResponse);
      }

      return Promise.resolve(mockResponse);
    });

    this.put.mockImplementation((url: string, data?: any, config?: any) => {
      this.put.mock.calls.push([url, data, config]);

      let mockResponse: MockAxiosResponse | MockAxiosError | undefined;
      for (const [registeredUrl, response] of Array.from(this.mockResponses.entries())) {
        if (url.includes(registeredUrl) || url.startsWith(registeredUrl)) {
          mockResponse = response;
          break;
        }
      }

      if (!mockResponse) {
        mockResponse = this.defaultResponse;
      }

      if ("response" in mockResponse || "message" in mockResponse) {
        return Promise.reject(mockResponse);
      }

      return Promise.resolve(mockResponse);
    });

    this.delete.mockImplementation((url: string, config?: any) => {
      this.delete.mock.calls.push([url, config]);

      let mockResponse: MockAxiosResponse | MockAxiosError | undefined;
      for (const [registeredUrl, response] of Array.from(this.mockResponses.entries())) {
        if (url.includes(registeredUrl) || url.startsWith(registeredUrl)) {
          mockResponse = response;
          break;
        }
      }

      if (!mockResponse) {
        mockResponse = this.defaultResponse;
      }

      if ("response" in mockResponse || "message" in mockResponse) {
        return Promise.reject(mockResponse);
      }

      return Promise.resolve(mockResponse);
    });
  }

  // Utility methods for test setup
  mockResolvedValue(data: any) {
    this.get.mockResolvedValue({ data });
    this.post.mockResolvedValue({ data });
    this.put.mockResolvedValue({ data });
    this.delete.mockResolvedValue({ data });
    return this;
  }

  mockRejectedValue(error: any) {
    this.get.mockRejectedValue(error);
    this.post.mockRejectedValue(error);
    this.put.mockRejectedValue(error);
    this.delete.mockRejectedValue(error);
    return this;
  }

  mockResolvedValueOnce(data: any) {
    this.get.mockResolvedValueOnce({ data });
    return this;
  }

  mockRejectedValueOnce(error: any) {
    this.get.mockRejectedValueOnce(error);
    return this;
  }

  // Set specific response for a URL
  setMockResponse(url: string, response: MockAxiosResponse | MockAxiosError) {
    this.mockResponses.set(url, response);
  }

  // Set default response for all unmocked URLs
  setDefaultResponse(response: MockAxiosResponse) {
    this.defaultResponse = response;
  }

  // Clear all mocks
  reset() {
    this.get.mockReset();
    this.post.mockReset();
    this.put.mockReset();
    this.delete.mockReset();
    this.mockResponses.clear();
    this.defaultResponse = {
      data: {
        items: [],
        total_items: 0,
        total_pages: 1,
        current_page: 1,
        items_per_page: 30,
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    };
  }

  // Clear call history but keep mock implementations
  clearMocks() {
    this.get.mockClear();
    this.post.mockClear();
    this.put.mockClear();
    this.delete.mockClear();
  }

  // Get call history
  getCallHistory() {
    return {
      get: this.get.mock.calls,
      post: this.post.mock.calls,
      put: this.put.mock.calls,
      delete: this.delete.mock.calls,
    };
  }

  // Check if a specific URL was called
  wasCalledWith(method: "get" | "post" | "put" | "delete", url: string) {
    const calls = this[method].mock.calls;
    return calls.some((call: any[]) => call[0] === url);
  }

  // Get the number of times a method was called
  getCallCount(method: "get" | "post" | "put" | "delete") {
    return this[method].mock.calls.length;
  }

  // Create axios instance mock
  create = createMockFunction();

  // Mock axios defaults
  defaults = {
    baseURL: "",
    timeout: 0,
    headers: {
      common: {},
      get: {},
      post: {},
      put: {},
      delete: {},
    },
  };

  // Mock interceptors
  interceptors = {
    request: {
      use: createMockFunction(),
      eject: createMockFunction(),
    },
    response: {
      use: createMockFunction(),
      eject: createMockFunction(),
    },
  };

  // Mock cancel token
  CancelToken = {
    source: createMockFunction(),
  };

  isCancel = createMockFunction();
}

const mockAxios = new MockAxios();

// Setup create method
mockAxios.create.mockImplementation(() => mockAxios);

// Setup CancelToken.source
mockAxios.CancelToken.source.mockImplementation(() => ({
  token: {},
  cancel: createMockFunction(),
}));

// Setup isCancel
mockAxios.isCancel.mockImplementation(() => false);

export default mockAxios;

// Named exports for convenience
export const {
  get,
  post,
  put,
  delete: del,
  create,
  defaults,
  interceptors,
  CancelToken,
  isCancel,
} = mockAxios;

// Export the mock instance for direct manipulation in tests
export { mockAxios };

// Helper functions for common test scenarios
export const mockApiSuccess = (data: any) => {
  mockAxios.mockResolvedValue(data);
};

export const mockApiError = (status: number = 500, message: string = "Server Error") => {
  const error = {
    response: {
      data: { error: message },
      status,
      statusText: message,
    },
    message,
  };
  mockAxios.mockRejectedValue(error);
};

export const mockApiLoading = (delay: number = 1000) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data: {} });
    }, delay);
  });
};

// Specific mocks for AniManga API endpoints
export const mockItemsResponse = (items: any[] = [], totalPages: number = 1) => {
  const response = {
    items,
    total_items: items.length,
    total_pages: totalPages,
    current_page: 1,
    items_per_page: 30,
  };
  mockAxios.setMockResponse("/api/items", {
    data: response,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });
};

export const mockDistinctValuesResponse = (values: any = {}) => {
  const defaultValues = {
    media_types: ["anime", "manga"],
    genres: ["Action", "Adventure", "Comedy"],
    themes: ["School", "Military", "Romance"],
    demographics: ["Shounen", "Shoujo"],
    statuses: ["Finished Airing", "Currently Airing"],
    studios: ["Studio A", "Studio B"],
    authors: ["Author X", "Author Y"],
    ...values,
  };

  mockAxios.setMockResponse("/api/distinct-values", {
    data: defaultValues,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });
};

export const mockItemDetailResponse = (item: any) => {
  mockAxios.setMockResponse(`/api/items/${item.uid}`, {
    data: item,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });
};

export const mockRecommendationsResponse = (recommendations: any[] = []) => {
  const response = {
    source_item_uid: "test-uid",
    source_item_title: "Test Item",
    recommendations,
  };

  mockAxios.setMockResponse("/api/recommendations/", {
    data: response,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });
};
