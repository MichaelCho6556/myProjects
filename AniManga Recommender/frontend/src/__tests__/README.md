# Frontend Testing Documentation

## Overview

This directory contains comprehensive tests for the AniManga Recommender frontend application using Jest and React Testing Library. The testing suite covers unit tests for components, integration tests for user flows, and utility function tests.

## Testing Stack

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **@testing-library/jest-dom**: Custom Jest matchers for DOM assertions
- **@types/jest**: TypeScript definitions for Jest
- **Axios Mocking**: Custom axios mock for API testing

## Directory Structure

```
src/__tests__/
├── components/          # Unit tests for React components
│   ├── ItemCard.test.tsx
│   ├── Navbar.test.tsx
│   └── Spinner.test.tsx
├── pages/              # Integration tests for page components
├── utils/              # Tests for utility functions
├── helpers/            # Tests for helper functions
│   └── homePageHelpers.test.tsx
└── README.md           # This file

src/__mocks__/
└── axios.ts            # Comprehensive axios mock

src/setupTests.ts       # Global test configuration
```

## Test Categories

### 1. Component Unit Tests

#### ItemCard Component (`components/ItemCard.test.tsx`)

- **Coverage**: 45+ test cases
- **Features Tested**:
  - Basic rendering with valid/invalid props
  - Content display (title, media type, score formatting)
  - Genres and themes display logic
  - Image handling and error fallbacks
  - Navigation links and accessibility
  - Edge cases and error scenarios
  - TypeScript prop validation

#### Navbar Component (`components/Navbar.test.tsx`)

- **Coverage**: 25+ test cases
- **Features Tested**:
  - Basic rendering and structure
  - Navigation links functionality
  - Accessibility attributes (ARIA roles, labels)
  - CSS class application
  - Router integration
  - Performance considerations

#### Spinner Component (`components/Spinner.test.tsx`)

- **Coverage**: 35+ test cases
- **Features Tested**:
  - Props handling (size, color, className)
  - Default values and customization
  - Style application and CSS properties
  - Accessibility (ARIA roles)
  - Edge cases (zero size, invalid colors)
  - TypeScript interface compliance

### 2. Helper Function Tests

#### HomePage Helpers (`helpers/homePageHelpers.test.tsx`)

- **Coverage**: 40+ test cases
- **Functions Tested**:
  - `toSelectOptions`: String array to SelectOption conversion
  - `getMultiSelectValuesFromParam`: URL parameter parsing
- **Test Scenarios**:
  - Basic functionality and edge cases
  - Case-insensitive matching
  - Whitespace handling
  - Special characters and Unicode
  - Error handling and validation

### 3. Mocking Infrastructure

#### Axios Mock (`__mocks__/axios.ts`)

- **Features**:
  - Comprehensive HTTP method mocking (GET, POST, PUT, DELETE)
  - URL-specific response configuration
  - Error simulation capabilities
  - Call history tracking
  - Helper functions for common scenarios
  - AniManga-specific API endpoint mocks

#### Global Test Setup (`setupTests.ts`)

- **Configuration**:
  - Jest DOM matchers
  - Browser API mocks (IntersectionObserver, ResizeObserver)
  - Console warning suppression
  - Custom Jest matchers
  - Global test utilities

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Files

```bash
npm test -- --testPathPattern="ItemCard.test.tsx"
npm test -- --testPathPattern="Navbar.test.tsx"
npm test -- --testPathPattern="Spinner.test.tsx"
```

### Watch Mode

```bash
npm test -- --watch
```

### Coverage Report

```bash
npm test -- --coverage
```

### Verbose Output

```bash
npm test -- --verbose
```

## Test Utilities

### Global Mock Functions

Available in all test files via `setupTests.ts`:

```typescript
// Create mock anime/manga item
const mockItem = createMockItem({
  title: "Custom Title",
  score: 9.5,
  genres: ["Action", "Adventure"],
});

// Create mock API response
const mockResponse = createMockApiResponse([mockItem], {
  total_pages: 5,
  current_page: 2,
});

// Create mock distinct values
const mockValues = createMockDistinctValues({
  genres: ["Action", "Comedy", "Drama"],
});
```

### Custom Jest Matchers

```typescript
// Check if element has loading state
expect(element).toHaveLoadingState();
```

### Axios Mocking Examples

```typescript
import { mockAxios, mockApiSuccess, mockApiError } from "../__mocks__/axios";

// Mock successful API response
mockApiSuccess({ items: [], total_pages: 1 });

// Mock API error
mockApiError(404, "Not Found");

// Mock specific endpoint
mockAxios.setMockResponse("/api/items", {
  data: { items: [] },
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
});
```

## Testing Best Practices

### 1. Test Structure

- Use descriptive test names
- Group related tests with `describe` blocks
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Component Testing

- Test behavior, not implementation
- Use semantic queries (`getByRole`, `getByLabelText`)
- Test accessibility attributes
- Cover edge cases and error scenarios

### 3. Mocking Strategy

- Mock external dependencies (axios, router)
- Use realistic test data
- Test both success and error scenarios
- Verify mock call parameters

### 4. Accessibility Testing

- Test ARIA attributes
- Verify semantic HTML structure
- Check keyboard navigation
- Test screen reader compatibility

## Integration Test Patterns

### User Flow Testing

```typescript
// Example: Filter selection flow
it("filters items when genre is selected", async () => {
  // Mock API responses
  mockDistinctValuesResponse();
  mockItemsResponse([mockItem]);

  // Render component
  render(<HomePage />);

  // Wait for initial load
  await waitFor(() => {
    expect(screen.getByText("Action")).toBeInTheDocument();
  });

  // Simulate user interaction
  const genreSelect = screen.getByLabelText("Genre");
  fireEvent.change(genreSelect, { target: { value: "Action" } });

  // Verify API call
  expect(mockAxios.get).toHaveBeenCalledWith(expect.stringContaining("genre=Action"));
});
```

### Navigation Testing

```typescript
// Example: Navigation flow
it("navigates to item detail when card is clicked", () => {
  render(
    <MemoryRouter>
      <ItemCard item={mockItem} />
    </MemoryRouter>
  );

  const link = screen.getByRole("link");
  expect(link).toHaveAttribute("href", `/item/${mockItem.uid}`);
});
```

## Performance Testing

### Component Re-rendering

```typescript
it("does not re-render unnecessarily", () => {
  const { rerender } = render(<Component prop="value" />);

  // Verify initial render
  expect(screen.getByText("content")).toBeInTheDocument();

  // Re-render with same props
  rerender(<Component prop="value" />);

  // Component should still work correctly
  expect(screen.getByText("content")).toBeInTheDocument();
});
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure `@types/jest` is installed
2. **Mock Issues**: Check axios mock configuration
3. **Router Errors**: Wrap components with `MemoryRouter`
4. **Async Issues**: Use `waitFor` for async operations

### Debug Tips

```typescript
// Debug rendered output
screen.debug();

// Check what queries are available
screen.logTestingPlaygroundURL();

// Verify mock calls
console.log(mockAxios.get.mock.calls);
```

## Future Enhancements

### Planned Test Additions

1. **Page Integration Tests**: Complete user flows
2. **Error Boundary Tests**: Error handling scenarios
3. **Performance Tests**: Component optimization
4. **E2E Tests**: Full application workflows
5. **Visual Regression Tests**: UI consistency

### Testing Tools to Consider

- **Cypress**: End-to-end testing
- **Storybook**: Component documentation and testing
- **React Testing Library User Events**: Enhanced user interaction simulation
- **MSW (Mock Service Worker)**: Advanced API mocking

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add comprehensive test coverage
3. Include accessibility tests
4. Document complex test scenarios
5. Update this README if needed

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing](https://web.dev/accessibility-testing/)
