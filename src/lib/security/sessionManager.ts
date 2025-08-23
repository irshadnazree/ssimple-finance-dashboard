import { CryptoUtils, SecurityUtils } from '../encryption/crypto';

interface SessionData {
  id: string;
  userId?: string;
  createdAt: Date;
  lastActivity: Date;
  isAuthenticated: boolean;
  attemptCount: number;
  lastAttempt: Date | null;
}

interface RateLimitEntry {
  count: number;
  windowStart: Date;
  blocked: boolean;
  blockUntil: Date | null;
}

export class SessionManager {
  private static instance: SessionManager;
  private sessionKey = 'finance_session';
  private rateLimitKey = 'auth_rate_limit';
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private readonly BLOCK_DURATION = 60 * 60 * 1000; // 1 hour

  private constructor() {
    this.setupSessionCleanup();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  // Create a new session
  createSession(userId?: string): string {
    const sessionId = SecurityUtils.generateSessionToken();
    const sessionData: SessionData = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isAuthenticated: !!userId,
      attemptCount: 0,
      lastAttempt: null,
    };

    this.storeSession(sessionData);
    return sessionId;
  }

  // Get current session
  getCurrentSession(): SessionData | null {
    const encryptedSession = localStorage.getItem(this.sessionKey);
    if (!encryptedSession) return null;

    try {
      const sessionData = CryptoUtils.decryptSensitiveData(JSON.parse(encryptedSession)) as SessionData;
      
      // Check if session is expired
      const now = new Date();
      const lastActivity = new Date(sessionData.lastActivity);
      if (now.getTime() - lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.destroySession();
        return null;
      }

      // Update last activity
      sessionData.lastActivity = now;
      this.storeSession(sessionData);
      
      return sessionData;
    } catch (error) {
      console.error('Failed to decrypt session:', error);
      this.destroySession();
      return null;
    }
  }

  // Update session
  updateSession(updates: Partial<SessionData>): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;

    const updatedSession = { ...session, ...updates, lastActivity: new Date() };
    this.storeSession(updatedSession);
    return true;
  }

  // Destroy session
  destroySession(): void {
    SecurityUtils.secureWipe(this.sessionKey);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const session = this.getCurrentSession();
    return session?.isAuthenticated ?? false;
  }

  // Rate limiting for authentication attempts
  canAttemptAuth(): boolean {
    const rateLimitData = this.getRateLimitData();
    const now = new Date();

    // Check if currently blocked
    if (rateLimitData.blocked && rateLimitData.blockUntil && now < rateLimitData.blockUntil) {
      return false;
    }

    // Reset if window has expired
    if (now.getTime() - rateLimitData.windowStart.getTime() > this.RATE_LIMIT_WINDOW) {
      this.resetRateLimit();
      return true;
    }

    return rateLimitData.count < this.MAX_ATTEMPTS;
  }

  // Record authentication attempt
  recordAuthAttempt(success: boolean): void {
    const session = this.getCurrentSession();
    if (session) {
      session.attemptCount += 1;
      session.lastAttempt = new Date();
      this.storeSession(session);
    }

    if (!success) {
      const rateLimitData = this.getRateLimitData();
      rateLimitData.count += 1;

      // Block if max attempts reached
      if (rateLimitData.count >= this.MAX_ATTEMPTS) {
        rateLimitData.blocked = true;
        rateLimitData.blockUntil = new Date(Date.now() + this.BLOCK_DURATION);
      }

      this.storeRateLimitData(rateLimitData);
    } else {
      // Reset on successful auth
      this.resetRateLimit();
    }
  }

  // Get remaining attempts
  getRemainingAttempts(): number {
    const rateLimitData = this.getRateLimitData();
    return Math.max(0, this.MAX_ATTEMPTS - rateLimitData.count);
  }

  // Get block time remaining
  getBlockTimeRemaining(): number {
    const rateLimitData = this.getRateLimitData();
    if (!rateLimitData.blocked || !rateLimitData.blockUntil) return 0;
    
    const now = new Date();
    return Math.max(0, rateLimitData.blockUntil.getTime() - now.getTime());
  }

  private storeSession(sessionData: SessionData): void {
    const encryptedSession = CryptoUtils.encryptSensitiveData(sessionData);
    localStorage.setItem(this.sessionKey, JSON.stringify(encryptedSession));
  }

  private getRateLimitData(): RateLimitEntry {
    const stored = localStorage.getItem(this.rateLimitKey);
    if (!stored) {
      return {
        count: 0,
        windowStart: new Date(),
        blocked: false,
        blockUntil: null,
      };
    }

    try {
      const data = JSON.parse(stored);
      return {
        ...data,
        windowStart: new Date(data.windowStart),
        blockUntil: data.blockUntil ? new Date(data.blockUntil) : null,
      };
    } catch {
      return {
        count: 0,
        windowStart: new Date(),
        blocked: false,
        blockUntil: null,
      };
    }
  }

  private storeRateLimitData(data: RateLimitEntry): void {
    localStorage.setItem(this.rateLimitKey, JSON.stringify(data));
  }

  private resetRateLimit(): void {
    localStorage.removeItem(this.rateLimitKey);
  }

  private setupSessionCleanup(): void {
    // Clean up expired sessions periodically
    setInterval(() => {
      this.getCurrentSession(); // This will automatically clean up expired sessions
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  // Security check for session integrity
  validateSessionIntegrity(): boolean {
    const session = this.getCurrentSession();
    if (!session) return false;

    // Check for suspicious activity
    const now = new Date();
    const sessionAge = now.getTime() - new Date(session.createdAt).getTime();
    const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxSessionAge) {
      console.warn('Session exceeded maximum age');
      this.destroySession();
      return false;
    }

    // Check if too many failed attempts
    if (session.attemptCount > this.MAX_ATTEMPTS * 2) {
      console.warn('Too many failed attempts detected');
      this.destroySession();
      return false;
    }

    return true;
  }

  // Force logout all sessions (for security incidents)
  forceLogoutAll(): void {
    this.destroySession();
    this.resetRateLimit();
    
    // Clear all related data
    const keysToRemove = [
      'google_drive_tokens',
      'sync_conflicts',
      'last_sync_date',
      'auto_sync_enabled'
    ];
    
    keysToRemove.forEach(key => SecurityUtils.secureWipe(key));
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();