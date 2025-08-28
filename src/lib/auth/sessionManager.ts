import type {
	AuthConfig,
	AuthEvent,
	AuthMethod,
	AuthResult,
	AuthState,
} from "../../types/auth";

/**
 * Interface for authentication service that can be used with SessionManager
 */
export interface IAuthService {
	initialize(): Promise<void>;
	setupAuth(
		method: AuthMethod,
		credentials: { pin?: string; biometricConsent?: boolean },
	): Promise<AuthResult>;
	authenticate(
		method: AuthMethod,
		credentials?: { pin?: string },
	): Promise<AuthResult>;
	logout(): Promise<void>;
	updateConfig(newConfig: Partial<AuthConfig>): Promise<void>;
	getFailedAttempts(): number;
	isAuthenticated(): boolean;
	getAuthState(): AuthState;
	addEventListener(event: string, callback: (event: AuthEvent) => void): void;
}

/**
 * Session Manager for handling authentication sessions with advanced features
 * - Automatic session timeout
 * - Idle detection and auto-logout
 * - Session activity tracking
 * - Cross-tab session synchronization
 */
export class SessionManager {
	private static instance: SessionManager;
	private sessionCheckInterval: NodeJS.Timeout | null = null;
	private idleCheckInterval: NodeJS.Timeout | null = null;
	private lastActivity: number = Date.now();
	private idleTimeout: number = 5 * 60 * 1000; // 5 minutes default
	private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes default
	private isActive = true;
	private eventListeners = new Set<(event: SessionEvent) => void>();
	private activityEvents = [
		"mousedown",
		"mousemove",
		"keypress",
		"scroll",
		"touchstart",
		"click",
	];
	private authService: IAuthService | null = null;

	private constructor() {
		this.setupActivityListeners();
		this.setupStorageListener();
	}

	public static getInstance(): SessionManager {
		if (!SessionManager.instance) {
			SessionManager.instance = new SessionManager();
		}
		return SessionManager.instance;
	}

	/**
	 * Initialize session management
	 */
	public initialize(
		config?: Partial<SessionConfig>,
		authServiceInstance?: IAuthService,
	): void {
		if (authServiceInstance) {
			this.authService = authServiceInstance;
		}

		if (config) {
			if (config.idleTimeout !== undefined) {
				this.idleTimeout = config.idleTimeout * 60 * 1000;
			}
			if (config.sessionTimeout !== undefined) {
				this.sessionTimeout = config.sessionTimeout * 60 * 1000;
			}
		}

		this.startSessionMonitoring();
		this.startIdleDetection();

		// Listen to auth events if authService is available
		if (this.authService) {
			this.authService.addEventListener("login", this.handleLogin.bind(this));
			this.authService.addEventListener("logout", this.handleLogout.bind(this));
		}
	}

	/**
	 * Start session monitoring
	 */
	private startSessionMonitoring(): void {
		// Check session validity every minute
		this.sessionCheckInterval = setInterval(() => {
			this.checkSessionValidity();
		}, 60000);
	}

	/**
	 * Start idle detection
	 */
	private startIdleDetection(): void {
		// Check for idle state every 30 seconds
		this.idleCheckInterval = setInterval(() => {
			this.checkIdleState();
		}, 30000);
	}

	/**
	 * Setup activity listeners
	 */
	private setupActivityListeners(): void {
		for (const event of this.activityEvents) {
			document.addEventListener(
				event,
				this.handleUserActivity.bind(this),
				true,
			);
		}

		// Listen for visibility changes
		document.addEventListener(
			"visibilitychange",
			this.handleVisibilityChange.bind(this),
		);

		// Listen for focus/blur events
		window.addEventListener("focus", this.handleWindowFocus.bind(this));
		window.addEventListener("blur", this.handleWindowBlur.bind(this));
	}

	/**
	 * Setup storage listener for cross-tab synchronization
	 */
	private setupStorageListener(): void {
		window.addEventListener("storage", (event) => {
			if (event.key === "auth_session_sync") {
				const data = event.newValue ? JSON.parse(event.newValue) : null;
				if (data?.action === "logout") {
					this.handleCrossTabLogout();
				}
			}
		});
	}

	/**
	 * Handle user activity
	 */
	private handleUserActivity(): void {
		this.lastActivity = Date.now();

		// Update session activity if authenticated
		if (this.authService) {
			const authState = this.authService.getAuthState();
			if (authState.session && authState.status === "authenticated") {
				this.updateSessionActivity();
			}
		}
	}

	/**
	 * Handle visibility change
	 */
	private handleVisibilityChange(): void {
		if (document.hidden) {
			this.isActive = false;
			this.emitEvent({
				type: "session_inactive",
				timestamp: Date.now(),
				metadata: { reason: "tab_hidden" },
			});
		} else {
			this.isActive = true;
			this.handleUserActivity();
			this.emitEvent({
				type: "session_active",
				timestamp: Date.now(),
				metadata: { reason: "tab_visible" },
			});
		}
	}

	/**
	 * Handle window focus
	 */
	private handleWindowFocus(): void {
		this.isActive = true;
		this.handleUserActivity();
		this.checkSessionValidity();
	}

	/**
	 * Handle window blur
	 */
	private handleWindowBlur(): void {
		this.isActive = false;
	}

	/**
	 * Check session validity
	 */
	private checkSessionValidity(): void {
		if (!this.authService) return;

		const authState = this.authService.getAuthState();

		if (!authState.session || authState.status !== "authenticated") {
			return;
		}

		const now = Date.now();
		const session = authState.session;

		// Check if session has expired
		if (session.expiresAt <= now) {
			this.handleSessionExpired("timeout");
			return;
		}

		// Check if session has been inactive too long
		const timeSinceActivity = now - session.lastActivity;
		if (timeSinceActivity >= this.sessionTimeout) {
			this.handleSessionExpired("inactivity");
			return;
		}

		// Warn user if session is about to expire (5 minutes before)
		const timeUntilExpiry = session.expiresAt - now;
		if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 4 * 60 * 1000) {
			this.emitEvent({
				type: "session_warning",
				timestamp: now,
				metadata: {
					expiresIn: timeUntilExpiry,
					reason: "approaching_timeout",
				},
			});
		}
	}

	/**
	 * Check idle state
	 */
	private checkIdleState(): void {
		if (!this.authService) return;

		const authState = this.authService.getAuthState();

		if (!authState.session || authState.status !== "authenticated") {
			return;
		}

		const now = Date.now();
		const timeSinceActivity = now - this.lastActivity;

		if (timeSinceActivity >= this.idleTimeout) {
			this.handleIdleTimeout();
		}
	}

	/**
	 * Handle session expiration
	 */
	private handleSessionExpired(reason: "timeout" | "inactivity"): void {
		this.emitEvent({
			type: "session_expired",
			timestamp: Date.now(),
			metadata: { reason },
		});

		// Logout user
		if (this.authService) {
			this.authService.logout();
		}

		// Notify other tabs
		this.broadcastLogout(reason);
	}

	/**
	 * Handle idle timeout
	 */
	private handleIdleTimeout(): void {
		this.emitEvent({
			type: "session_idle",
			timestamp: Date.now(),
			metadata: {
				idleDuration: Date.now() - this.lastActivity,
				threshold: this.idleTimeout,
			},
		});

		// Auto-logout on idle
		this.handleSessionExpired("inactivity");
	}

	/**
	 * Handle auth login event
	 */
	private handleLogin(event: AuthEvent): void {
		this.lastActivity = Date.now();
		this.isActive = true;

		this.emitEvent({
			type: "session_started",
			timestamp: event.timestamp,
			metadata: { method: event.method },
		});
	}

	/**
	 * Handle auth logout event
	 */
	private handleLogout(event: AuthEvent): void {
		this.emitEvent({
			type: "session_ended",
			timestamp: event.timestamp,
			metadata: { method: event.method },
		});
	}

	/**
	 * Handle cross-tab logout
	 */
	private handleCrossTabLogout(): void {
		if (this.authService?.isAuthenticated()) {
			this.authService.logout();
			this.emitEvent({
				type: "session_ended",
				timestamp: Date.now(),
				metadata: { reason: "cross_tab_logout" },
			});
		}
	}

	/**
	 * Update session activity
	 */
	private updateSessionActivity(): void {
		if (!this.authService) return;

		const authState = this.authService.getAuthState();
		if (authState.session) {
			authState.session.lastActivity = Date.now();
			// Save updated session
			localStorage.setItem("auth_session", JSON.stringify(authState.session));
		}
	}

	/**
	 * Broadcast logout to other tabs
	 */
	private broadcastLogout(reason: string): void {
		localStorage.setItem(
			"auth_session_sync",
			JSON.stringify({
				action: "logout",
				reason,
				timestamp: Date.now(),
			}),
		);

		// Remove the sync item after a short delay
		setTimeout(() => {
			localStorage.removeItem("auth_session_sync");
		}, 1000);
	}

	/**
	 * Extend current session
	 */
	public extendSession(minutes = 30): boolean {
		if (!this.authService) return false;

		const authState = this.authService.getAuthState();

		if (!authState.session || authState.status !== "authenticated") {
			return false;
		}

		const now = Date.now();
		authState.session.expiresAt = now + minutes * 60 * 1000;
		authState.session.lastActivity = now;

		// Save updated session
		localStorage.setItem("auth_session", JSON.stringify(authState.session));

		this.emitEvent({
			type: "session_extended",
			timestamp: now,
			metadata: { extensionMinutes: minutes },
		});

		return true;
	}

	/**
	 * Get session info
	 */
	public getSessionInfo(): SessionInfo | null {
		if (!this.authService) return null;

		const authState = this.authService.getAuthState();

		if (!authState.session || authState.status !== "authenticated") {
			return null;
		}

		const now = Date.now();
		const session = authState.session;

		return {
			id: session.id,
			createdAt: session.createdAt,
			expiresAt: session.expiresAt,
			lastActivity: session.lastActivity,
			timeRemaining: Math.max(0, session.expiresAt - now),
			timeSinceActivity: now - session.lastActivity,
			isIdle: now - this.lastActivity >= this.idleTimeout,
			isActive: this.isActive,
		};
	}

	/**
	 * Add event listener
	 */
	public addEventListener(callback: (event: SessionEvent) => void): void {
		this.eventListeners.add(callback);
	}

	/**
	 * Remove event listener
	 */
	public removeEventListener(callback: (event: SessionEvent) => void): void {
		this.eventListeners.delete(callback);
	}

	/**
	 * Emit session event
	 */
	private emitEvent(event: SessionEvent): void {
		for (const callback of this.eventListeners) {
			try {
				callback(event);
			} catch (error) {
				console.error("Error in session event listener:", error);
			}
		}
	}

	/**
	 * Update configuration
	 */
	public updateConfig(config: Partial<SessionConfig>): void {
		if (config.idleTimeout !== undefined) {
			this.idleTimeout = config.idleTimeout * 60 * 1000;
		}
		if (config.sessionTimeout !== undefined) {
			this.sessionTimeout = config.sessionTimeout * 60 * 1000;
		}
	}

	/**
	 * Cleanup resources
	 */
	public destroy(): void {
		// Clear intervals
		if (this.sessionCheckInterval) {
			clearInterval(this.sessionCheckInterval);
			this.sessionCheckInterval = null;
		}
		if (this.idleCheckInterval) {
			clearInterval(this.idleCheckInterval);
			this.idleCheckInterval = null;
		}

		// Remove event listeners
		for (const event of this.activityEvents) {
			document.removeEventListener(
				event,
				this.handleUserActivity.bind(this),
				true,
			);
		}

		document.removeEventListener(
			"visibilitychange",
			this.handleVisibilityChange.bind(this),
		);
		window.removeEventListener("focus", this.handleWindowFocus.bind(this));
		window.removeEventListener("blur", this.handleWindowBlur.bind(this));

		this.eventListeners.clear();
	}
}

// Types
export interface SessionConfig {
	idleTimeout: number; // minutes
	sessionTimeout: number; // minutes
}

export interface SessionInfo {
	id: string;
	createdAt: number;
	expiresAt: number;
	lastActivity: number;
	timeRemaining: number;
	timeSinceActivity: number;
	isIdle: boolean;
	isActive: boolean;
}

export interface SessionEvent {
	type:
		| "session_started"
		| "session_ended"
		| "session_expired"
		| "session_extended"
		| "session_warning"
		| "session_idle"
		| "session_active"
		| "session_inactive";
	timestamp: number;
	metadata?: Record<string, unknown>;
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
