# Integration Tests - Real Database Testing

This directory contains **REAL integration tests** that use actual services (PostgreSQL, Redis, Celery) instead of mocks. These tests provide true validation of the application's functionality.

## 🚨 CRITICAL: NO MOCKS POLICY

**These tests use ZERO mocks.** Every test uses real:
- PostgreSQL database connections
- Redis cache operations  
- Celery background workers
- JWT authentication
- HTTP requests to Flask endpoints
- File system operations

## Test Structure

### Core Test Files

- `test_auth_real.py` - Authentication and JWT validation
- `test_public_api_real.py` - Public API endpoints (items, recommendations)
- `test_authenticated_api_real.py` - Protected endpoints (dashboard, user data)
- `test_social_features_real.py` - Comments, reviews, following, moderation
- `test_celery_redis_real.py` - Background tasks and caching
- `test_utilities_real.py` - Utility modules and batch operations
- `test_security_performance_real.py` - Security vulnerabilities and performance

### Configuration Files

- `conftest.py` - Real fixtures (NO MOCKS)
- `pytest.integration.ini` - Integration test configuration
- `pytest.unit.ini` - Unit test configuration (legacy)
- `../pytest.ini` - Main configuration supporting both

## Prerequisites

### 1. Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start Test Infrastructure

```bash
# Start test databases and services
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
sleep 10
```

### 3. Verify Services

```bash
# Check PostgreSQL
psql postgresql://test_user:test_password@localhost:5433/animanga_test -c "SELECT 1;"

# Check Redis
redis-cli -p 6380 ping
```

## Running Tests

### Run All Integration Tests

```bash
# Use integration configuration
pytest -c pytest.integration.ini

# Or with explicit markers
pytest -m "real_integration" --tb=short
```

### Run Specific Test Categories

```bash
# Authentication tests
pytest tests_integration/test_auth_real.py -v

# API endpoint tests
pytest tests_integration/test_public_api_real.py -v
pytest tests_integration/test_authenticated_api_real.py -v

# Social features
pytest tests_integration/test_social_features_real.py -v

# Background processing
pytest tests_integration/test_celery_redis_real.py -v

# Security and performance
pytest tests_integration/test_security_performance_real.py -v
```

### Run by Test Markers

```bash
# Performance tests only
pytest -m "performance" -v

# Security tests only  
pytest -m "security" -v

# Celery tests only
pytest -m "celery" -v

# Slow tests only
pytest -m "slow" -v
```

### Run with Coverage

```bash
pytest -c pytest.integration.ini --cov=. --cov-report=html --cov-report=term
```

## Test Categories

### 🔐 Security Tests (`-m security`)

- SQL injection protection
- XSS prevention
- Authentication bypass attempts
- Authorization escalation
- CSRF protection
- Rate limiting
- Input validation

### ⚡ Performance Tests (`-m performance`)

- Concurrent user load testing
- Database query optimization
- API endpoint response times
- Memory usage under load
- Caching performance impact
- Resource exhaustion protection

### 🔄 Background Processing (`-m celery`)

- Real Celery task execution
- Redis caching operations
- Scheduled task functionality
- Task retry mechanisms
- Error handling and recovery

### 👥 Social Features

- Real comment system operations
- Review creation and voting
- User following relationships
- Moderation workflows
- Content analysis pipelines

## Database Management

### Test Data Cleanup

Tests automatically clean up data using fixtures:

```python
@pytest.fixture(autouse=True)
def cleanup_test_data(database_connection):
    yield
    # Automatic cleanup after each test
```

### Manual Cleanup

```bash
# Reset test database
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

## Performance Benchmarking

Tests include performance benchmarking:

```python
def test_endpoint_performance(client, benchmark_timer):
    with benchmark_timer('api_call'):
        response = client.get('/api/items')
        assert response.status_code == 200
```

Results appear in test output:
```
Performance Metrics:
  api_call: 0.045s
  db_query: 0.012s
  cache_operation: 0.003s
```

## Debugging Failed Tests

### Database Issues

```bash
# Check database connection
docker logs backend_test_postgres_1

# Verify test data
psql postgresql://test_user:test_password@localhost:5433/animanga_test
\dt  # List tables
SELECT COUNT(*) FROM items;
```

### Redis Issues

```bash
# Check Redis connection
docker logs backend_test_redis_1

# Verify cache data  
redis-cli -p 6380
KEYS *
```

### Celery Issues

```bash
# Check if Celery worker is running
ps aux | grep celery

# Start worker manually for debugging
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info
```

## Migration from Legacy Tests

The legacy test suite (in `tests_unit/`) uses mocks extensively. Key differences:

### Legacy (Mocked) Approach
```python
@pytest.fixture
def mock_database():
    return MagicMock()

def test_user_creation(mock_database):
    mock_database.execute.return_value = Mock()
    # Test with mocked database
```

### New (Real) Approach  
```python
@pytest.fixture
def database_connection():
    return create_real_database_connection()

def test_user_creation(database_connection):
    with database_connection.begin():
        # Test with real database
        result = database_connection.execute(...)
```

## Contributing

### Adding New Integration Tests

1. **NO MOCKS** - Use real services only
2. **Use fixtures** - Leverage existing database/Redis fixtures
3. **Clean up data** - Ensure tests clean up after themselves
4. **Add markers** - Use appropriate pytest markers
5. **Document complex tests** - Add docstrings for complex scenarios

### Test Naming Convention

- `test_*_real.py` - Integration test files
- `TestClassName` - Test classes 
- `test_method_name` - Test methods
- Markers: `@pytest.mark.real_integration`

### Performance Considerations

- Use `benchmark_timer` for performance measurements
- Keep test data reasonably sized
- Use transactions for faster cleanup
- Consider parallel execution limitations

## Troubleshooting

### Common Issues

1. **Port conflicts** - Ensure ports 5433 (PostgreSQL) and 6380 (Redis) are free
2. **Permission issues** - Check Docker daemon permissions
3. **Service startup time** - Wait for services to be fully ready
4. **Resource constraints** - Ensure adequate memory/CPU for concurrent tests

### Getting Help

1. Check test logs: `pytest --tb=long -v`
2. Verify service status: `docker-compose -f docker-compose.test.yml ps`
3. Review database/Redis logs
4. Test individual components in isolation

## Future Enhancements

- [ ] Add integration with CI/CD pipelines  
- [ ] Implement test data seeding strategies
- [ ] Add more comprehensive security testing
- [ ] Enhance performance benchmarking metrics
- [ ] Create test environment automation scripts