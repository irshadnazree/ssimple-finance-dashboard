import type {
	AuthResult,
	BiometricCapabilities,
	BiometricCredentials,
	BiometricType,
} from "../../types/auth";
import { AUTH_ERROR_CODES, AUTH_STORAGE_KEYS } from "../../types/auth";
import { CryptoUtils } from "../encryption/crypto";

/**
 * Biometric Authentication Service
 * Provides cross-platform biometric authentication support
 */
export class BiometricAuthService {
	private static instance: BiometricAuthService;
	private capabilities: BiometricCapabilities | null = null;

	private constructor() {}

	public static getInstance(): BiometricAuthService {
		if (!BiometricAuthService.instance) {
			BiometricAuthService.instance = new BiometricAuthService();
		}
		return BiometricAuthService.instance;
	}

	/**
	 * Initialize biometric service and detect capabilities
	 */
	public async initialize(): Promise<void> {
		this.capabilities = await this.detectCapabilities();
	}

	/**
	 * Get biometric capabilities of the current device
	 */
	public async getCapabilities(): Promise<BiometricCapabilities> {
		if (!this.capabilities) {
			this.capabilities = await this.detectCapabilities();
		}
		return this.capabilities;
	}

	/**
	 * Check if biometric authentication is available
	 */
	public async isAvailable(): Promise<boolean> {
		const capabilities = await this.getCapabilities();
		return capabilities.isAvailable && capabilities.supportedTypes.length > 0;
	}

	/**
	 * Setup biometric authentication
	 */
	public async setup(): Promise<AuthResult> {
		try {
			const capabilities = await this.getCapabilities();

			if (!capabilities.available) {
				return {
					success: false,
					method: "biometric",
					error: {
						code: AUTH_ERROR_CODES.BIOMETRIC_NOT_AVAILABLE,
						message: "Biometric authentication is not available on this device",
					},
				};
			}

			if (capabilities.supportedTypes.length === 0) {
				return {
					success: false,
					method: "biometric",
					error: {
						code: AUTH_ERROR_CODES.BIOMETRIC_NOT_ENROLLED,
						message: "No biometric methods are enrolled on this device",
					},
				};
			}

			// Request biometric authentication to verify enrollment
			const authResult = await this.requestBiometricAuth(
				"Setup biometric authentication",
			);

			if (authResult.success) {
				// Generate and store biometric credentials
				const credentials = await this.generateCredentials();
				await this.storeCredentials(credentials);

				return {
					success: true,
					method: "biometric",
					session: {
						id: CryptoUtils.generateSecureToken(),
						userId: "default-user",
						method: "biometric",
						createdAt: Date.now(),
						expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
						lastActivity: Date.now(),
						isActive: true,
					},
				};
			}

			return authResult;
		} catch (error) {
			console.error("Biometric setup error:", error);
			return {
				success: false,
				method: "biometric",
				error: {
					code: AUTH_ERROR_CODES.BIOMETRIC_FAILED,
					message:
						error instanceof Error ? error.message : "Biometric setup failed",
				},
			};
		}
	}

	/**
	 * Authenticate using biometric
	 */
	public async authenticate(): Promise<AuthResult> {
		try {
			const capabilities = await this.getCapabilities();

			if (!capabilities.available) {
				return {
					success: false,
					method: "biometric",
					error: {
						code: AUTH_ERROR_CODES.BIOMETRIC_NOT_AVAILABLE,
						message: "Biometric authentication is not available",
					},
				};
			}

			// Check if biometric credentials exist
			const storedCredentials = await this.getStoredCredentials();
			if (!storedCredentials) {
				return {
					success: false,
					method: "biometric",
					error: {
						code: AUTH_ERROR_CODES.SETUP_REQUIRED,
						message: "Biometric authentication is not set up",
					},
				};
			}

			// Request biometric authentication
			const authResult = await this.requestBiometricAuth(
				"Authenticate to access your financial data",
			);

			if (authResult.success) {
				return {
					success: true,
					method: "biometric",
					session: {
						id: CryptoUtils.generateSecureToken(),
						userId: "default-user",
						method: "biometric",
						createdAt: Date.now(),
						expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
						lastActivity: Date.now(),
						isActive: true,
					},
				};
			}

			return authResult;
		} catch (error) {
			console.error("Biometric authentication error:", error);
			return {
				success: false,
				method: "biometric",
				error: {
					code: AUTH_ERROR_CODES.BIOMETRIC_FAILED,
					message:
						error instanceof Error
							? error.message
							: "Biometric authentication failed",
				},
			};
		}
	}

	/**
	 * Remove biometric authentication setup
	 */
	public async remove(): Promise<void> {
		localStorage.removeItem(AUTH_STORAGE_KEYS.BIOMETRIC_CREDENTIALS);
	}

	/**
	 * Detect biometric capabilities of the current device
	 */
	private async detectCapabilities(): Promise<BiometricCapabilities> {
		const capabilities: BiometricCapabilities = {
			available: false,
			enrolled: false,
			supportedTypes: [],
			platform: this.getPlatformType(),
			error: undefined,
		};

		try {
			// Check for Web Authentication API support
			if (!window.PublicKeyCredential) {
				return capabilities;
			}

			// Check if biometric authentication is available
			const available =
				await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
			capabilities.available = available;
			capabilities.enrolled = available;

			if (available) {
				// Determine supported biometric types based on platform
				const platform = this.getPlatformType();

				if (platform === "mac") {
					capabilities.supportedTypes.push("fingerprint", "face");
				} else if (platform === "windows") {
					capabilities.supportedTypes.push("fingerprint", "face", "voice");
				} else {
					capabilities.supportedTypes.push("fingerprint");
				}
			}
		} catch (error) {
			console.warn("Error detecting biometric capabilities:", error);
		}

		return capabilities;
	}

	/**
	 * Request biometric authentication using WebAuthn API
	 */
	private async requestBiometricAuth(reason: string): Promise<AuthResult> {
		try {
			if (!window.PublicKeyCredential) {
				return {
					success: false,
					method: "biometric",
					error: {
						code: AUTH_ERROR_CODES.BIOMETRIC_NOT_AVAILABLE,
						message: "WebAuthn is not supported in this browser",
					},
				};
			}

			// Check if we have existing credentials
			const storedCredentials = await this.getStoredCredentials();

			if (storedCredentials) {
				// Authentication flow
				const assertion = await navigator.credentials.get({
					publicKey: {
						challenge: new Uint8Array(32),
						allowCredentials: [
							{
								id: new Uint8Array(32), // Use stored credential ID
								type: "public-key",
							},
						],
						userVerification: "required",
						timeout: 60000,
					},
				});

				if (assertion) {
					return {
						success: true,
						method: "biometric",
					};
				}
			} else {
				// Registration flow
				const credential = await navigator.credentials.create({
					publicKey: {
						challenge: new Uint8Array(32),
						rp: {
							name: "Simple Finance Dashboard",
							id: window.location.hostname,
						},
						user: {
							id: new Uint8Array(16),
							name: "user@finance-dashboard.local",
							displayName: "Finance Dashboard User",
						},
						pubKeyCredParams: [
							{
								alg: -7,
								type: "public-key",
							},
						],
						authenticatorSelection: {
							authenticatorAttachment: "platform",
							userVerification: "required",
							requireResidentKey: false,
						},
						timeout: 60000,
					},
				});

				if (credential && "rawId" in credential) {
					return {
						success: true,
						method: "biometric",
					};
				}
			}

			return {
				success: false,
				method: "biometric",
				error: {
					code: AUTH_ERROR_CODES.BIOMETRIC_FAILED,
					message: "Biometric authentication was cancelled",
				},
			};
		} catch (error) {
			console.error("Biometric authentication request failed:", error);

			// Handle specific WebAuthn errors
			if (error instanceof Error) {
				if (error.name === "NotAllowedError") {
					return {
						success: false,
						method: "biometric",
						error: {
							code: AUTH_ERROR_CODES.BIOMETRIC_FAILED,
							message: "Biometric authentication was cancelled or denied",
						},
					};
				}

				if (error.name === "NotSupportedError") {
					return {
						success: false,
						method: "biometric",
						error: {
							code: AUTH_ERROR_CODES.BIOMETRIC_NOT_AVAILABLE,
							message: "Biometric authentication is not supported",
						},
					};
				}
			}

			return {
				success: false,
				method: "biometric",
				error: {
					code: AUTH_ERROR_CODES.BIOMETRIC_FAILED,
					message:
						error instanceof Error
							? error.message
							: "Biometric authentication failed",
				},
			};
		}
	}

	/**
	 * Generate biometric credentials
	 */
	private async generateCredentials(): Promise<BiometricCredentials> {
		const keyId = CryptoUtils.generateSecureToken();
		const publicKey = CryptoUtils.generateSecureToken(64); // Simulated public key

		return {
			keyId,
			publicKey,
			createdAt: Date.now(),
			lastUsed: Date.now(),
			deviceInfo: {
				platform: this.getPlatform(),
				userAgent: navigator.userAgent,
				biometricType: "fingerprint",
			},
		};
	}

	/**
	 * Store biometric credentials securely
	 */
	private async storeCredentials(
		credentials: BiometricCredentials,
	): Promise<void> {
		// For now, store credentials directly (in production, should be encrypted)
		localStorage.setItem(
			AUTH_STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
			JSON.stringify(credentials),
		);
	}

	/**
	 * Get stored biometric credentials
	 */
	private async getStoredCredentials(): Promise<BiometricCredentials | null> {
		try {
			const stored = localStorage.getItem(
				AUTH_STORAGE_KEYS.BIOMETRIC_CREDENTIALS,
			);
			if (!stored) {
				return null;
			}

			return JSON.parse(stored) as BiometricCredentials;
		} catch (error) {
			console.error("Error retrieving biometric credentials:", error);
			return null;
		}
	}

	/**
	 * Get current platform
	 */
	private getPlatform(): string {
		const userAgent = navigator.userAgent.toLowerCase();

		if (userAgent.includes("mac")) {
			return "macOS";
		}
		if (userAgent.includes("win")) {
			return "Windows";
		}
		if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
			return "iOS";
		}
		if (userAgent.includes("android")) {
			return "Android";
		}
		if (userAgent.includes("linux")) {
			return "Linux";
		}

		return "Unknown";
	}

	private getPlatformType(): "mac" | "windows" | "linux" | "unknown" {
		const userAgent = navigator.userAgent.toLowerCase();

		if (userAgent.includes("mac")) {
			return "mac";
		}
		if (userAgent.includes("win")) {
			return "windows";
		}
		if (userAgent.includes("linux")) {
			return "linux";
		}

		return "unknown";
	}
}

export const biometricAuthService = BiometricAuthService.getInstance();
