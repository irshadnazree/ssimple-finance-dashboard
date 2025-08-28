import CryptoJS from "crypto-js";
import type {
	AuthAttempt,
	AuthConfig,
	AuthErrorCode,
	AuthEvent,
	AuthMethod,
	AuthResult,
	AuthSession,
	AuthState,
	AuthStatus,
	BiometricCredentials,
	PinCredentials,
} from "../../types/auth";
import {
	AUTH_ERROR_CODES,
	AUTH_STORAGE_KEYS,
	DEFAULT_AUTH_CONFIG,
} from "../../types/auth";
import { CryptoUtils } from "../encryption/crypto";
import { SessionManager } from "./sessionManager";

/**
 * Core authentication service that manages authentication state,
 * sessions, and coordinates between different auth methods
 */
export class AuthService {
	private static instance: AuthService;
	private authState: AuthState;
	private sessionCheckInterval: NodeJS.Timeout | null = null;
	private eventListeners: Map<string, ((event: AuthEvent) => void)[]> =
		new Map();
	private sessionManager: SessionManager;

	private constructor() {
		this.authState = this.loadAuthState();
		this.sessionManager = SessionManager.getInstance();
		this.setupSessionManager();
		this.startSessionMonitoring();
	}

	public static getInstance(): AuthService {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService();
		}
		return AuthService.instance;
	}

	/**
	 * Setup session manager integration
	 */
	private setupSessionManager(): void {
		// Listen for session events
		this.sessionManager.addEventListener((event) => {
			switch (event.type) {
				case "session_expired":
				case "session_inactive":
					this.handleSessionExpired();
					break;
				case "session_warning":
					// Emit auth event for session warning
					this.emitEvent({
						type: "session_expired",
						method: this.authState.method || "none",
						timestamp: Date.now(),
						success: false,
						metadata: { timeRemaining: event.metadata?.timeRemaining },
					});
					break;
			}
		});

		// Update session manager config based on auth config
		const config = this.loadConfig();
		if (config.autoLockEnabled) {
			this.sessionManager.updateConfig({
				idleTimeout: 15, // 15 minutes default
				sessionTimeout: 30, // 30 minutes default
			});
		}
	}

	/**
	 * Initialize authentication system
	 */
	public async initialize(): Promise<void> {
		try {
			// Load existing configuration or create default
			const config = this.loadConfig();
			this.authState.config = { ...DEFAULT_AUTH_CONFIG, ...config };

			// Check if setup is required
			if (!config.requireAuth) {
				this.authState.status = "setup_required";
			} else {
				// Check for valid session
				const session = this.loadSession();
				if (session && this.isSessionValid(session)) {
					this.authState.session = session;
					this.authState.status = "authenticated";
					this.authState.method = session.method;
				} else {
					this.authState.status = "unauthenticated";
					this.clearSession();
				}
			}

			// Check if account is locked
			const lockoutData = this.getLockoutData();
			if (lockoutData && lockoutData.lockedUntil > Date.now()) {
				this.authState.status = "locked";
				this.authState.lockedUntil = lockoutData.lockedUntil;
			}

			this.saveAuthState();
		} catch (error) {
			console.error("Failed to initialize auth service:", error);
			throw error;
		}
	}

	/**
	 * Get current authentication state
	 */
	public getAuthState(): AuthState {
		return { ...this.authState };
	}

	/**
	 * Check if user is authenticated
	 */
	public isAuthenticated(): boolean {
		return (
			this.authState.status === "authenticated" &&
			this.authState.session !== null &&
			this.isSessionValid(this.authState.session)
		);
	}

	/**
	 * Setup authentication method
	 */
	public async setupAuth(
		method: AuthMethod,
		credentials: { pin?: string; biometricConsent?: boolean },
	): Promise<AuthResult> {
		try {
			if (method === "pin") {
				if (!credentials.pin) {
					return {
						success: false,
						method,
						error: {
							code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
							message: "PIN is required for PIN authentication setup",
						},
					};
				}
				return await this.setupPinAuth(credentials.pin);
			}
			if (method === "biometric") {
				return await this.setupBiometricAuth();
			}

			return {
				success: false,
				method,
				error: {
					code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
					message: "Invalid authentication method",
				},
			};
		} catch (error) {
			return this.handleAuthError(method, error);
		}
	}

	/**
	 * Authenticate user
	 */
	public async authenticate(
		method: AuthMethod,
		credentials?: { pin?: string },
	): Promise<AuthResult> {
		try {
			// Check if account is locked
			if (this.authState.status === "locked") {
				const lockoutData = this.getLockoutData();
				if (lockoutData && lockoutData.lockedUntil > Date.now()) {
					return {
						success: false,
						method,
						error: {
							code: AUTH_ERROR_CODES.ACCOUNT_LOCKED,
							message: "Account is locked due to too many failed attempts",
							lockoutTime: lockoutData.lockedUntil,
						},
					};
				}
				// Lockout expired, reset state
				this.clearLockout();
			}

			let result: AuthResult;

			if (method === "pin") {
				result = await this.authenticatePin(credentials?.pin || "");
			} else if (method === "biometric") {
				result = await this.authenticateBiometric();
			} else {
				result = {
					success: false,
					method,
					error: {
						code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
						message: "Invalid authentication method",
					},
				};
			}

			// Handle authentication result
			if (result.success) {
				this.handleSuccessfulAuth(result);
			} else {
				this.handleFailedAuth(method, result.error?.code);
			}

			return result;
		} catch (error) {
			return this.handleAuthError(method, error);
		}
	}

	/**
	 * Logout user
	 */
	public async logout(): Promise<void> {
		try {
			const currentMethod = this.authState.method;

			// Stop session manager monitoring
			this.sessionManager.destroy();

			// Clear session
			this.clearSession();

			// Update state
			this.authState.status = "unauthenticated";
			this.authState.method = null;
			this.authState.session = null;
			this.authState.lastAuthTime = undefined;

			this.saveAuthState();

			// Emit logout event
			if (currentMethod) {
				this.emitEvent({
					type: "logout",
					method: currentMethod,
					timestamp: Date.now(),
					success: true,
				});
			}
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}

	/**
	 * Update authentication configuration
	 */
	public async updateConfig(newConfig: Partial<AuthConfig>): Promise<void> {
		this.authState.config = { ...this.authState.config, ...newConfig };
		this.saveConfig(this.authState.config);
		this.saveAuthState();
	}

	/**
	 * Get failed attempts count
	 */
	public getFailedAttempts(): number {
		return this.authState.failedAttempts;
	}

	/**
	 * Clear failed attempts
	 */
	public clearFailedAttempts(): void {
		this.authState.failedAttempts = 0;
		this.saveAuthState();
		localStorage.removeItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
	}

	/**
	 * Add event listener
	 */
	public addEventListener(
		event: string,
		callback: (event: AuthEvent) => void,
	): void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.push(callback);
		}
	}

	/**
	 * Remove event listener
	 */
	public removeEventListener(
		event: string,
		callback: (event: AuthEvent) => void,
	): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			const index = listeners.indexOf(callback);
			if (index > -1) {
				listeners.splice(index, 1);
			}
		}
	}

	// Private methods

	private async setupPinAuth(pin: string): Promise<AuthResult> {
		// Placeholder - will be implemented by PinAuthService
		return {
			success: false,
			method: "pin",
			error: {
				code: AUTH_ERROR_CODES.SETUP_REQUIRED,
				message: "PIN authentication service not yet implemented",
			},
		};
	}

	private async setupBiometricAuth(): Promise<AuthResult> {
		// Placeholder - will be implemented by BiometricAuthService
		return {
			success: false,
			method: "biometric",
			error: {
				code: AUTH_ERROR_CODES.SETUP_REQUIRED,
				message: "Biometric authentication service not yet implemented",
			},
		};
	}

	private async authenticatePin(pin: string): Promise<AuthResult> {
		// Placeholder - will be implemented by PinAuthService
		return {
			success: false,
			method: "pin",
			error: {
				code: AUTH_ERROR_CODES.SETUP_REQUIRED,
				message: "PIN authentication service not yet implemented",
			},
		};
	}

	private async authenticateBiometric(): Promise<AuthResult> {
		// Placeholder - will be implemented by BiometricAuthService
		return {
			success: false,
			method: "biometric",
			error: {
				code: AUTH_ERROR_CODES.SETUP_REQUIRED,
				message: "Biometric authentication service not yet implemented",
			},
		};
	}

	private handleSuccessfulAuth(result: AuthResult): void {
		if (result.session) {
			this.authState.session = result.session;
			this.authState.status = "authenticated";
			this.authState.method = result.method;
			this.authState.lastAuthTime = Date.now();
			this.authState.failedAttempts = 0;

			this.saveSession(result.session);
			this.clearFailedAttempts();
			this.clearLockout();
			this.saveAuthState();

			// Start session manager monitoring
			this.sessionManager.initialize(undefined, this);

			this.emitEvent({
				type: "login",
				method: result.method,
				timestamp: Date.now(),
				success: true,
			});
		}
	}

	private handleFailedAuth(method: AuthMethod, errorCode?: string): void {
		this.authState.failedAttempts++;

		const attempt: AuthAttempt = {
			method,
			success: false,
			timestamp: Date.now(),
			errorCode,
			deviceInfo: {
				platform: navigator.platform,
				userAgent: navigator.userAgent,
			},
		};

		this.saveFailedAttempt(attempt);

		// Check if should lock account
		if (
			this.authState.failedAttempts >= this.authState.config.maxFailedAttempts
		) {
			this.lockAccount();
		}

		this.saveAuthState();

		this.emitEvent({
			type: "failed_attempt",
			method,
			timestamp: Date.now(),
			success: false,
			metadata: { errorCode, failedAttempts: this.authState.failedAttempts },
		});
	}

	private handleAuthError(method: AuthMethod, error: unknown): AuthResult {
		console.error("Authentication error:", error);

		const errorMessage =
			error instanceof Error ? error.message : "An unknown error occurred";

		return {
			success: false,
			method,
			error: {
				code: AUTH_ERROR_CODES.UNKNOWN_ERROR,
				message: errorMessage,
			},
		};
	}

	private lockAccount(): void {
		const lockoutTime =
			Date.now() + this.authState.config.lockoutDuration * 60 * 1000;
		this.authState.status = "locked";
		this.authState.lockedUntil = lockoutTime;

		localStorage.setItem(
			AUTH_STORAGE_KEYS.LOCKOUT,
			JSON.stringify({
				lockedUntil: lockoutTime,
				reason: "too_many_attempts",
			}),
		);

		this.emitEvent({
			type: "locked",
			method: this.authState.method || "none",
			timestamp: Date.now(),
			success: false,
			metadata: { lockedUntil: lockoutTime },
		});
	}

	private clearLockout(): void {
		this.authState.lockedUntil = undefined;
		localStorage.removeItem(AUTH_STORAGE_KEYS.LOCKOUT);
	}

	private getLockoutData(): { lockedUntil: number; reason: string } | null {
		const data = localStorage.getItem(AUTH_STORAGE_KEYS.LOCKOUT);
		return data ? JSON.parse(data) : null;
	}

	private createSession(method: AuthMethod): AuthSession {
		const now = Date.now();
		const expiresAt = now + this.authState.config.sessionTimeout * 60 * 1000;

		return {
			id: CryptoJS.lib.WordArray.random(16).toString(),
			userId: "local_user", // For local auth, we use a fixed user ID
			method,
			createdAt: now,
			expiresAt,
			lastActivity: now,
			isActive: true,
		};
	}

	private isSessionValid(session: AuthSession): boolean {
		const now = Date.now();
		return (
			session.isActive &&
			session.expiresAt > now &&
			now - session.lastActivity <
				this.authState.config.sessionTimeout * 60 * 1000
		);
	}

	private updateSessionActivity(session: AuthSession): void {
		session.lastActivity = Date.now();
		this.saveSession(session);
	}

	private startSessionMonitoring(): void {
		// Check session validity every minute
		this.sessionCheckInterval = setInterval(() => {
			if (
				this.authState.session &&
				!this.isSessionValid(this.authState.session)
			) {
				this.handleSessionExpired();
			}
		}, 60000);
	}

	private handleSessionExpired(): void {
		const method = this.authState.method;
		this.logout();

		this.emitEvent({
			type: "session_expired",
			method: method || "none",
			timestamp: Date.now(),
			success: false,
		});
	}

	private emitEvent(event: AuthEvent): void {
		// Save event to storage
		this.saveEvent(event);

		// Notify listeners
		const listeners = this.eventListeners.get(event.type) || [];
		for (const callback of listeners) {
			try {
				callback(event);
			} catch (error) {
				console.error("Error in auth event listener:", error);
			}
		}
	}

	// Storage methods

	private loadAuthState(): AuthState {
		return {
			status: "setup_required",
			method: null,
			session: null,
			config: DEFAULT_AUTH_CONFIG,
			failedAttempts: this.loadFailedAttempts(),
		};
	}

	private saveAuthState(): void {
		// Auth state is derived from other stored data, no need to persist directly
	}

	private loadConfig(): Partial<AuthConfig> {
		const data = localStorage.getItem(AUTH_STORAGE_KEYS.CONFIG);
		return data ? JSON.parse(data) : {};
	}

	private saveConfig(config: AuthConfig): void {
		localStorage.setItem(AUTH_STORAGE_KEYS.CONFIG, JSON.stringify(config));
	}

	private loadSession(): AuthSession | null {
		const data = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION);
		return data ? JSON.parse(data) : null;
	}

	private saveSession(session: AuthSession): void {
		localStorage.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(session));
	}

	private clearSession(): void {
		localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION);
	}

	private loadFailedAttempts(): number {
		const data = localStorage.getItem(AUTH_STORAGE_KEYS.FAILED_ATTEMPTS);
		return data ? Number.parseInt(data, 10) : 0;
	}

	private saveFailedAttempt(attempt: AuthAttempt): void {
		localStorage.setItem(
			AUTH_STORAGE_KEYS.FAILED_ATTEMPTS,
			this.authState.failedAttempts.toString(),
		);

		// Also save detailed attempt data
		const attempts = this.loadAttemptHistory();
		attempts.push(attempt);

		// Keep only last 50 attempts
		if (attempts.length > 50) {
			attempts.splice(0, attempts.length - 50);
		}

		localStorage.setItem("auth_attempt_history", JSON.stringify(attempts));
	}

	private loadAttemptHistory(): AuthAttempt[] {
		const data = localStorage.getItem("auth_attempt_history");
		return data ? JSON.parse(data) : [];
	}

	private saveEvent(event: AuthEvent): void {
		const events = this.loadEventHistory();
		events.push(event);

		// Keep only last 100 events
		if (events.length > 100) {
			events.splice(0, events.length - 100);
		}

		localStorage.setItem(AUTH_STORAGE_KEYS.EVENTS, JSON.stringify(events));
	}

	private loadEventHistory(): AuthEvent[] {
		const data = localStorage.getItem(AUTH_STORAGE_KEYS.EVENTS);
		return data ? JSON.parse(data) : [];
	}

	/**
	 * Cleanup resources
	 */
	public destroy(): void {
		if (this.sessionCheckInterval) {
			clearInterval(this.sessionCheckInterval);
			this.sessionCheckInterval = null;
		}
		this.sessionManager.destroy();
		this.eventListeners.clear();
	}
}

// Export singleton instance
export const authService = AuthService.getInstance();
