export type AuthMethod = 'pin' | 'biometric' | 'none';

export type BiometricType = 'fingerprint' | 'face' | 'voice' | 'unknown';

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'locked' | 'setup_required';

export interface AuthConfig {
  method: AuthMethod;
  requireAuth: boolean;
  sessionTimeout: number; // minutes
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockEnabled: boolean;
  lastAuthTime?: number;
}

export interface PinCredentials {
  hash: string;
  salt: string;
  iterations: number;
  createdAt: number;
  lastUsed?: number;
}

export interface BiometricCredentials {
  publicKey: string;
  keyId: string;
  createdAt: number;
  lastUsed?: number;
  deviceInfo: {
    platform: string;
    userAgent: string;
    biometricType: BiometricType;
  };
}

export interface AuthSession {
  id: string;
  userId: string;
  method: AuthMethod;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  isActive: boolean;
}

export interface AuthAttempt {
  method: AuthMethod;
  success: boolean;
  timestamp: number;
  errorCode?: string;
  deviceInfo?: {
    platform: string;
    userAgent: string;
  };
}

export interface AuthState {
  status: AuthStatus;
  method: AuthMethod | null;
  session: AuthSession | null;
  config: AuthConfig;
  failedAttempts: number;
  lockedUntil?: number;
  lastAuthTime?: number;
}

export interface AuthResult {
  success: boolean;
  method: AuthMethod;
  session?: AuthSession;
  error?: {
    code: string;
    message: string;
    remainingAttempts?: number;
    lockoutTime?: number;
  };
}

export interface BiometricCapabilities {
  available: boolean;
  enrolled: boolean;
  supportedTypes: BiometricType[];
  platform: 'mac' | 'windows' | 'linux' | 'unknown';
  error?: string;
}

export interface AuthSetupData {
  method: AuthMethod;
  pin?: string;
  confirmPin?: string;
  biometricConsent?: boolean;
}

export interface AuthValidationError {
  field: string;
  message: string;
  code: string;
}

// Events
export interface AuthEvent {
  type: 'login' | 'logout' | 'setup' | 'failed_attempt' | 'locked' | 'unlocked' | 'session_expired';
  method: AuthMethod;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

// Storage keys
export const AUTH_STORAGE_KEYS = {
  CONFIG: 'auth_config',
  PIN_CREDENTIALS: 'auth_pin_credentials',
  BIOMETRIC_CREDENTIALS: 'auth_biometric_credentials',
  SESSION: 'auth_session',
  FAILED_ATTEMPTS: 'auth_failed_attempts',
  LOCKOUT: 'auth_lockout',
  EVENTS: 'auth_events'
} as const;

// Default configuration
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  method: 'none',
  requireAuth: false,
  sessionTimeout: 30, // 30 minutes
  maxFailedAttempts: 5,
  lockoutDuration: 15, // 15 minutes
  biometricEnabled: false,
  pinEnabled: false,
  autoLockEnabled: true
};

// Error codes
export const AUTH_ERROR_CODES = {
  INVALID_PIN: 'INVALID_PIN',
  BIOMETRIC_FAILED: 'BIOMETRIC_FAILED',
  BIOMETRIC_NOT_AVAILABLE: 'BIOMETRIC_NOT_AVAILABLE',
  BIOMETRIC_NOT_ENROLLED: 'BIOMETRIC_NOT_ENROLLED',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SETUP_REQUIRED: 'SETUP_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type AuthErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES];