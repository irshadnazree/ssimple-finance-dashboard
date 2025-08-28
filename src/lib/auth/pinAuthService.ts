import CryptoJS from "crypto-js";
import type { AuthResult, AuthSession, PinCredentials } from "../../types/auth";
import { AUTH_ERROR_CODES, AUTH_STORAGE_KEYS } from "../../types/auth";
import { CryptoUtils } from "../encryption/crypto";

/**
 * PIN Authentication Service
 * Provides secure PIN-based authentication with proper hashing and validation
 */
export class PinAuthService {
	private static instance: PinAuthService;
	private static readonly PIN_LENGTH = 6;
	private static readonly HASH_ITERATIONS = 100000; // PBKDF2 iterations for PIN hashing
	private static readonly SALT_LENGTH = 32; // bytes

	private constructor() {}

	public static getInstance(): PinAuthService {
		if (!PinAuthService.instance) {
			PinAuthService.instance = new PinAuthService();
		}
		return PinAuthService.instance;
	}

	/**
	 * Validate PIN format
	 */
	public validatePinFormat(pin: string): { isValid: boolean; error?: string } {
		if (!pin) {
			return { isValid: false, error: "PIN is required" };
		}

		if (pin.length !== PinAuthService.PIN_LENGTH) {
			return {
				isValid: false,
				error: `PIN must be exactly ${PinAuthService.PIN_LENGTH} digits`,
			};
		}

		if (!/^\d+$/.test(pin)) {
			return { isValid: false, error: "PIN must contain only numbers" };
		}

		// Check for weak PINs
		if (this.isWeakPin(pin)) {
			return {
				isValid: false,
				error: "PIN is too weak. Avoid sequential or repeated digits",
			};
		}

		return { isValid: true };
	}

	/**
	 * Setup PIN authentication
	 */
	public async setup(pin: string): Promise<AuthResult> {
		try {
			// Validate PIN format
			const validation = this.validatePinFormat(pin);
			if (!validation.isValid) {
				return {
					success: false,
					method: "pin",
					error: {
						code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
						message: validation.error || "Invalid PIN format",
					},
				};
			}

			// Check if PIN is already set up
			const existingCredentials = await this.getStoredCredentials();
			if (existingCredentials) {
				return {
					success: false,
					method: "pin",
					error: {
						code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
						message: "PIN is already set up. Use authenticate method instead.",
					},
				};
			}

			// Generate credentials
			const credentials = await this.generateCredentials(pin);

			// Store credentials securely
			await this.storeCredentials(credentials);

			return {
				success: true,
				method: "pin",
				session: {
					id: CryptoUtils.generateSecureToken(),
					userId: "default-user",
					method: "pin",
					createdAt: Date.now(),
					expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
					lastActivity: Date.now(),
					isActive: true,
				},
			};
		} catch (error) {
			console.error("PIN setup error:", error);
			return {
				success: false,
				method: "pin",
				error: {
					code: AUTH_ERROR_CODES.UNKNOWN_ERROR,
					message: error instanceof Error ? error.message : "PIN setup failed",
				},
			};
		}
	}

	/**
	 * Authenticate using PIN
	 */
	public async authenticate(pin: string): Promise<AuthResult> {
		try {
			// Validate PIN format
			const validation = this.validatePinFormat(pin);
			if (!validation.isValid) {
				return {
					success: false,
					method: "pin",
					error: {
						code: AUTH_ERROR_CODES.INVALID_PIN,
						message: validation.error || "Invalid PIN format",
					},
				};
			}

			// Get stored credentials
			const storedCredentials = await this.getStoredCredentials();
			if (!storedCredentials) {
				return {
					success: false,
					method: "pin",
					error: {
						code: AUTH_ERROR_CODES.SETUP_REQUIRED,
						message: "PIN authentication is not set up",
					},
				};
			}

			// Verify PIN
			const isValid = await this.verifyPin(pin, storedCredentials);

			if (isValid) {
				// Update last used timestamp
				storedCredentials.lastUsed = Date.now();
				await this.storeCredentials(storedCredentials);

				return {
					success: true,
					method: "pin",
					session: {
						id: CryptoUtils.generateSecureToken(),
						userId: "default-user",
						method: "pin",
						createdAt: Date.now(),
						expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
						lastActivity: Date.now(),
						isActive: true,
					},
				};
			}

			return {
				success: false,
				method: "pin",
				error: {
					code: AUTH_ERROR_CODES.INVALID_PIN,
					message: "Incorrect PIN",
				},
			};
		} catch (error) {
			console.error("PIN authentication error:", error);
			return {
				success: false,
				method: "pin",
				error: {
					code: AUTH_ERROR_CODES.UNKNOWN_ERROR,
					message:
						error instanceof Error
							? error.message
							: "PIN authentication failed",
				},
			};
		}
	}

	/**
	 * Change existing PIN
	 */
	public async changePin(
		currentPin: string,
		newPin: string,
	): Promise<AuthResult> {
		try {
			// Authenticate with current PIN first
			const authResult = await this.authenticate(currentPin);
			if (!authResult.success) {
				return {
					success: false,
					method: "pin",
					error: {
						code: AUTH_ERROR_CODES.INVALID_PIN,
						message: "Current PIN is incorrect",
					},
				};
			}

			// Validate new PIN
			const validation = this.validatePinFormat(newPin);
			if (!validation.isValid) {
				return {
					success: false,
					method: "pin",
					error: {
						code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
						message: validation.error || "Invalid new PIN format",
					},
				};
			}

			// Check if new PIN is different from current PIN
			if (currentPin === newPin) {
				return {
					success: false,
					method: "pin",
					error: {
						code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
						message: "New PIN must be different from current PIN",
					},
				};
			}

			// Generate new credentials
			const newCredentials = await this.generateCredentials(newPin);

			// Store new credentials
			await this.storeCredentials(newCredentials);

			return {
				success: true,
				method: "pin",
				session: authResult.session,
			};
		} catch (error) {
			console.error("PIN change error:", error);
			return {
				success: false,
				method: "pin",
				error: {
					code: AUTH_ERROR_CODES.UNKNOWN_ERROR,
					message: error instanceof Error ? error.message : "PIN change failed",
				},
			};
		}
	}

	/**
	 * Remove PIN authentication
	 */
	public async remove(): Promise<void> {
		localStorage.removeItem(AUTH_STORAGE_KEYS.PIN_CREDENTIALS);
	}

	/**
	 * Check if PIN is set up
	 */
	public async isSetup(): Promise<boolean> {
		const credentials = await this.getStoredCredentials();
		return credentials !== null;
	}

	/**
	 * Generate secure PIN credentials
	 */
	private async generateCredentials(pin: string): Promise<PinCredentials> {
		// Generate a random salt
		const salt = CryptoJS.lib.WordArray.random(
			PinAuthService.SALT_LENGTH,
		).toString(CryptoJS.enc.Hex);

		// Hash the PIN using PBKDF2
		const hash = CryptoJS.PBKDF2(pin, salt, {
			keySize: 256 / 32, // 256 bits
			iterations: PinAuthService.HASH_ITERATIONS,
			hasher: CryptoJS.algo.SHA256,
		}).toString(CryptoJS.enc.Hex);

		return {
			hash,
			salt,
			iterations: PinAuthService.HASH_ITERATIONS,
			createdAt: Date.now(),
			lastUsed: Date.now(),
		};
	}

	/**
	 * Verify PIN against stored credentials
	 */
	private async verifyPin(
		pin: string,
		credentials: PinCredentials,
	): Promise<boolean> {
		try {
			// Hash the provided PIN with the stored salt
			const hash = CryptoJS.PBKDF2(pin, credentials.salt, {
				keySize: 256 / 32, // 256 bits
				iterations: credentials.iterations,
				hasher: CryptoJS.algo.SHA256,
			}).toString(CryptoJS.enc.Hex);

			// Use constant-time comparison to prevent timing attacks
			return this.constantTimeCompare(hash, credentials.hash);
		} catch (error) {
			console.error("PIN verification error:", error);
			return false;
		}
	}

	/**
	 * Store PIN credentials securely
	 */
	private async storeCredentials(credentials: PinCredentials): Promise<void> {
		try {
			// Encrypt credentials before storing
			const encryptedData = CryptoJS.AES.encrypt(
				JSON.stringify(credentials),
				CryptoUtils.generateSecureToken(32),
			).toString();

			localStorage.setItem(AUTH_STORAGE_KEYS.PIN_CREDENTIALS, encryptedData);
		} catch (error) {
			console.error("Error storing PIN credentials:", error);
			throw new Error("Failed to store PIN credentials");
		}
	}

	/**
	 * Get stored PIN credentials
	 */
	private async getStoredCredentials(): Promise<PinCredentials | null> {
		try {
			const stored = localStorage.getItem(AUTH_STORAGE_KEYS.PIN_CREDENTIALS);
			if (!stored) {
				return null;
			}

			// For now, assume credentials are stored as plain JSON
			// In production, these should be properly encrypted
			try {
				return JSON.parse(stored) as PinCredentials;
			} catch {
				// If parsing fails, it might be encrypted, try to decrypt
				// This is a simplified approach - in production, use proper key management
				return null;
			}
		} catch (error) {
			console.error("Error retrieving PIN credentials:", error);
			return null;
		}
	}

	/**
	 * Check if PIN is weak (sequential, repeated, or common patterns)
	 */
	private isWeakPin(pin: string): boolean {
		// Check for repeated digits
		if (/^(.)\1+$/.test(pin)) {
			return true; // All same digits (111111, 222222, etc.)
		}

		// Check for sequential patterns
		const digits = pin.split("").map(Number);
		let isAscending = true;
		let isDescending = true;

		for (let i = 1; i < digits.length; i++) {
			if (digits[i] !== digits[i - 1] + 1) {
				isAscending = false;
			}
			if (digits[i] !== digits[i - 1] - 1) {
				isDescending = false;
			}
		}

		if (isAscending || isDescending) {
			return true; // Sequential patterns (123456, 654321, etc.)
		}

		// Check for common weak PINs
		const weakPins = [
			"000000",
			"111111",
			"222222",
			"333333",
			"444444",
			"555555",
			"666666",
			"777777",
			"888888",
			"999999",
			"123456",
			"654321",
			"000001",
			"111222",
			"121212",
			"123123",
			"234567",
			"345678",
			"456789",
			"567890",
			"987654",
			"876543",
			"765432",
		];

		return weakPins.includes(pin);
	}

	/**
	 * Constant-time string comparison to prevent timing attacks
	 */
	private constantTimeCompare(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}

		return result === 0;
	}
}

export const pinAuthService = PinAuthService.getInstance();
