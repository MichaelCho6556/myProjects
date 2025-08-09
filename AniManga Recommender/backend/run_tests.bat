@echo off
REM Script to run integration tests on Windows

echo AniManga Recommender - Test Runner
echo ======================================

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

REM Start test database
echo Starting test database...
docker-compose -f docker-compose.test.yml up -d

REM Wait for database
echo Waiting for database to be ready...
timeout /t 5 /nobreak >nul

REM Setup database schema
echo Setting up test database schema...
python scripts\setup_test_db.py

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo ERROR: Virtual environment not found. Please create it first.
    exit /b 1
)

REM Set test environment variables
set TESTING=true
set TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5433/animanga_test
set JWT_SECRET_KEY=test-jwt-secret-key
set SUPABASE_URL=https://test.supabase.co
set SUPABASE_KEY=test-anon-key
set SUPABASE_SERVICE_KEY=test-service-key

REM Run tests based on argument
if "%1"=="unit" (
    echo Running unit tests...
    pytest tests_unit -v -m "not real_integration"
) else if "%1"=="integration" (
    echo Running integration tests...
    pytest tests_integration -v -m "real_integration"
) else if "%1"=="all" (
    echo Running all tests...
    pytest tests_unit tests_integration -v
) else if "%1"=="fast" (
    echo Running fast tests only...
    pytest tests_unit tests_integration -v -m "not slow"
) else if "%1"=="single" (
    if "%2"=="" (
        echo ERROR: Please specify a test file
        goto :usage
    )
    echo Running single test file: %2
    pytest %2 -v
) else (
    :usage
    echo Usage: run_tests.bat [unit^|integration^|all^|fast^|single ^<file^>]
    echo.
    echo Options:
    echo   unit        - Run unit tests only
    echo   integration - Run integration tests only
    echo   all         - Run all tests
    echo   fast        - Run fast tests only (skip slow tests)
    echo   single      - Run a single test file
    echo.
    echo Example:
    echo   run_tests.bat integration
    echo   run_tests.bat single tests_unit\test_user_journey_integration.py
)

echo.
echo To stop test database: docker-compose -f docker-compose.test.yml down