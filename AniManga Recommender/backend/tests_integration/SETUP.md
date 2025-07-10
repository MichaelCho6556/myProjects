# Integration Tests Setup Guide

## Overview

The integration tests for AniManga Recommender use REAL database connections and services without any mocks. This ensures true end-to-end testing of the application.

## Test Architecture

- **Database**: Uses a separate PostgreSQL test database
- **Redis**: Uses a separate Redis instance for caching/Celery
- **Supabase Client**: Uses `TestSupabaseClient` that works with local database instead of external Supabase service
- **Authentication**: Uses test JWT tokens generated locally

## Prerequisites

1. **PostgreSQL** running on port 5433 (test instance)
2. **Redis** running on port 6380 (test instance)
3. **Python dependencies**: `pip install -r requirements.txt`

## Environment Setup

1. The tests use `.env.test` for configuration (created automatically)
2. Key environment variables:
   ```
   TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5433/animanga_test
   TEST_REDIS_URL=redis://localhost:6380/0
   JWT_SECRET_KEY=test-jwt-secret-integration
   ```

## Running Tests

### Method 1: Using the test runner script (Recommended)
```bash
python run_integration_tests.py
```

### Method 2: Direct pytest
```bash
# Load test environment first
export $(cat .env.test | xargs)

# Run all integration tests
pytest -c pytest.integration.ini

# Run specific test file
pytest -c pytest.integration.ini tests_integration/test_authenticated_api_real.py

# Run specific test
pytest -c pytest.integration.ini -k test_dashboard_endpoint
```

### Method 3: Using Docker Compose (if available)
```bash
# Start test services
docker-compose -f docker-compose.test.yml up -d

# Run tests
python run_integration_tests.py

# Stop services
docker-compose -f docker-compose.test.yml down
```

## Test Structure

- `conftest.py` - Test configuration and fixtures
- `test_supabase_client.py` - Test implementation of Supabase clients
- `fixtures/schema.sql` - Database schema for tests
- Test files:
  - `test_authenticated_api_real.py` - Authenticated endpoint tests
  - `test_public_api_real.py` - Public endpoint tests
  - `test_social_features_real.py` - Social features tests
  - etc.

## Troubleshooting

### "Connection to test-project.supabase.co failed"
- This means the test environment is not properly configured
- Check that `.env.test` exists and is loaded
- Ensure you're using the test runner script or loading env vars

### "generate_jwt_token not found"
- This was a bug in the test client, now fixed
- The `TestSupabaseAuthClient` now includes this method

### Database connection errors
- Ensure PostgreSQL is running on port 5433
- Check credentials in TEST_DATABASE_URL
- Database should be created: `createdb animanga_test`

### Redis connection errors
- Ensure Redis is running on port 6380
- Check TEST_REDIS_URL configuration

## Key Differences from Production

1. **No External Services**: Tests use local database instead of Supabase cloud
2. **Test Data**: Uses fixtures with known test data
3. **JWT Tokens**: Generated locally with test secret key
4. **Transactions**: Each test runs in a transaction that's rolled back

## Adding New Tests

1. Create test file in `tests_integration/` directory
2. Use `@pytest.mark.real_integration` marker
3. Use fixtures from `conftest.py` for database/auth
4. Follow existing patterns for consistency

## Important Notes

- Tests modify the test database - ensure it's separate from development
- Some tests may be slow due to real I/O operations
- Failed tests may leave data in Redis - use cleanup fixtures
- Always use transactions for database operations in tests