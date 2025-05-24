# AniManga Recommender Backend Testing Suite

This directory contains comprehensive unit and integration tests for the AniManga Recommender backend API.

## Test Structure

```
tests/
├── conftest.py                    # Test configuration and fixtures
├── test_unit_helpers.py           # Unit tests for helper functions
├── test_unit_data_loading.py      # Unit tests for data loading with mocking
├── test_integration_api.py        # Integration tests for API endpoints
└── README.md                      # This documentation
```

## Test Categories

### Unit Tests (@pytest.mark.unit)

- Test individual functions in isolation
- Use mocking to avoid external dependencies
- Fast execution
- High code coverage

### Integration Tests (@pytest.mark.integration)

- Test API endpoints end-to-end
- Test interaction between components
- Use test data fixtures
- Verify real request/response cycles

### Slow Tests (@pytest.mark.slow)

- Performance tests
- Large dataset simulations
- Long-running operations

## Running Tests

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run All Tests

```bash
pytest
```

### Run Specific Test Categories

```bash
# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# Exclude slow tests
pytest -m "not slow"

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=app --cov-report=html
```

### Run Specific Test Files

```bash
# Unit tests for helpers
pytest tests/test_unit_helpers.py

# Integration tests for API
pytest tests/test_integration_api.py

# Data loading tests
pytest tests/test_unit_data_loading.py
```

### Run Specific Test Functions

```bash
# Test a specific function
pytest tests/test_unit_helpers.py::TestParseListColsOnLoad::test_parse_valid_list_strings

# Test a specific class
pytest tests/test_integration_api.py::TestItemsEndpoint
```

## Test Coverage

### Helper Functions (test_unit_helpers.py)

- ✅ `parse_list_cols_on_load()` - List parsing and validation
- ✅ `map_field_names_for_frontend()` - Field mapping
- ✅ `map_records_for_frontend()` - Batch field mapping
- ✅ `apply_multi_filter()` - Multi-select filtering logic

### Data Loading (test_unit_data_loading.py)

- ✅ `load_data_and_tfidf()` - Data loading with various scenarios
- ✅ File not found handling
- ✅ Empty dataset scenarios
- ✅ SFW filtering
- ✅ TF-IDF computation errors
- ✅ Missing columns handling

### API Endpoints (test_integration_api.py)

- ✅ `GET /` - Health check endpoint
- ✅ `GET /api/distinct-values` - Filter options
- ✅ `GET /api/items` - Item listing with all parameters
- ✅ `GET /api/items/<uid>` - Item details
- ✅ `GET /api/recommendations/<uid>` - Recommendations

### Test Scenarios Covered

#### Items Endpoint (`/api/items`)

- Default parameters
- Pagination (page, per_page)
- Text search (q parameter)
- Media type filtering
- Single and multi-select genre filtering
- Theme, demographic, studio, author filtering
- Status filtering
- Score and year filtering
- Sorting options (score, title, popularity, date)
- Combined filters
- Empty results
- Error handling

#### Recommendations Endpoint (`/api/recommendations/<uid>`)

- Successful recommendations
- Custom recommendation count (n parameter)
- Non-existent item handling
- Field mapping verification
- Required fields validation

#### Error Scenarios

- Invalid parameters
- Missing data
- Uninitialized states
- Malformed requests
- Performance edge cases

## Fixtures

### Data Fixtures (conftest.py)

- `sample_dataframe` - Complete test dataset with 5 items
- `sample_tfidf_data` - TF-IDF matrices and vectorizers
- `mock_empty_dataframe` - Empty dataset for edge cases
- `sample_list_data` - Various list parsing scenarios
- `sample_filter_data` - Filter parameter variations

### Mock Fixtures

- `mock_globals` - Mocked global variables with test data
- `mock_empty_globals` - Mocked empty global state
- `mock_none_globals` - Mocked uninitialized state

### Client Fixture

- `client` - Flask test client with proper configuration

## Testing Best Practices

### 1. Test Isolation

- Each test is independent
- Use fixtures to set up test data
- Mock external dependencies
- Clean up after tests

### 2. Comprehensive Coverage

- Test happy paths
- Test edge cases and error conditions
- Test boundary values
- Test invalid inputs

### 3. Realistic Test Data

- Use realistic anime/manga data
- Include various data types and structures
- Test with missing and null values
- Include multilingual content

### 4. Performance Testing

- Test with large datasets (marked as slow)
- Verify response times
- Test pagination with large results
- Test complex filter combinations

## Mocking Strategy

### Global Variables

```python
# Mock loaded state
@pytest.fixture
def mock_globals(monkeypatch, sample_dataframe):
    monkeypatch.setattr('app.df_processed', sample_dataframe)
    monkeypatch.setattr('app.tfidf_matrix_global', mock_matrix)
    # ...
```

### External Dependencies

```python
# Mock pandas CSV reading
@patch('app.pd.read_csv')
def test_load_data_success(mock_read_csv):
    mock_read_csv.return_value = sample_dataframe
    # ...
```

### TF-IDF Computation

```python
# Mock scikit-learn TfidfVectorizer
@patch('app.TfidfVectorizer')
def test_tfidf_computation(mock_vectorizer):
    mock_vectorizer_instance = MagicMock()
    mock_vectorizer.return_value = mock_vectorizer_instance
    # ...
```

## Common Test Patterns

### API Response Validation

```python
def test_api_endpoint(client, mock_globals):
    response = client.get('/api/endpoint')

    assert response.status_code == 200
    data = json.loads(response.data)

    # Validate structure
    assert 'key' in data
    assert isinstance(data['items'], list)

    # Validate content
    for item in data['items']:
        assert 'required_field' in item
```

### Error Handling Validation

```python
def test_error_scenario(client, mock_none_globals):
    response = client.get('/api/endpoint')

    assert response.status_code == 503  # Service Unavailable
    data = json.loads(response.data)
    assert 'error' in data
```

### Filter Testing

```python
def test_filter_logic(client, mock_globals):
    response = client.get('/api/items?genre=action,adventure')
    data = json.loads(response.data)

    for item in data['items']:
        genres = [g.lower() for g in item['genres']]
        assert 'action' in genres
        assert 'adventure' in genres
```

## Continuous Integration

The tests are designed to run in CI/CD environments:

- No external file dependencies (mocked)
- Deterministic results
- Fast execution (< 30 seconds for full suite)
- Clear failure messages
- Proper exit codes

## Coverage Goals

- **Unit Tests**: 95%+ coverage of helper functions
- **Integration Tests**: 100% endpoint coverage
- **Error Scenarios**: All error paths tested
- **Edge Cases**: Boundary conditions covered

## Adding New Tests

When adding new functionality:

1. Add unit tests for new helper functions
2. Add integration tests for new endpoints
3. Update fixtures if new data structures are needed
4. Add error scenario tests
5. Update this documentation

## Troubleshooting

### Common Issues

**Import Errors**

```bash
# Ensure you're in the backend directory
cd backend
pytest
```

**Fixture Not Found**

```bash
# Check conftest.py is in tests/ directory
# Verify fixture names match usage
```

**Mock Failures**

```bash
# Verify patch paths are correct
# Check that mocked objects have expected methods
```

**Test Data Issues**

```bash
# Ensure sample data in fixtures matches expected format
# Verify field names and types are consistent
```
