#!/bin/bash

##############################################################################
# Post-Deployment Test Orchestration Script for AniManga Recommender
#
# This script runs all post-deployment tests in the correct sequence,
# collects results, and provides comprehensive reporting.
#
# Usage:
#   ./run_all_post_deployment_tests.sh [production|staging|local]
#
# Examples:
#   # Test production
#   ./run_all_post_deployment_tests.sh production
#
#   # Test staging with custom URL
#   TARGET_URL=https://staging.example.com ./run_all_post_deployment_tests.sh staging
#
#   # Test local development
#   ./run_all_post_deployment_tests.sh local
#
# Environment Variables:
#   TARGET_URL - Backend URL to test (overrides environment defaults)
#   FRONTEND_URL - Frontend URL for CORS testing
#   TEST_USER_EMAIL - Email for authenticated tests
#   TEST_USER_PASSWORD - Password for authenticated tests
#   SKIP_SLOW_TESTS - Skip performance and load tests
#   NOTIFY_WEBHOOK - Webhook URL for notifications (Slack/Discord)
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="${BACKEND_DIR}/test_reports"
REPORT_FILE="${REPORT_DIR}/post_deployment_${ENVIRONMENT}_${TIMESTAMP}.txt"

# Create report directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Set environment-specific URLs
case $ENVIRONMENT in
    production)
        export TARGET_URL=${TARGET_URL:-"https://animanga-backend.onrender.com"}
        export FRONTEND_URL=${FRONTEND_URL:-"https://animanga-recommender.vercel.app"}
        ;;
    staging)
        export TARGET_URL=${TARGET_URL:-"https://animanga-backend-staging.onrender.com"}
        export FRONTEND_URL=${FRONTEND_URL:-"https://animanga-staging.vercel.app"}
        ;;
    local)
        export TARGET_URL=${TARGET_URL:-"http://localhost:5000"}
        export FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}
        ;;
    *)
        echo -e "${RED}Invalid environment: $ENVIRONMENT${NC}"
        echo "Usage: $0 [production|staging|local]"
        exit 1
        ;;
esac

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
TEST_RESULTS=()

##############################################################################
# Helper Functions
##############################################################################

log() {
    echo -e "$1" | tee -a "$REPORT_FILE"
}

log_header() {
    log "\n${BLUE}===============================================================================${NC}"
    log "${BLUE}$1${NC}"
    log "${BLUE}===============================================================================${NC}"
}

log_success() {
    log "${GREEN}✅ $1${NC}"
}

log_error() {
    log "${RED}❌ $1${NC}"
}

log_warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    log "${BLUE}ℹ️  $1${NC}"
}

run_test() {
    local test_name=$1
    local test_command=$2
    local allow_failure=${3:-false}
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    log_header "Running: $test_name"
    log "Command: $test_command"
    log "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Run test and capture exit code
    set +e  # Temporarily allow errors
    if eval "$test_command" >> "$REPORT_FILE" 2>&1; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TEST_RESULTS+=("✅ $test_name: PASSED")
        log_success "$test_name completed successfully"
    else
        exit_code=$?
        if [ "$allow_failure" = true ]; then
            SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
            TEST_RESULTS+=("⚠️  $test_name: SKIPPED (non-critical)")
            log_warning "$test_name failed (non-critical)"
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
            TEST_RESULTS+=("❌ $test_name: FAILED (exit code: $exit_code)")
            log_error "$test_name failed with exit code: $exit_code"
        fi
    fi
    set -e  # Re-enable exit on error
}

check_service_availability() {
    log_header "Checking Service Availability"
    
    log "Testing connection to: $TARGET_URL"
    
    if curl -f -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$TARGET_URL" > /dev/null; then
        log_success "Service is reachable at $TARGET_URL"
        return 0
    else
        log_error "Cannot connect to service at $TARGET_URL"
        return 1
    fi
}

send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$NOTIFY_WEBHOOK" ]; then
        # Slack/Discord webhook notification
        local color="good"
        local emoji="✅"
        
        if [ "$status" = "failed" ]; then
            color="danger"
            emoji="❌"
        elif [ "$status" = "warning" ]; then
            color="warning"
            emoji="⚠️"
        fi
        
        local payload=$(cat <<EOF
{
    "text": "$emoji Post-Deployment Tests - $ENVIRONMENT",
    "attachments": [{
        "color": "$color",
        "title": "Test Results",
        "text": "$message",
        "fields": [
            {"title": "Environment", "value": "$ENVIRONMENT", "short": true},
            {"title": "Target", "value": "$TARGET_URL", "short": true},
            {"title": "Total Tests", "value": "$TOTAL_TESTS", "short": true},
            {"title": "Passed", "value": "$PASSED_TESTS", "short": true},
            {"title": "Failed", "value": "$FAILED_TESTS", "short": true},
            {"title": "Skipped", "value": "$SKIPPED_TESTS", "short": true}
        ],
        "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
             --data "$payload" "$NOTIFY_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

##############################################################################
# Main Test Execution
##############################################################################

# Start testing
log_header "POST-DEPLOYMENT TEST SUITE"
log "Environment: $ENVIRONMENT"
log "Backend URL: $TARGET_URL"
log "Frontend URL: $FRONTEND_URL"
log "Report File: $REPORT_FILE"
log "Start Time: $(date '+%Y-%m-%d %H:%M:%S')"

# Check Python and pytest availability
if ! command -v python3 &> /dev/null; then
    log_error "Python 3 is not installed"
    exit 1
fi

if ! python3 -m pytest --version &> /dev/null; then
    log_warning "pytest is not installed, installing..."
    pip3 install pytest requests || {
        log_error "Failed to install pytest"
        exit 1
    }
fi

# Check service availability first
if ! check_service_availability; then
    log_error "Service is not available. Aborting tests."
    send_notification "failed" "Service unreachable at $TARGET_URL"
    exit 1
fi

##############################################################################
# Run Test Suites
##############################################################################

# 1. Smoke Tests (Critical - must pass)
run_test "Smoke Tests" \
    "python3 ${SCRIPT_DIR}/production_smoke_tests.py" \
    false

# 2. Main Post-Deployment Tests (Critical - must pass)
run_test "Post-Deployment Tests" \
    "python3 -m pytest ${SCRIPT_DIR}/post_deployment_tests.py -v --tb=short" \
    false

# 3. CORS Validation (Critical for frontend integration)
run_test "CORS Validation" \
    "python3 ${SCRIPT_DIR}/cors_validation.py" \
    false

# 4. Security Audit (Important but allow failure in dev)
if [ "$ENVIRONMENT" = "production" ]; then
    run_test "Security Audit" \
        "python3 ${SCRIPT_DIR}/security_audit.py" \
        false
else
    run_test "Security Audit" \
        "python3 ${SCRIPT_DIR}/security_audit.py" \
        true
fi

# 5. Performance Baseline (Skip if SKIP_SLOW_TESTS is set)
if [ -z "$SKIP_SLOW_TESTS" ]; then
    if [ "$ENVIRONMENT" = "production" ]; then
        # Establish or compare baseline for production
        if [ -f "performance_baseline.json" ]; then
            run_test "Performance Comparison" \
                "python3 ${SCRIPT_DIR}/performance_baseline.py --compare" \
                true
        else
            run_test "Performance Baseline" \
                "python3 ${SCRIPT_DIR}/performance_baseline.py --establish" \
                true
        fi
    else
        # Quick performance check for non-production
        run_test "Performance Check" \
            "python3 ${SCRIPT_DIR}/performance_baseline.py" \
            true
    fi
else
    log_warning "Skipping performance tests (SKIP_SLOW_TESTS is set)"
fi

# 6. Production Endpoint Integration Tests (if credentials available)
if [ -n "$TEST_USER_EMAIL" ] && [ -n "$TEST_USER_PASSWORD" ]; then
    run_test "Integration Tests" \
        "python3 -m pytest ${BACKEND_DIR}/tests_integration/test_production_endpoints.py -v" \
        true
else
    log_warning "Skipping authenticated integration tests (no credentials provided)"
fi

##############################################################################
# Generate Summary Report
##############################################################################

log_header "TEST EXECUTION SUMMARY"

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
else
    SUCCESS_RATE=0
fi

# Display results
log "Total Tests Run: $TOTAL_TESTS"
log "Passed: $PASSED_TESTS"
log "Failed: $FAILED_TESTS"
log "Skipped: $SKIPPED_TESTS"
log "Success Rate: ${SUCCESS_RATE}%"

log_header "Individual Test Results"
for result in "${TEST_RESULTS[@]}"; do
    log "$result"
done

# Determine overall status
OVERALL_STATUS="PASSED"
STATUS_MESSAGE="All critical tests passed"

if [ $FAILED_TESTS -gt 0 ]; then
    OVERALL_STATUS="FAILED"
    STATUS_MESSAGE="$FAILED_TESTS tests failed"
elif [ $SKIPPED_TESTS -gt 0 ]; then
    OVERALL_STATUS="PASSED WITH WARNINGS"
    STATUS_MESSAGE="Passed with $SKIPPED_TESTS non-critical failures"
fi

log_header "FINAL STATUS: $OVERALL_STATUS"
log "$STATUS_MESSAGE"
log "End Time: $(date '+%Y-%m-%d %H:%M:%S')"
log "Full report saved to: $REPORT_FILE"

# Send notification
if [ "$OVERALL_STATUS" = "PASSED" ]; then
    send_notification "success" "$STATUS_MESSAGE"
elif [ "$OVERALL_STATUS" = "FAILED" ]; then
    send_notification "failed" "$STATUS_MESSAGE"
else
    send_notification "warning" "$STATUS_MESSAGE"
fi

# Exit with appropriate code
if [ "$OVERALL_STATUS" = "FAILED" ]; then
    exit 1
else
    exit 0
fi