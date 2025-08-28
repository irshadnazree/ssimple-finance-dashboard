import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';
import { biometricAuthService } from '../../lib/auth/biometricAuthService';
import { pinAuthService } from '../../lib/auth/pinAuthService';
import type { AuthSession, AuthResult } from '../../types/auth';
import { DEFAULT_AUTH_CONFIG } from '../../types/auth';

// Mock auth services
vi.mock('../../lib/auth/biometricAuthService', () => ({
  biometricAuthService: {
    isAvailable: vi.fn(),
    setup: vi.fn(),
    authenticate: vi.fn(),
    getCapabilities: vi.fn(),
  },
}));

vi.mock('../../lib/auth/pinAuthService', () => ({
  pinAuthService: {
    setup: vi.fn(),
    authenticate: vi.fn(),
    verify: vi.fn(),
  },
}));

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

const mockSession: AuthSession = {
  id: 'session1',
  userId: 'user1',
  method: 'pin',
  createdAt: Date.now(),
  expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
  lastActivity: Date.now(),
  isActive: true,
};

const mockSuccessResult: AuthResult = {
  success: true,
  method: 'pin',
  session: mockSession,
};

const mockFailureResult: AuthResult = {
  success: false,
  method: 'pin',
  error: {
    code: 'INVALID_PIN',
    message: 'Invalid PIN provided',
    remainingAttempts: 4,
  },
};

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      authState: {
        status: 'setup_required',
        method: null,
        session: null,
        config: DEFAULT_AUTH_CONFIG,
        failedAttempts: 0,
      },
      sessionManager: null,
      eventListeners: new Map(),
      sessionCheckInterval: null,
    });

    // Reset all mocks
    vi.clearAllMocks();
    
    // Reset localStorage mock
    (window.localStorage.getItem as any).mockReturnValue(null);
    
    // Set up PIN credentials in localStorage for authentication tests
    (window.localStorage.getItem as any).mockImplementation((key: string) => {
      if (key === 'auth_pin_credentials') {
        return JSON.stringify({
          hashedPin: 'hashed_1234',
          salt: 'test_salt',
          iterations: 10000
        });
      }
      return null;
    });
  });

  describe('initialize', () => {
    it('should initialize with default state when no stored data', async () => {
      const store = useAuthStore.getState();
      await store.initialize();

      const authState = store.getAuthState();
      expect(authState.status).toBe('setup_required');
      expect(authState.method).toBeNull();
      expect(authState.session).toBeNull();
      expect(authState.failedAttempts).toBe(0);
    });

    it('should load stored auth state', async () => {
      // Mock localStorage to return stored config and session
      (window.localStorage.getItem as any).mockImplementation((key: string) => {
        if (key === 'auth_config') {
          return JSON.stringify({
            ...DEFAULT_AUTH_CONFIG,
            requireAuth: true,
            pinEnabled: true,
          });
        }
        if (key === 'auth_session') {
          return JSON.stringify(mockSession);
        }
        return null;
      });

      const store = useAuthStore.getState();
      await store.initialize();

      const authState = store.getAuthState();
      expect(authState.status).toBe('authenticated');
      expect(authState.method).toBe('pin');
    });
  });

  describe('setupAuth', () => {
    it('should setup PIN authentication successfully', async () => {
      (pinAuthService.setup as any).mockResolvedValue(mockSuccessResult);

      const store = useAuthStore.getState();
      const result = await store.setupAuth('pin', { pin: '1234' });

      expect(pinAuthService.setup).toHaveBeenCalledWith('1234');
      expect(result.success).toBe(true);
      expect(result.method).toBe('pin');
      
      const authState = store.getAuthState();
      expect(authState.config.pinEnabled).toBe(true);
      expect(authState.config.requireAuth).toBe(true);
    });

    it('should setup biometric authentication successfully', async () => {
      (biometricAuthService.isAvailable as any).mockResolvedValue(true);
      (biometricAuthService.getCapabilities as any).mockResolvedValue({ available: true, enrolled: true });
      (biometricAuthService.setup as any).mockResolvedValue({ success: true, method: 'biometric' });

      const store = useAuthStore.getState();
      const result = await store.setupAuth('biometric', { biometricConsent: true });

      expect(biometricAuthService.getCapabilities).toHaveBeenCalled();
      expect(biometricAuthService.setup).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.method).toBe('biometric');
      
      const authState = store.getAuthState();
      expect(authState.config.biometricEnabled).toBe(true);
      expect(authState.config.requireAuth).toBe(true);
    });

    it('should handle setup failure', async () => {
      (pinAuthService.setup as any).mockResolvedValue(mockFailureResult);

      const store = useAuthStore.getState();
      const result = await store.setupAuth('pin', { pin: 'weak' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PIN');
    });
  });

  describe('authenticate', () => {
    it('should authenticate with PIN successfully', async () => {
      (pinAuthService.authenticate as any).mockResolvedValue(mockSuccessResult);

      const store = useAuthStore.getState();
      const result = await store.authenticate('pin', { pin: '1234' });

      expect(pinAuthService.authenticate).toHaveBeenCalledWith('1234');
      expect(result.success).toBe(true);
      expect(result.method).toBe('pin');
      expect(result.session).toBeDefined();
      
      const authState = store.getAuthState();
      expect(authState.status).toBe('authenticated');
    });

    it('should authenticate with biometric successfully', async () => {
      (biometricAuthService.authenticate as any).mockResolvedValue(mockSuccessResult);

      const store = useAuthStore.getState();
      const result = await store.authenticate('biometric');

      expect(biometricAuthService.authenticate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should handle authentication failure', async () => {
      (pinAuthService.authenticate as any).mockResolvedValue(mockFailureResult);

      const store = useAuthStore.getState();
      const result = await store.authenticate('pin', { pin: 'wrong' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_PIN');
      
      const authState = store.getAuthState();
      expect(authState.failedAttempts).toBe(1);
    });

    it('should return SETUP_REQUIRED when PIN credentials are not set up', async () => {
      const store = useAuthStore.getState();
      // Mock localStorage to return null for PIN credentials
      (window.localStorage.getItem as any).mockReturnValue(null);

      const result = await store.authenticate('pin', { pin: '1234' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SETUP_REQUIRED');
      expect(pinAuthService.authenticate).not.toHaveBeenCalled();
    });

    it('should lock account after max failed attempts', async () => {
      // Set up state with max failed attempts - 1
      useAuthStore.setState({
        authState: {
          ...useAuthStore.getState().authState,
          failedAttempts: 4, // maxFailedAttempts is 5
        },
      });

      (pinAuthService.authenticate as any).mockResolvedValue(mockFailureResult);

      const store = useAuthStore.getState();
      const result = await store.authenticate('pin', { pin: 'wrong' });

      expect(result.success).toBe(false);
      
      const authState = store.getAuthState();
      expect(authState.status).toBe('locked');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Set authenticated state
      useAuthStore.setState({
        authState: {
          ...useAuthStore.getState().authState,
          status: 'authenticated',
          method: 'pin',
          session: mockSession,
        },
      });

      const store = useAuthStore.getState();
      await store.logout();

      const authState = store.getAuthState();
      expect(authState.status).toBe('unauthenticated');
      expect(authState.session).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when authenticated', () => {
      useAuthStore.setState({
        authState: {
          ...useAuthStore.getState().authState,
          status: 'authenticated',
          session: mockSession,
        },
      });

      const store = useAuthStore.getState();
      expect(store.isAuthenticated()).toBe(true);
    });

    it('should return false when not authenticated', () => {
      const store = useAuthStore.getState();
      expect(store.isAuthenticated()).toBe(false);
    });

    it('should return false when locked', () => {
      useAuthStore.setState({
        authState: {
          ...useAuthStore.getState().authState,
          status: 'locked',
        },
      });

      const store = useAuthStore.getState();
      expect(store.isAuthenticated()).toBe(false);
    });
  });

  describe('getFailedAttempts', () => {
    it('should return current failed attempts count', () => {
      useAuthStore.setState({
        authState: {
          ...useAuthStore.getState().authState,
          failedAttempts: 3,
        },
      });

      const store = useAuthStore.getState();
      expect(store.getFailedAttempts()).toBe(3);
    });
  });

  describe('clearFailedAttempts', () => {
    it('should reset failed attempts to zero', () => {
      useAuthStore.setState({
        authState: {
          ...useAuthStore.getState().authState,
          failedAttempts: 5,
        },
      });

      const store = useAuthStore.getState();
      store.clearFailedAttempts();

      expect(store.getFailedAttempts()).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update auth configuration', async () => {
      const newConfig = {
        sessionTimeout: 60,
        maxFailedAttempts: 3,
      };

      const store = useAuthStore.getState();
      await store.updateConfig(newConfig);

      const authState = store.getAuthState();
      expect(authState.config.sessionTimeout).toBe(60);
      expect(authState.config.maxFailedAttempts).toBe(3);
    });
  });

  describe('event listeners', () => {
    it('should add and remove event listeners', () => {
      const callback = vi.fn();
      const store = useAuthStore.getState();

      store.addEventListener('login', callback);
      
      // Verify listener was added
      const listeners = store.eventListeners.get('login');
      expect(listeners).toContain(callback);

      store.removeEventListener('login', callback);
      
      // Verify listener was removed
      const updatedListeners = store.eventListeners.get('login');
      expect(updatedListeners).not.toContain(callback);
    });
  });
});