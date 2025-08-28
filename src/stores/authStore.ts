import { create } from 'zustand';
import type {
  AuthConfig,
  AuthState,
  AuthResult,
  AuthSession,
  AuthAttempt,
  AuthEvent,
  AuthMethod,
  AuthStatus,
  PinCredentials,
  BiometricCredentials,
  AuthErrorCode,
  AuthSetupData,
  BiometricCapabilities
} from '../types/auth';
import {
  DEFAULT_AUTH_CONFIG,
  AUTH_STORAGE_KEYS,
  AUTH_ERROR_CODES
} from '../types/auth';
import { CryptoUtils } from '../lib/encryption/crypto';
import { SessionManager } from '../lib/auth/sessionManager';
import { biometricAuthService } from '../lib/auth/biometricAuthService';
import { pinAuthService } from '../lib/auth/pinAuthService';

interface AuthStoreState {
  // State
  authState: AuthState;
  sessionManager: SessionManager | null;
  eventListeners: Map<string, ((event: AuthEvent) => void)[]>;
  sessionCheckInterval: NodeJS.Timeout | null;
  
  // Actions
  initialize: () => Promise<void>;
  setupAuth: (method: AuthMethod, credentials: { pin?: string; biometricConsent?: boolean }) => Promise<AuthResult>;
  authenticate: (method: AuthMethod, credentials?: { pin?: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  updateConfig: (newConfig: Partial<AuthConfig>) => Promise<void>;
  
  // Getters
  getAuthState: () => AuthState;
  isAuthenticated: () => boolean;
  getFailedAttempts: () => number;
  
  // Event handling
  addEventListener: (event: string, callback: (event: AuthEvent) => void) => void;
  removeEventListener: (event: string, callback: (event: AuthEvent) => void) => void;
  
  // Utility methods
  clearFailedAttempts: () => void;
  destroy: () => void;
  
  // Helper methods
  loadConfig: () => Partial<AuthConfig>;
  saveConfig: (config: AuthConfig) => void;
  loadSession: () => AuthSession | null;
  saveSession: (session: AuthSession) => void;
  clearSession: () => void;
  isSessionValid: (session: AuthSession) => boolean;
  getLockoutData: () => { lockedUntil: number; reason: string } | null;
  saveAuthState: () => void;
  setupSessionManager: () => void;
  startSessionMonitoring: () => void;
  setupPinAuth: (pin: string) => Promise<AuthResult>;
  setupBiometricAuth: () => Promise<AuthResult>;
  handleAuthError: (method: AuthMethod, error: unknown) => AuthResult;
  clearLockout: () => void;
  authenticatePin: (pin: string) => Promise<AuthResult>;
  authenticateBiometric: () => Promise<AuthResult>;
  handleSuccessfulAuth: (result: AuthResult) => void;
  handleFailedAuth: (method: AuthMethod, errorCode?: string) => void;
  lockAccount: () => void;
  createSession: (method: AuthMethod) => AuthSession;
  updateSessionActivity: (session: AuthSession) => void;
  handleSessionExpired: () => void;
  emitEvent: (event: AuthEvent) => void;
  loadAuthState: () => AuthState;
  loadFailedAttempts: () => number;
  saveFailedAttempt: (attempt: AuthAttempt) => void;
  loadAttemptHistory: () => AuthAttempt[];
  saveEvent: (event: AuthEvent) => void;
  loadEventHistory: () => AuthEvent[];
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  // Initial state
  authState: {
    status: 'setup_required',
    method: null,
    session: null,
    config: DEFAULT_AUTH_CONFIG,
    failedAttempts: 0
  },
  sessionManager: null,
  eventListeners: new Map(),
  sessionCheckInterval: null,
  
  // Initialize authentication system
  initialize: async () => {
    try {
      const state = get();
      
      // Initialize session manager
      const sessionManager = SessionManager.getInstance();
      set({ sessionManager });
      
      // Initialize SessionManager with authService reference
      // We'll pass a reference to the store's methods that SessionManager needs
      const authServiceProxy = {
        isAuthenticated: () => get().isAuthenticated(),
        logout: () => get().logout(),
        addEventListener: (event: string, callback: (event: AuthEvent) => void) => get().addEventListener(event, callback),
         emitEvent: (event: AuthEvent) => get().emitEvent(event)
      };
      sessionManager.initialize(undefined, authServiceProxy);
      
      // Load existing configuration or create default
      const config = get().loadConfig();
      const authState = {
        ...state.authState,
        config: { ...DEFAULT_AUTH_CONFIG, ...config }
      };
      
      // Check if setup is required
      if (!config.requireAuth) {
        authState.status = 'setup_required';
      } else {
        // Check for valid session
        const session = get().loadSession();
        if (session && get().isSessionValid(session)) {
          authState.session = session;
          authState.status = 'authenticated';
          authState.method = session.method;
        } else {
          authState.status = 'unauthenticated';
          get().clearSession();
        }
      }
      
      // Check if account is locked
      const lockoutData = get().getLockoutData();
      if (lockoutData && lockoutData.lockedUntil > Date.now()) {
        authState.status = 'locked';
        authState.lockedUntil = lockoutData.lockedUntil;
      }
      
      set({ authState });
      get().saveAuthState();
      get().setupSessionManager();
      get().startSessionMonitoring();
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw error;
    }
  },
  
  // Setup authentication method
  setupAuth: async (method: AuthMethod, credentials: { pin?: string; biometricConsent?: boolean }) => {
    try {
      if (method === 'pin') {
        if (!credentials.pin) {
          return {
            success: false,
            method,
            error: {
              code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
              message: 'PIN is required for PIN authentication setup'
            }
          };
        }
        return await get().setupPinAuth(credentials.pin);
      }
      if (method === 'biometric') {
        return await get().setupBiometricAuth();
      }
      
      return {
        success: false,
        method,
        error: {
          code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
          message: 'Invalid authentication method'
        }
      };
    } catch (error) {
      return get().handleAuthError(method, error);
    }
  },
  
  // Authenticate user
  authenticate: async (method: AuthMethod, credentials?: { pin?: string }) => {
    try {
      const state = get();
      
      // Check if account is locked
      if (state.authState.status === 'locked') {
        const lockoutData = get().getLockoutData();
        if (lockoutData && lockoutData.lockedUntil > Date.now()) {
          return {
            success: false,
            method,
            error: {
              code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
              message: 'Account is locked due to too many failed attempts',
              lockoutTime: lockoutData.lockedUntil
            }
          };
        }
        // Lockout expired, reset state
        get().clearLockout();
      }
      
      let result: AuthResult;
      
      if (method === 'pin') {
        result = await get().authenticatePin(credentials?.pin || '');
      } else if (method === 'biometric') {
        result = await get().authenticateBiometric();
      } else {
        result = {
          success: false,
          method,
          error: {
            code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            message: 'Invalid authentication method'
          }
        };
      }
      
      // Handle authentication result
      if (result.success) {
        get().handleSuccessfulAuth(result);
      } else {
        get().handleFailedAuth(method, result.error?.code);
      }
      
      return result;
    } catch (error) {
      return get().handleAuthError(method, error);
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      const state = get();
      const currentMethod = state.authState.method;
      
      // Stop session manager monitoring
      state.sessionManager?.destroy();
      
      // Clear session
      get().clearSession();
      
      // Update state
      const authState = {
        ...state.authState,
        status: 'unauthenticated' as AuthStatus,
        method: null,
        session: null,
        lastAuthTime: undefined
      };
      
      set({ authState });
      get().saveAuthState();
      
      // Emit logout event
      if (currentMethod) {
        get().emitEvent({
          type: 'logout',
          method: currentMethod,
          timestamp: Date.now(),
          success: true
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  },
  
  // Update configuration
  updateConfig: async (newConfig: Partial<AuthConfig>) => {
    const state = get();
    const updatedConfig = { ...state.authState.config, ...newConfig };
    set({ authState: { ...state.authState, config: updatedConfig } });
    get().saveConfig(updatedConfig);
  },
  
  // Get current authentication state
  getAuthState: () => {
    return { ...get().authState };
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const state = get();
    return state.authState.status === 'authenticated' && 
           state.authState.session !== null &&
           get().isSessionValid(state.authState.session);
  },
  
  // Get failed attempts count
  getFailedAttempts: () => {
    return get().authState.failedAttempts;
  },
  
  // Add event listener
  addEventListener: (event: string, callback: (event: AuthEvent) => void) => {
    const state = get();
    const listeners = state.eventListeners.get(event) || [];
    listeners.push(callback);
    state.eventListeners.set(event, listeners);
  },
  
  // Remove event listener
  removeEventListener: (event: string, callback: (event: AuthEvent) => void) => {
    const state = get();
    const listeners = state.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      state.eventListeners.set(event, listeners);
    }
  },
  
  // Clear failed attempts
  clearFailedAttempts: () => {
    const state = get();
    set({ authState: { ...state.authState, failedAttempts: 0 } });
    localStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
  },
  
  // Destroy auth store
  destroy: () => {
    const state = get();
    if (state.sessionCheckInterval) {
      clearInterval(state.sessionCheckInterval);
    }
    state.sessionManager?.destroy();
    set({ 
      sessionCheckInterval: null,
      sessionManager: null,
      eventListeners: new Map()
    });
  },
  
  // Private helper methods (exposed for internal use)
  setupSessionManager: () => {
    const state = get();
    if (!state.sessionManager) return;
    
    // Listen for session events
    state.sessionManager.addEventListener((event) => {
      switch (event.type) {
        case 'session_expired':
        case 'session_inactive':
          get().handleSessionExpired();
          break;
        case 'session_warning':
          get().emitEvent({
            type: 'session_expired',
            method: state.authState.method || 'none',
            timestamp: Date.now(),
            success: false,
            metadata: { timeRemaining: event.metadata?.timeRemaining }
          });
          break;
      }
    });
    
    // Update session manager config based on auth config
    const config = state.authState.config;
    if (config.autoLockEnabled) {
      state.sessionManager.updateConfig({
        idleTimeout: 15, // 15 minutes default
        sessionTimeout: 30 // 30 minutes default
      });
    }
  },
  
  setupPinAuth: async (pin: string) => {
    try {
      const result = await pinAuthService.setup(pin);
      if (!result.success) {
        return result;
      }
      
      const state = get();
      const updatedConfig = { ...state.authState.config, pinEnabled: true, requireAuth: true };
      await get().updateConfig(updatedConfig);
      
      return {
        success: true,
        method: 'pin' as AuthMethod
      };
    } catch (error) {
      return get().handleAuthError('pin', error);
    }
  },
  
  setupBiometricAuth: async () => {
    try {
      const capabilities = await biometricAuthService.getCapabilities();
      if (!capabilities.available) {
        return {
          success: false,
          method: 'biometric' as AuthMethod,
          error: {
            code: AUTH_ERROR_CODES.BIOMETRIC_NOT_AVAILABLE,
            message: 'Biometric authentication is not available on this device'
          }
        };
      }
      
      const result = await biometricAuthService.setup();
      if (result.success) {
        const state = get();
        const updatedConfig = { ...state.authState.config, biometricEnabled: true, requireAuth: true };
        await get().updateConfig(updatedConfig);
      }
      
      return result;
    } catch (error) {
      return get().handleAuthError('biometric', error);
    }
  },
  
  authenticatePin: async (pin: string) => {
    try {
      const storedCredentials = localStorage.getItem(AUTH_STORAGE_KEYS.PIN_CREDENTIALS);
      if (!storedCredentials) {
        return {
          success: false,
          method: 'pin' as AuthMethod,
          error: {
            code: AUTH_ERROR_CODES.SETUP_REQUIRED,
            message: 'PIN authentication not set up'
          }
        };
      }
      
      const credentials: PinCredentials = JSON.parse(storedCredentials);
      const result = await pinAuthService.authenticate(pin);
        const isValid = result.success;
      
      if (isValid) {
        const session = get().createSession('pin');
        return {
          success: true,
          method: 'pin' as AuthMethod,
          session
        };
      }
      return {
        success: false,
        method: 'pin' as AuthMethod,
        error: {
          code: AUTH_ERROR_CODES.INVALID_PIN,
          message: 'Invalid PIN'
        }
      };
    } catch (error) {
      return get().handleAuthError('pin', error);
    }
  },
  
  authenticateBiometric: async () => {
    try {
      const result = await biometricAuthService.authenticate();
      if (result.success) {
        const session = get().createSession('biometric');
        return {
          ...result,
          session
        };
      }
      return result;
    } catch (error) {
      return get().handleAuthError('biometric', error);
    }
  },
  
  handleSuccessfulAuth: (result: AuthResult) => {
    const state = get();
    
    // Update auth state
    const authState = {
      ...state.authState,
      status: 'authenticated' as AuthStatus,
      method: result.method,
      session: result.session || null,
      lastAuthTime: Date.now(),
      failedAttempts: 0
    };
    
    set({ authState });
    
    // Save session and state
    if (result.session) {
      get().saveSession(result.session);
    }
    get().saveAuthState();
    get().clearFailedAttempts();
    
    // Emit success event
    get().emitEvent({
      type: 'login',
      method: result.method,
      timestamp: Date.now(),
      success: true
    });
  },
  
  handleFailedAuth: (method: AuthMethod, errorCode?: string) => {
    const state = get();
    const failedAttempts = state.authState.failedAttempts + 1;
    
    // Save failed attempt
    const attempt: AuthAttempt = {
      method,
      success: false,
      timestamp: Date.now(),
      errorCode,
      deviceInfo: {
        platform: navigator.platform,
        userAgent: navigator.userAgent
      }
    };
    get().saveFailedAttempt(attempt);
    
    // Update failed attempts count
    const authState = { ...state.authState, failedAttempts };
    set({ authState });
    
    // Check if account should be locked
    if (failedAttempts >= state.authState.config.maxFailedAttempts) {
      get().lockAccount();
    }
    
    // Emit failed attempt event
    get().emitEvent({
      type: 'failed_attempt',
      method,
      timestamp: Date.now(),
      success: false,
      metadata: { failedAttempts, errorCode }
    });
  },
  
  handleAuthError: (method: AuthMethod, error: unknown) => {
    console.error('Authentication error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
    
    return {
      success: false,
      method,
      error: {
        code: AUTH_ERROR_CODES.UNKNOWN_ERROR,
        message: errorMessage
      }
    };
  },
  
  lockAccount: () => {
    const state = get();
    const lockedUntil = Date.now() + (state.authState.config.lockoutDuration * 60 * 1000);
    
    const authState = {
      ...state.authState,
      status: 'locked' as AuthStatus,
      lockedUntil
    };
    
    set({ authState });
    
    // Save lockout data
    localStorage.setItem(AUTH_STORAGE_KEYS.LOCKOUT, JSON.stringify({
      lockedUntil,
      reason: 'Too many failed attempts'
    }));
    
    get().saveAuthState();
    
    // Emit locked event
    get().emitEvent({
      type: 'locked',
      method: state.authState.method || 'none',
      timestamp: Date.now(),
      success: false,
      metadata: { lockedUntil }
    });
  },
  
  clearLockout: () => {
    const state = get();
    const authState = {
      ...state.authState,
      status: 'unauthenticated' as AuthStatus,
      lockedUntil: undefined
    };
    
    set({ authState });
    localStorage.removeItem(AUTH_STORAGE_KEYS.LOCKOUT);
    get().saveAuthState();
  },
  
  getLockoutData: () => {
    const lockoutData = localStorage.getItem(AUTH_STORAGE_KEYS.LOCKOUT);
    return lockoutData ? JSON.parse(lockoutData) : null;
  },
  
  createSession: (method: AuthMethod) => {
    const now = Date.now();
    const state = get();
    const session: AuthSession = {
      id: crypto.randomUUID(),
      userId: 'default', // In a real app, this would be the actual user ID
      method,
      createdAt: now,
      expiresAt: now + (state.authState.config.sessionTimeout * 60 * 1000),
      lastActivity: now,
      isActive: true
    };
    
    return session;
  },
  
  isSessionValid: (session: AuthSession) => {
    const now = Date.now();
    return session.isActive && 
           session.expiresAt > now && 
           (now - session.lastActivity) < (30 * 60 * 1000); // 30 minutes activity timeout
  },
  
  updateSessionActivity: (session: AuthSession) => {
    session.lastActivity = Date.now();
    get().saveSession(session);
  },
  
  startSessionMonitoring: () => {
    const interval = setInterval(() => {
      const state = get();
      if (state.authState.session && !get().isSessionValid(state.authState.session)) {
        get().handleSessionExpired();
      }
    }, 60000); // Check every minute
    
    set({ sessionCheckInterval: interval });
  },
  
  handleSessionExpired: () => {
    const state = get();
    const currentMethod = state.authState.method;
    
    // Update state
    const authState = {
      ...state.authState,
      status: 'unauthenticated' as AuthStatus,
      session: null
    };
    
    set({ authState });
    get().clearSession();
    get().saveAuthState();
    
    // Emit session expired event
    if (currentMethod) {
      get().emitEvent({
        type: 'session_expired',
        method: currentMethod,
        timestamp: Date.now(),
        success: false
      });
    }
  },
  
  emitEvent: (event: AuthEvent) => {
    const state = get();
    
    // Save event to history
    get().saveEvent(event);
    
    // Notify listeners
    const listeners = state.eventListeners.get(event.type) || [];
    const allListeners = state.eventListeners.get('*') || [];
    
    for (const callback of [...listeners, ...allListeners]) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in auth event listener:', error);
      }
    }
  },
  
  // Storage methods
  loadAuthState: () => {
    try {
      const stored = localStorage.getItem('auth_state');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
    }
    return {
      status: 'setup_required' as AuthStatus,
      method: null,
      session: null,
      config: DEFAULT_AUTH_CONFIG,
      failedAttempts: 0
    };
  },
  
  saveAuthState: () => {
    try {
      const state = get();
      localStorage.setItem('auth_state', JSON.stringify(state.authState));
    } catch (error) {
      console.error('Failed to save auth state:', error);
    }
  },
  
  loadConfig: () => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.CONFIG);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load auth config:', error);
      return {};
    }
  },
  
  saveConfig: (config: AuthConfig) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save auth config:', error);
    }
  },
  
  loadSession: () => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  },
  
  saveSession: (session: AuthSession) => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },
  
  clearSession: () => {
    localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION);
  },
  
  loadFailedAttempts: () => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
      return stored ? Number.parseInt(stored, 10) : 0;
    } catch (error) {
      console.error('Failed to load failed attempts:', error);
      return 0;
    }
  },
  
  saveFailedAttempt: (attempt: AuthAttempt) => {
    try {
      const attempts = get().loadAttemptHistory();
      attempts.push(attempt);
      
      // Keep only last 50 attempts
      const recentAttempts = attempts.slice(-50);
      localStorage.setItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS, JSON.stringify(recentAttempts));
      
      // Update failed attempts count
      const failedCount = recentAttempts.filter(a => !a.success && 
        Date.now() - a.timestamp < (24 * 60 * 60 * 1000) // Last 24 hours
      ).length;
      
      const state = get();
      set({ authState: { ...state.authState, failedAttempts: failedCount } });
    } catch (error) {
      console.error('Failed to save failed attempt:', error);
    }
  },
  
  loadAttemptHistory: () => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load attempt history:', error);
      return [];
    }
  },
  
  saveEvent: (event: AuthEvent) => {
    try {
      const events = get().loadEventHistory();
      events.push(event);
      
      // Keep only last 100 events
      const recentEvents = events.slice(-100);
      localStorage.setItem(AUTH_STORAGE_KEYS.EVENTS, JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to save auth event:', error);
    }
  },
  
  loadEventHistory: () => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEYS.EVENTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load event history:', error);
      return [];
    }
  }
}));

// Export a singleton-like interface for backward compatibility
export const authStore = {
  getInstance: () => useAuthStore.getState(),
  initialize: () => useAuthStore.getState().initialize(),
  setupAuth: (method: AuthMethod, credentials: { pin?: string; biometricConsent?: boolean }) => 
    useAuthStore.getState().setupAuth(method, credentials),
  authenticate: (method: AuthMethod, credentials?: { pin?: string }) => 
    useAuthStore.getState().authenticate(method, credentials),
  logout: () => useAuthStore.getState().logout(),
  getAuthState: () => useAuthStore.getState().getAuthState(),
  isAuthenticated: () => useAuthStore.getState().isAuthenticated(),
  addEventListener: (event: string, callback: (event: AuthEvent) => void) => 
    useAuthStore.getState().addEventListener(event, callback),
  removeEventListener: (event: string, callback: (event: AuthEvent) => void) => 
    useAuthStore.getState().removeEventListener(event, callback)
};