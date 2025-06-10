#!/usr/bin/env python3
"""
AniManga Recommender Health Check Module

This module provides health check functionality for the AniManga Recommender Flask
application. It's designed to be used by Docker containers, monitoring systems,
and deployment pipelines to verify application availability and responsiveness.

Key Features:
    - HTTP health check endpoint validation
    - Timeout-based availability testing
    - Docker-compatible exit code handling
    - Lightweight and minimal dependencies
    - Silent operation for monitoring systems

Health Check Process:
    1. Send HTTP GET request to application root endpoint
    2. Validate response status code (200 = healthy)
    3. Return appropriate exit code for system monitoring
    4. Handle network timeouts and connection errors

Exit Codes:
    - 0: Application is healthy and responding
    - 1: Application is unhealthy or unreachable

Usage:
    Command Line:
    >>> python healthcheck.py
    
    Docker Healthcheck:
    >>> HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    ...   CMD python healthcheck.py
    
    Monitoring Systems:
    >>> if python healthcheck.py; then echo "Healthy"; else echo "Unhealthy"; fi

Dependencies:
    - requests: HTTP client for health check requests
    - sys: System exit code handling (standard library)
    - os: Operating system-related functions (standard library)

Security:
    - Uses localhost-only requests for security
    - No authentication required for health endpoint
    - Minimal attack surface with simple HTTP check

Author: AniManga Recommender Team
Version: 1.0.0
License: MIT
"""

import requests
import sys
import os


def check_application_health():
    """
    Perform HTTP health check on the AniManga Recommender application.
    
    This function sends an HTTP GET request to the application's root endpoint
    to verify that the Flask application is running and responding correctly.
    It implements timeout handling and proper error management for monitoring.
    
    Health Check Details:
        - Endpoint: http://localhost:5000/ (Flask default)
        - Method: GET request
        - Timeout: 5 seconds maximum
        - Expected Response: HTTP 200 status code
        - Error Handling: Network errors and timeouts
    
    Returns:
        int: Exit code for system monitoring:
            - 0: Application is healthy (HTTP 200 response)
            - 1: Application is unhealthy (non-200 or error)
    
    Raises:
        SystemExit: Always exits with appropriate code for monitoring systems
    
    Examples:
        >>> # Command line usage
        >>> python healthcheck.py
        >>> echo $?  # Check exit code: 0 = healthy, 1 = unhealthy
        
        >>> # Docker Compose health check
        >>> healthcheck:
        ...   test: ["CMD", "python", "healthcheck.py"]
        ...   interval: 30s
        ...   timeout: 10s
        ...   retries: 3
        
        >>> # Monitoring script integration
        >>> if check_application_health() == 0:
        ...     print("Application is healthy")
        ... else:
        ...     print("Application requires attention")
    
    Network Configuration:
        - Target Host: localhost (127.0.0.1)
        - Target Port: 5000 (Flask development default)
        - Protocol: HTTP (not HTTPS for internal health checks)
        - Connection Timeout: 5 seconds
        - Read Timeout: 5 seconds
    
    Error Handling:
        Connection Errors:
            - Network unreachable
            - Connection refused (application not running)
            - DNS resolution failures
        
        Timeout Errors:
            - Request timeout (> 5 seconds)
            - Slow application response
            - Network latency issues
        
        HTTP Errors:
            - 4xx client errors (should not occur for health check)
            - 5xx server errors (application issues)
            - Unexpected response codes
        
        General Exceptions:
            - Any other network or system errors
            - Graceful failure with exit code 1
    
    Performance:
        - Lightweight operation (< 100ms typical)
        - Minimal memory usage
        - Fast timeout for responsive monitoring
        - No data processing or complex logic
    
    Security Considerations:
        - Uses localhost-only requests (no external exposure)
        - No authentication or sensitive data transmission
        - Safe for use in production monitoring
        - No logging of sensitive information
    
    Integration:
        Docker Health Check:
            Integrates with Docker's HEALTHCHECK directive to provide
            container health status for orchestration systems.
        
        Kubernetes Probes:
            Can be used as readiness or liveness probe for Kubernetes
            deployments with appropriate timeout configurations.
        
        Load Balancer Health Checks:
            Suitable for load balancer health check endpoints when
            exposed through appropriate network configuration.
        
        Monitoring Systems:
            Compatible with Nagios, Prometheus, and other monitoring
            tools that use exit codes for health determination.
    
    Troubleshooting:
        Exit Code 1 Causes:
            - Flask application not started
            - Application running on different port
            - Application crashed or unresponsive
            - Network connectivity issues
            - Firewall blocking local connections
        
        Common Solutions:
            - Verify Flask application is running
            - Check port configuration (default 5000)
            - Review application logs for errors
            - Test manual HTTP request to endpoint
            - Verify localhost connectivity
    
    See Also:
        - Flask Application Documentation
        - Docker HEALTHCHECK Reference
        - Kubernetes Probe Configuration
        - requests.get() Documentation
    
    Note:
        This health check is designed for internal monitoring only and
        should not be exposed to external networks without proper security
        considerations and authentication mechanisms.
    """
    try:
        # Attempt HTTP GET request to Flask application root endpoint
        response = requests.get('http://localhost:5000/', timeout=5)
        
        # Check if response indicates healthy application
        if response.status_code == 200:
            # Application is healthy - return success exit code
            sys.exit(0)
        else:
            # Application returned non-200 status - return failure exit code
            sys.exit(1)
            
    except requests.exceptions.Timeout:
        # Request timed out - application likely unresponsive
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        # Cannot connect to application - likely not running
        sys.exit(1)
    except requests.exceptions.RequestException:
        # Other request-related errors
        sys.exit(1)
    except Exception:
        # Any other unexpected errors
        sys.exit(1)


if __name__ == "__main__":
    check_application_health()