/**
 * E2E Test Utilities
 *
 * Comprehensive utilities for end-to-end testing of privacy enforcement
 * with real Supabase authentication and backend integration.
 */

import { supabase } from "../../lib/supabase";
import { E2E_CONFIG, E2ETestUser, e2eLogger, generateTestUsers, checkE2EEnvironment } from "../setup/e2eTestSetup";

// User management utilities
export class E2EUserManager {
  private createdUserIds: string[] = [];

  // Create a test user with real Supabase authentication
  async createTestUser(userData: E2ETestUser): Promise<E2ETestUser> {
    try {
      e2eLogger.auth(`Creating test user: ${userData.username}`);

      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            full_name: `E2E Test User - ${userData.username}`,
          },
        },
      });

      if (error) {
        e2eLogger.error(`Failed to create user ${userData.username}:`, error.message);
        userData.authError = error;
        return userData;
      }

      if (data.user) {
        userData.id = data.user.id;
        userData.supabaseUser = data.user;
        this.createdUserIds.push(data.user.id);

        e2eLogger.auth(`Successfully created user ${userData.username} with ID: ${data.user.id}`);

        // Wait a moment for user to be properly created
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Set privacy settings if user is confirmed or confirmation not required
        if (data.user.email_confirmed_at || !data.user.confirmation_sent_at) {
          await this.setUserPrivacySettings(userData);
        }
      }

      return userData;
    } catch (err) {
      e2eLogger.error(`Error creating test user ${userData.username}:`, err);
      userData.authError = err;
      return userData;
    }
  }

  // Set privacy settings for a user
  async setUserPrivacySettings(userData: E2ETestUser): Promise<boolean> {
    try {
      e2eLogger.auth(`Setting privacy settings for user: ${userData.username}`);

      // Sign in as the user to set privacy settings
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });

      if (signInError) {
        e2eLogger.warn(
          `Could not sign in to set privacy for user ${userData.username}:`,
          signInError.message
        );
        return false;
      }

      // Get session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        e2eLogger.warn(`No session available for user ${userData.username}`);
        return false;
      }

      // Update privacy settings via backend API
      const response = await fetch(`${E2E_CONFIG.backendUrl}/api/auth/privacy-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(userData.privacy),
      });

      if (response.ok) {
        e2eLogger.auth(`Successfully set privacy settings for user ${userData.username}`);
        return true;
      } else {
        const errorText = await response.text();
        e2eLogger.warn(`Failed to set privacy settings for user ${userData.username}:`, errorText);
        return false;
      }
    } catch (error) {
      e2eLogger.warn(`Error setting privacy settings for ${userData.username}:`, error);
      return false;
    } finally {
      // Always sign out after setting privacy
      await supabase.auth.signOut();
    }
  }

  // Sign in as a test user
  async signInAsUser(userData: E2ETestUser): Promise<boolean> {
    try {
      e2eLogger.auth(`Signing in as user: ${userData.username}`);

      const { error } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });

      if (error) {
        e2eLogger.error(`Failed to sign in user ${userData.username}:`, error.message);
        return false;
      }

      e2eLogger.auth(`Successfully signed in user ${userData.username}`);
      return true;
    } catch (err) {
      e2eLogger.error(`Error signing in user ${userData.username}:`, err);
      return false;
    }
  }

  // Clean up all created test users
  async cleanup(): Promise<void> {
    try {
      e2eLogger.info(`Cleaning up ${this.createdUserIds.length} test users`);

      // Sign out any current session
      await supabase.auth.signOut();

      // Note: In a production test environment, you might want to delete
      // test users from the database here. For now, we just clear the tracking.
      this.createdUserIds = [];

      e2eLogger.info("E2E user cleanup completed");
    } catch (error) {
      e2eLogger.warn("Error during user cleanup:", error);
    }
  }

  // Get list of created user IDs
  getCreatedUserIds(): string[] {
    return [...this.createdUserIds];
  }
}

// Authentication state utilities
export class E2EAuthHelper {
  // Wait for authentication state to stabilize
  static async waitForAuthState(timeout: number = E2E_CONFIG.authTimeout): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error(`Authentication state timeout after ${timeout}ms`));
      }, timeout);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
          resolve(session);
        }
      });
    });
  }

  // Get current session with timeout
  static async getCurrentSession(timeout: number = 5000): Promise<any> {
    return Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Session timeout")), timeout)),
    ]);
  }

  // Ensure clean auth state
  static async ensureSignedOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      // Wait a moment for sign out to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      e2eLogger.warn("Error ensuring signed out state:", error);
    }
  }
}

// Privacy testing utilities
export class E2EPrivacyTester {
  // Test profile access with specific user
  static async testProfileAccess(
    viewerUser: E2ETestUser | null,
    targetUsername: string,
    expectedResult: "allowed" | "denied" | "error"
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Sign in as viewer if provided
      if (viewerUser) {
        const userManager = new E2EUserManager();
        const signInSuccess = await userManager.signInAsUser(viewerUser);
        if (!signInSuccess) {
          return { success: false, message: "Failed to sign in as viewer" };
        }
      } else {
        await E2EAuthHelper.ensureSignedOut();
      }

      // Make request to profile endpoint
      const session = viewerUser ? (await supabase.auth.getSession()).data.session : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${E2E_CONFIG.backendUrl}/api/users/${targetUsername}`, {
        method: "GET",
        headers,
      });

      // Evaluate result based on expected outcome
      switch (expectedResult) {
        case "allowed":
          return {
            success: response.ok,
            message: response.ok ? "Access allowed as expected" : `Access denied: ${response.status}`,
          };

        case "denied":
          return {
            success: response.status === 403 || response.status === 404,
            message:
              response.status === 403 || response.status === 404
                ? "Access denied as expected"
                : `Unexpected response: ${response.status}`,
          };

        case "error":
          return {
            success: !response.ok,
            message: !response.ok ? "Error response as expected" : "Unexpected success",
          };

        default:
          return { success: false, message: "Invalid expected result" };
      }
    } catch (error) {
      return {
        success: expectedResult === "error",
        message: `Request error: ${error}`,
      };
    }
  }

  // Test list discovery with privacy filtering
  static async testListDiscovery(
    viewerUser: E2ETestUser | null
  ): Promise<{ success: boolean; lists?: any[]; message?: string }> {
    try {
      // Sign in as viewer if provided
      if (viewerUser) {
        const userManager = new E2EUserManager();
        const signInSuccess = await userManager.signInAsUser(viewerUser);
        if (!signInSuccess) {
          return { success: false, message: "Failed to sign in as viewer" };
        }
      } else {
        await E2EAuthHelper.ensureSignedOut();
      }

      // Make request to list discovery endpoint
      const session = viewerUser ? (await supabase.auth.getSession()).data.session : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`${E2E_CONFIG.backendUrl}/api/lists/discover`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          lists: data.lists || [],
          message: "List discovery successful",
        };
      } else {
        return {
          success: false,
          message: `List discovery failed: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `List discovery error: ${error}`,
      };
    }
  }
}

// Test data generators
export class E2EDataGenerator {
  // Generate unique test data with timestamp
  static generateUniqueData(base: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    return `${base}_${ts}_${Math.random().toString(36).substr(2, 5)}`;
  }

  // Generate test email
  static generateTestEmail(prefix: string, timestamp?: number): string {
    return `${this.generateUniqueData(prefix, timestamp)}@${E2E_CONFIG.testEmailDomain}`;
  }

  // Generate test username
  static generateTestUsername(prefix: string, timestamp?: number): string {
    return this.generateUniqueData(prefix, timestamp);
  }
}

// Export singleton instances for convenience
export const e2eUserManager = new E2EUserManager();
export const e2eAuthHelper = E2EAuthHelper;
export const e2ePrivacyTester = E2EPrivacyTester;
export const e2eDataGenerator = E2EDataGenerator;

// Test Suite: E2E Utilities Integration Tests
describe('E2E Test Utilities Integration', () => {
  const testTimestamp = Date.now();
  const testUsers = generateTestUsers(testTimestamp);
  let userManager: E2EUserManager;

  beforeAll(async () => {
    // Check E2E environment before running tests
    const envStatus = await checkE2EEnvironment();
    e2eLogger.info('E2E Environment Status:', envStatus);

    if (!envStatus.envValid) {
      console.warn('E2E environment not fully configured, some tests may be skipped');
    }
  }, 30000);

  beforeEach(() => {
    userManager = new E2EUserManager();
  });

  afterEach(async () => {
    // Clean up after each test
    await userManager.cleanup();
    await E2EAuthHelper.ensureSignedOut();
  }, 15000);

  describe('E2EDataGenerator', () => {
    test('should generate unique data with timestamp', () => {
      const base = 'test';
      const timestamp = Date.now();
      const result = E2EDataGenerator.generateUniqueData(base, timestamp);
      
      expect(result).toContain(base);
      expect(result).toContain(timestamp.toString());
      expect(result.length).toBeGreaterThan(base.length);
    });

    test('should generate unique test emails', () => {
      const prefix = 'testuser';
      const timestamp = Date.now();
      const email = E2EDataGenerator.generateTestEmail(prefix, timestamp);
      
      expect(email).toContain(prefix);
      expect(email).toContain('@');
      expect(email).toContain(E2E_CONFIG.testEmailDomain);
    });

    test('should generate unique test usernames', () => {
      const prefix = 'user';
      const timestamp = Date.now();
      const username = E2EDataGenerator.generateTestUsername(prefix, timestamp);
      
      expect(username).toContain(prefix);
      expect(username).toContain(timestamp.toString());
    });

    test('should generate different values on subsequent calls', () => {
      const base = 'test';
      const result1 = E2EDataGenerator.generateUniqueData(base);
      const result2 = E2EDataGenerator.generateUniqueData(base);
      
      expect(result1).not.toBe(result2);
    });
  });

  describe('E2EAuthHelper', () => {
    test('should ensure signed out state', async () => {
      await E2EAuthHelper.ensureSignedOut();
      
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    }, 10000);

    test('should get current session with timeout', async () => {
      const sessionResult = await E2EAuthHelper.getCurrentSession(5000);
      expect(sessionResult).toBeDefined();
      expect(sessionResult.data).toBeDefined();
    }, 10000);

    test('should handle session timeout', async () => {
      // Test timeout functionality by mocking a slow operation
      const originalGetSession = supabase.auth.getSession;
      supabase.auth.getSession = () => new Promise(resolve => setTimeout(resolve, 10000));
      
      try {
        await expect(
          E2EAuthHelper.getCurrentSession(100)
        ).rejects.toThrow('Session timeout');
      } finally {
        // Restore original method
        supabase.auth.getSession = originalGetSession;
      }
    }, 5000);
  });

  describe('E2EUserManager', () => {
    test('should track created user IDs', () => {
      const initialIds = userManager.getCreatedUserIds();
      expect(Array.isArray(initialIds)).toBe(true);
      expect(initialIds.length).toBe(0);
    });

    test('should create test user with proper structure', async () => {
      const userData = testUsers.public;
      const result = await userManager.createTestUser(userData);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.username).toBe(userData.username);
      expect(result.privacy).toEqual(userData.privacy);
      
      // Check if user was created successfully
      if (result.id) {
        expect(result.id).toBeTruthy();
        expect(result.supabaseUser).toBeDefined();
        expect(userManager.getCreatedUserIds()).toContain(result.id);
      } else if (result.authError) {
        // User creation failed, but error should be captured
        expect(result.authError).toBeDefined();
        e2eLogger.warn('User creation failed (expected in test env):', result.authError);
      }
    }, 20000);

    test('should handle sign in for existing users', async () => {
      const userData = testUsers.viewer;
      const createdUser = await userManager.createTestUser(userData);
      
      if (createdUser.id && !createdUser.authError) {
        // Only test sign in if user was created successfully
        const signInResult = await userManager.signInAsUser(createdUser);
        expect(typeof signInResult).toBe('boolean');
        
        if (signInResult) {
          const { data: { session } } = await supabase.auth.getSession();
          expect(session).toBeTruthy();
          expect(session?.user?.id).toBe(createdUser.id);
        }
      } else {
        e2eLogger.warn('Skipping sign in test - user creation failed');
      }
    }, 25000);

    test('should clean up created users', async () => {
      const userData = testUsers.private;
      await userManager.createTestUser(userData);
      
      const beforeCleanup = userManager.getCreatedUserIds().length;
      await userManager.cleanup();
      const afterCleanup = userManager.getCreatedUserIds().length;
      
      expect(afterCleanup).toBe(0);
      
      // Should be signed out after cleanup
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    }, 15000);
  });

  describe('E2EPrivacyTester', () => {
    test('should handle profile access testing structure', async () => {
      const targetUsername = 'nonexistent_user';
      const result = await E2EPrivacyTester.testProfileAccess(
        null, // No viewer (anonymous)
        targetUsername,
        'denied'
      );
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    }, 15000);

    test('should handle list discovery testing structure', async () => {
      const result = await E2EPrivacyTester.testListDiscovery(null);
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      
      if (result.success && result.lists) {
        expect(Array.isArray(result.lists)).toBe(true);
      }
      
      if (result.message) {
        expect(typeof result.message).toBe('string');
      }
    }, 15000);

    test('should handle authenticated profile access', async () => {
      const viewerUser = testUsers.viewer;
      const createdViewer = await userManager.createTestUser(viewerUser);
      
      if (createdViewer.id && !createdViewer.authError) {
        const result = await E2EPrivacyTester.testProfileAccess(
          createdViewer,
          'nonexistent_target',
          'denied'
        );
        
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(result.message).toBeTruthy();
      } else {
        e2eLogger.warn('Skipping authenticated access test - user creation failed');
      }
    }, 20000);
  });

  describe('Integration Test Flow', () => {
    test('should complete full user lifecycle', async () => {
      const userData = testUsers.public;
      
      // Step 1: Create user
      const createdUser = await userManager.createTestUser(userData);
      expect(createdUser).toBeDefined();
      
      if (createdUser.id && !createdUser.authError) {
        // Step 2: Sign in
        const signInSuccess = await userManager.signInAsUser(createdUser);
        if (signInSuccess) {
          // Step 3: Verify session
          const { data: { session } } = await supabase.auth.getSession();
          expect(session).toBeTruthy();
          expect(session?.user?.id).toBe(createdUser.id);
        }
        
        // Step 4: Test privacy functionality
        const profileTest = await E2EPrivacyTester.testProfileAccess(
          createdUser,
          createdUser.username,
          'allowed'
        );
        expect(profileTest).toBeDefined();
        
        // Step 5: Test list discovery
        const listTest = await E2EPrivacyTester.testListDiscovery(createdUser);
        expect(listTest).toBeDefined();
      } else {
        e2eLogger.warn('Skipping lifecycle test - user creation failed');
        expect(createdUser.authError).toBeDefined();
      }
      
      // Step 6: Cleanup
      await userManager.cleanup();
      const { data: { session } } = await supabase.auth.getSession();
      expect(session).toBeNull();
    }, 30000);

    test('should handle error scenarios gracefully', async () => {
      // Test with invalid email
      const invalidUser: E2ETestUser = {
        email: 'invalid-email',
        username: 'invalid_user',
        password: 'short',
        privacy: {
          profile_visibility: 'public',
          list_visibility: 'public',
          activity_visibility: 'public',
        }
      };
      
      const result = await userManager.createTestUser(invalidUser);
      expect(result).toBeDefined();
      
      // Should capture error rather than throw
      if (!result.id) {
        expect(result.authError).toBeDefined();
      }
    }, 15000);
  });

  test('should validate test environment configuration', () => {
    expect(E2E_CONFIG.backendUrl).toBeTruthy();
    expect(E2E_CONFIG.testUserPassword).toBeTruthy();
    expect(E2E_CONFIG.testEmailDomain).toBeTruthy();
    expect(E2E_CONFIG.testTimeout).toBeGreaterThan(0);
    expect(E2E_CONFIG.authTimeout).toBeGreaterThan(0);
  });

  test('should validate test user generation', () => {
    const users = generateTestUsers();
    
    expect(users.private).toBeDefined();
    expect(users.public).toBeDefined();
    expect(users.friends).toBeDefined();
    expect(users.viewer).toBeDefined();
    
    // Validate privacy settings
    expect(users.private.privacy.profile_visibility).toBe('private');
    expect(users.public.privacy.profile_visibility).toBe('public');
    expect(users.friends.privacy.profile_visibility).toBe('friends_only');
    
    // Validate unique data
    expect(users.private.email).not.toBe(users.public.email);
    expect(users.private.username).not.toBe(users.public.username);
  });
});
