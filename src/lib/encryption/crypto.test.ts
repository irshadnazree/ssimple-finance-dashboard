import type { FinancialData } from "./crypto";
import { CryptoUtils, SecurityUtils } from "./crypto";

// Test data
const testFinancialData: FinancialData = {
	transactions: [
		{
			id: "test-1",
			amount: 100.5,
			status: "completed",
			description: "Test transaction",
			category: "Food",
			date: new Date("2024-01-15"),
			type: "expense",
			account: "Checking",
			tags: ["test"],
			recurring: undefined,
			createdAt: new Date(),
			updatedAt: new Date(),
			note: "Test note",
			currency: "MYR",
			myr: 100.5,
			incomeExpense: "Expense",
			account2: 1,
		},
	],
	accounts: [
		{
			id: "acc-1",
			name: "Test Account",
			type: "checking",
			balance: 1000,
			currency: "MYR",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	],
	preferences: {
		currency: "MYR",
		dateFormat: "DD/MM/YYYY",
		theme: "light",
		defaultAccount: "acc-1",
		syncSettings: {
			autoSync: true,
			syncInterval: 30,
			backupRetention: 30,
		},
	},
};

/**
 * Test encryption and decryption functionality
 */
export function testEncryptionDecryption(): boolean {
	try {
		console.log("Testing encryption/decryption...");

		// Test encryption
		const encrypted = CryptoUtils.encryptFinancialData(testFinancialData);
		console.log("✓ Encryption successful");
		console.log("Encrypted data structure:", {
			hasData: !!encrypted.data,
			hasIV: !!encrypted.iv,
			hasSalt: !!encrypted.salt,
			hasTag: !!encrypted.tag,
			timestamp: encrypted.timestamp,
			version: encrypted.version,
		});

		// Test decryption
		const decrypted = CryptoUtils.decryptFinancialData(encrypted);
		console.log("✓ Decryption successful");

		// Verify data integrity
		const originalHash = CryptoUtils.createDataHash(testFinancialData);
		const decryptedHash = CryptoUtils.createDataHash(decrypted);

		if (originalHash === decryptedHash) {
			console.log("✓ Data integrity verified");
			return true;
		}

		console.error("✗ Data integrity check failed");
		return false;
	} catch (error) {
		console.error("✗ Encryption test failed:", error);
		return false;
	}
}

/**
 * Test security utilities
 */
export function testSecurityUtils(): boolean {
	try {
		console.log("Testing security utilities...");

		// Test secure context check
		const isSecure = SecurityUtils.isSecureContext();
		console.log("Secure context:", isSecure);

		// Test encryption strength validation
		const isStrong = SecurityUtils.validateEncryptionStrength();
		console.log("Encryption strength valid:", isStrong);

		// Test security check
		const securityCheck = SecurityUtils.performSecurityCheck();
		console.log("Security check:", securityCheck);

		// Test secure token generation
		const token = CryptoUtils.generateSecureToken(16);
		console.log("Generated secure token length:", token.length);

		console.log("✓ Security utilities test completed");
		return true;
	} catch (error) {
		console.error("✗ Security utilities test failed:", error);
		return false;
	}
}

/**
 * Run all encryption tests
 */
export function runEncryptionTests(): void {
	console.log("=== Encryption Module Tests ===");

	const encryptionTest = testEncryptionDecryption();
	const securityTest = testSecurityUtils();

	console.log("\n=== Test Results ===");
	console.log("Encryption/Decryption:", encryptionTest ? "✓ PASS" : "✗ FAIL");
	console.log("Security Utilities:", securityTest ? "✓ PASS" : "✗ FAIL");

	if (encryptionTest && securityTest) {
		console.log("\n🎉 All encryption tests passed!");
	} else {
		console.log("\n❌ Some encryption tests failed!");
	}
}

// Export for use in browser console or other modules
if (typeof window !== "undefined") {
	(window as typeof window & { encryptionTests: unknown }).encryptionTests = {
		runEncryptionTests,
		testEncryptionDecryption,
		testSecurityUtils,
	};
}
