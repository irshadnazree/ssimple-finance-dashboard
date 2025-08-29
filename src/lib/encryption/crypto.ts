import CryptoJS from "crypto-js";
import type {
	Account,
	Transaction,
	UserPreferences,
} from "../../types/finance";

// Encryption configuration
const ENCRYPTION_CONFIG = {
	algorithm: "AES",
	keySize: 256 / 32, // 256 bits
	ivSize: 128 / 32, // 128 bits
	iterations: 10000, // PBKDF2 iterations
	tagLength: 128 / 32, // 128 bits for authentication tag
};

// Types for encrypted data
export interface EncryptedData {
	data: string;
	iv: string;
	salt: string;
	tag: string;
	timestamp: number;
	version: string;
}

export interface FinancialData {
	transactions: Transaction[];
	accounts: Account[];
	preferences: UserPreferences | null;
}

// Key derivation and management
export namespace KeyManager {
	/**
	 * Derive encryption key from password using PBKDF2
	 */
	export function deriveKey(
		password: string,
		salt: CryptoJS.lib.WordArray,
	): CryptoJS.lib.WordArray {
		return CryptoJS.PBKDF2(password, salt, {
			keySize: ENCRYPTION_CONFIG.keySize,
			iterations: ENCRYPTION_CONFIG.iterations,
			hasher: CryptoJS.algo.SHA256,
		});
	}

	/**
	 * Generate a random salt
	 */
	export function generateSalt(): CryptoJS.lib.WordArray {
		return CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.keySize);
	}

	/**
	 * Generate a random IV
	 */
	export function generateIV(): CryptoJS.lib.WordArray {
		return CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.ivSize);
	}

	/**
	 * Get or generate master password from secure storage
	 */
	export function getMasterPassword(): string {
		// In production, this should be derived from user input or secure key storage
		// For now, we'll use a combination of device-specific data
		const deviceId = localStorage.getItem("device_id") || generateDeviceId();
		const appSecret = "finance-dashboard-2024"; // This should be environment-specific
		return CryptoJS.SHA256(deviceId + appSecret).toString();
	}

	/**
	 * Generate a unique device identifier
	 */
	function generateDeviceId(): string {
		const deviceId = CryptoJS.lib.WordArray.random(32).toString();
		localStorage.setItem("device_id", deviceId);
		return deviceId;
	}
}

// Core encryption utilities
export namespace CryptoUtils {
	/**
	 * Encrypt financial data with AES-256-CBC + HMAC
	 */
	export function encryptFinancialData(data: FinancialData): EncryptedData {
		try {
			// Serialize the data
			const jsonData = JSON.stringify(data);

			// Generate cryptographic components
			const salt = KeyManager.generateSalt();
			const iv = KeyManager.generateIV();
			const password = KeyManager.getMasterPassword();

			// Derive encryption key and HMAC key
			const encryptionKey = KeyManager.deriveKey(password, salt);
			const hmacKey = KeyManager.deriveKey(`${password}hmac`, salt);

			// Encrypt the data using AES-CBC
			const encrypted = CryptoJS.AES.encrypt(jsonData, encryptionKey, {
				iv: iv,
				mode: CryptoJS.mode.CBC,
				padding: CryptoJS.pad.Pkcs7,
			});

			// Create HMAC for authentication
			const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Base64);
			const hmacData =
				ciphertext +
				iv.toString(CryptoJS.enc.Base64) +
				salt.toString(CryptoJS.enc.Base64);
			const tag = CryptoJS.HmacSHA256(hmacData, hmacKey).toString(
				CryptoJS.enc.Base64,
			);

			return {
				data: ciphertext,
				iv: iv.toString(CryptoJS.enc.Base64),
				salt: salt.toString(CryptoJS.enc.Base64),
				tag: tag,
				timestamp: Date.now(),
				version: "1.0.0",
			};
		} catch (error) {
			console.error("Encryption failed:", error);
			throw new Error("Failed to encrypt financial data");
		}
	}

	/**
	 * Decrypt financial data
	 */
	export function decryptFinancialData(
		encryptedData: EncryptedData,
	): FinancialData {
		try {
			// Validate encrypted data structure
			if (
				!encryptedData.data ||
				!encryptedData.iv ||
				!encryptedData.salt ||
				!encryptedData.tag
			) {
				throw new Error("Invalid encrypted data structure");
			}

			// Parse cryptographic components
			const salt = CryptoJS.enc.Base64.parse(encryptedData.salt);
			const iv = CryptoJS.enc.Base64.parse(encryptedData.iv);
			const password = KeyManager.getMasterPassword();

			// Derive decryption key and HMAC key
			const encryptionKey = KeyManager.deriveKey(password, salt);
			const hmacKey = KeyManager.deriveKey(`${password}hmac`, salt);

			// Verify HMAC for authentication
			const hmacData =
				encryptedData.data + encryptedData.iv + encryptedData.salt;
			const expectedTag = CryptoJS.HmacSHA256(hmacData, hmacKey).toString(
				CryptoJS.enc.Base64,
			);

			if (expectedTag !== encryptedData.tag) {
				throw new Error(
					"Authentication failed - data may have been tampered with",
				);
			}

			// Decrypt the data using AES-CBC
			const decrypted = CryptoJS.AES.decrypt(
				encryptedData.data,
				encryptionKey,
				{
					iv: iv,
					mode: CryptoJS.mode.CBC,
					padding: CryptoJS.pad.Pkcs7,
				},
			);

			// Convert to string and parse JSON
			const jsonData = decrypted.toString(CryptoJS.enc.Utf8);

			if (!jsonData) {
				throw new Error(
					"Decryption failed - invalid password or corrupted data",
				);
			}

			return JSON.parse(jsonData) as FinancialData;
		} catch (error) {
			console.error("Decryption failed:", error);
			throw new Error("Failed to decrypt financial data");
		}
	}

	/**
	 * Create a secure hash of data for integrity verification
	 */
	export function createDataHash(data: unknown): string {
		const jsonData = JSON.stringify(data);
		return CryptoJS.SHA256(jsonData).toString(CryptoJS.enc.Hex);
	}

	/**
	 * Verify data integrity using hash comparison
	 */
	export function verifyDataIntegrity(
		data: unknown,
		expectedHash: string,
	): boolean {
		const actualHash = createDataHash(data);
		return actualHash === expectedHash;
	}

	/**
	 * Generate a secure random token
	 */
	export function generateSecureToken(length = 32): string {
		return CryptoJS.lib.WordArray.random(length).toString(CryptoJS.enc.Hex);
	}

	/**
	 * Secure data wipe (overwrite sensitive data in memory)
	 */
	export function secureWipe(sensitiveData: string): void {
		// Note: JavaScript doesn't provide direct memory management,
		// but we can at least clear the reference and suggest garbage collection
		if (typeof sensitiveData === "string") {
			// Create a new string to overwrite (limited effectiveness in JS)
			const _wipedData = "\0".repeat(sensitiveData.length);
			// Force garbage collection hint
			if (typeof global !== "undefined" && global.gc) {
				global.gc();
			}
		}
	}
}

// Security utilities
export namespace SecurityUtils {
	/**
	 * Check if running in secure context (HTTPS or localhost)
	 */
	export function isSecureContext(): boolean {
		return (
			window.isSecureContext ||
			location.protocol === "https:" ||
			location.hostname === "localhost" ||
			location.hostname === "127.0.0.1"
		);
	}

	/**
	 * Validate encryption strength
	 */
	export function validateEncryptionStrength(): boolean {
		// Check if crypto APIs are available
		if (!window.crypto || !window.crypto.getRandomValues) {
			console.warn("Crypto APIs not available - encryption may be weak");
			return false;
		}

		// Check if running in secure context
		if (!isSecureContext()) {
			console.warn(
				"Not running in secure context - encryption may be compromised",
			);
			return false;
		}

		return true;
	}

	/**
	 * Generate cryptographically secure random bytes
	 */
	export function getSecureRandomBytes(length: number): Uint8Array {
		if (!window.crypto || !window.crypto.getRandomValues) {
			throw new Error("Secure random number generation not available");
		}

		const bytes = new Uint8Array(length);
		window.crypto.getRandomValues(bytes);
		return bytes;
	}

	/**
	 * Check for potential security vulnerabilities
	 */
	export function performSecurityCheck(): {
		secure: boolean;
		warnings: string[];
	} {
		const warnings: string[] = [];

		if (!isSecureContext()) {
			warnings.push("Application not running in secure context (HTTPS)");
		}

		if (!window.crypto || !window.crypto.getRandomValues) {
			warnings.push("Crypto APIs not available");
		}

		const deviceId = localStorage.getItem("device_id");
		if (deviceId && deviceId.length < 32) {
			warnings.push("Weak device identifier detected");
		}

		return {
			secure: warnings.length === 0,
			warnings,
		};
	}
}

// Export main encryption interface
export default {
	CryptoUtils,
	KeyManager,
	SecurityUtils,
	ENCRYPTION_CONFIG,
};
