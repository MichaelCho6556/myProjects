#!/bin/bash
# Script to run integration tests with proper setup

echo "🚀 AniManga Recommender - Test Runner"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Start test database
echo -e "${YELLOW}📦 Starting test database...${NC}"
docker-compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 5

# Setup database schema
echo -e "${YELLOW}🔧 Setting up test database schema...${NC}"
python scripts/setup_test_db.py

# Activate virtual environment
if [ -f "venv/Scripts/activate" ]; then
    # Windows Git Bash
    source venv/Scripts/activate
elif [ -f "venv/bin/activate" ]; then
    # Linux/Mac
    source venv/bin/activate
else
    echo -e "${RED}❌ Virtual environment not found. Please create it first.${NC}"
    exit 1
fi

# Export test environment variables
export TESTING=true
export TEST_DATABASE_URL="postgresql://test_user:test_password@localhost:5433/animanga_test"
export JWT_SECRET_KEY="test-jwt-secret-key"
export SUPABASE_URL="https://test.supabase.co"
export SUPABASE_KEY="test-anon-key"
export SUPABASE_SERVICE_KEY="test-service-key"

# Run tests based on argument
if [ "$1" == "unit" ]; then
    echo -e "${GREEN}🧪 Running unit tests...${NC}"
    pytest tests_unit -v -m "not real_integration"
elif [ "$1" == "integration" ]; then
    echo -e "${GREEN}🧪 Running integration tests...${NC}"
    pytest tests_integration -v -m "real_integration"
elif [ "$1" == "all" ]; then
    echo -e "${GREEN}🧪 Running all tests...${NC}"
    pytest tests_unit tests_integration -v
elif [ "$1" == "fast" ]; then
    echo -e "${GREEN}🧪 Running fast tests only...${NC}"
    pytest tests_unit tests_integration -v -m "not slow"
elif [ "$1" == "single" ] && [ -n "$2" ]; then
    echo -e "${GREEN}🧪 Running single test file: $2${NC}"
    pytest "$2" -v
else
    echo "Usage: ./run_tests.sh [unit|integration|all|fast|single <file>]"
    echo ""
    echo "Options:"
    echo "  unit        - Run unit tests only"
    echo "  integration - Run integration tests only"
    echo "  all         - Run all tests"
    echo "  fast        - Run fast tests only (skip slow tests)"
    echo "  single      - Run a single test file"
    echo ""
    echo "Example:"
    echo "  ./run_tests.sh integration"
    echo "  ./run_tests.sh single tests_unit/test_user_journey_integration.py"
fi

# Cleanup option
echo ""
echo -e "${YELLOW}💡 To stop test database: docker-compose -f docker-compose.test.yml down${NC}"