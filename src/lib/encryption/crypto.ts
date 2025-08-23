import CryptoJS from 'crypto-js';
import type { EncryptedData } from '../../types/finance';

// Encryption key management
class EncryptionManager {
  private static instance: EncryptionManager;
  private encryptionKey: CryptoJS.lib.WordArray | null = null;

  private constructor() {}

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  // Initialize encryption key from user password or generate one
  async initializeKey(password?: string): Promise<void> {
    if (password) {
      // Derive key from user password using PBKDF2 with SHA-256
      const salt = this.getOrCreateSalt();
      const derived = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 200000,
        hasher: CryptoJS.algo.SHA256,
      });
      this.encryptionKey = derived;
    } else {
      // Generate or load a random key for local storage
      const keyHex = this.getOrCreateLocalKey();
      this.encryptionKey = CryptoJS.enc.Hex.parse(keyHex);
    }
  }

  private getOrCreateSalt(): string {
    let salt = localStorage.getItem('finance_app_salt');
    if (!salt) {
      salt = CryptoJS.lib.WordArray.random(256 / 8).toString();
      localStorage.setItem('finance_app_salt', salt);
    }
    return salt;
  }

  private getOrCreateLocalKey(): string {
    let key = localStorage.getItem('finance_app_key');
    if (!key) {
      key = CryptoJS.lib.WordArray.random(256 / 8).toString();
      localStorage.setItem('finance_app_key', key);
    }
    return key;
  }

  // Derive a MAC key from the encryption key to ensure integrity (encrypt-then-MAC)
  private getMacKey(): CryptoJS.lib.WordArray {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    return CryptoJS.SHA256(this.encryptionKey);
  }

  // Encrypt data
  encrypt<T>(data: T): EncryptedData {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const jsonString = JSON.stringify(data);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);

    const encrypted = CryptoJS.AES.encrypt(jsonString, this.encryptionKey, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const macKey = this.getMacKey();
    const macData = iv.clone().concat(encrypted.ciphertext);
    const mac = CryptoJS.HmacSHA256(macData, macKey).toString();

    return {
      data: encrypted.toString(),
      iv: iv.toString(),
      timestamp: Date.now(),
      mac,
    };
  }

  // Decrypt data
  decrypt<T>(encryptedData: EncryptedData): T {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    try {
      // Verify MAC if present (backward compatible if absent)
      if (encryptedData.mac) {
        const macKey = this.getMacKey();
        const ivWordArray = CryptoJS.enc.Hex.parse(encryptedData.iv);
        // Reconstruct ciphertext WordArray from base64-encoded OpenSSL format
        const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(encryptedData.data) });
        const macData = ivWordArray.clone().concat(cipherParams.ciphertext);
        const computedMac = CryptoJS.HmacSHA256(macData, macKey).toString();
        if (computedMac !== encryptedData.mac) {
          throw new Error('Integrity check failed');
        }
      }

      const decrypted = CryptoJS.AES.decrypt(encryptedData.data, this.encryptionKey, {
        iv: CryptoJS.enc.Hex.parse(encryptedData.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedString);
    } catch (error) {
      throw new Error('Failed to decrypt data. Invalid key or corrupted data.');
    }
  }

  // Check if encryption is initialized
  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  // Clear encryption key (for logout)
  clearKey(): void {
    this.encryptionKey = null;
  }

  // Hash sensitive data for comparison without storing plaintext
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  // Generate secure random ID
  generateSecureId(): string {
    return CryptoJS.lib.WordArray.random(128 / 8).toString();
  }
}

// Export singleton instance
export const encryptionManager = EncryptionManager.getInstance();

// Utility functions for common encryption tasks
export namespace CryptoUtils {
  export async function initializeEncryption(password?: string): Promise<void> {
    await encryptionManager.initializeKey(password);
  }

  export function encryptSensitiveData<T>(data: T): EncryptedData {
    return encryptionManager.encrypt(data);
  }

  export function decryptSensitiveData<T>(encryptedData: EncryptedData): T {
    return encryptionManager.decrypt<T>(encryptedData);
  }

  export function hashPassword(password: string): string {
    return encryptionManager.hash(password);
  }

  export function generateSecureToken(): string {
    return encryptionManager.generateSecureId();
  }

  export function isEncryptionReady(): boolean {
    return encryptionManager.isInitialized();
  }

  export function clearEncryption(): void {
    encryptionManager.clearKey();
  }

  // Encrypt financial data before storing
  export function encryptFinancialData(data: {
    transactions?: unknown[];
    budgets?: unknown[];
    accounts?: unknown[];
    preferences?: unknown;
  }): EncryptedData {
    // Remove sensitive fields and encrypt the rest
    const sanitizedData = {
      transactions: data.transactions,
      budgets: data.budgets,
      accounts: data.accounts,
      preferences: data.preferences,
    };

    return encryptSensitiveData(sanitizedData);
  }

  // Decrypt financial data after retrieval
  export function decryptFinancialData(encryptedData: EncryptedData): {
    transactions?: unknown[];
    budgets?: unknown[];
    accounts?: unknown[];
    preferences?: unknown;
  } {
    return decryptSensitiveData(encryptedData);
  }

  // Validate data integrity
  export function validateDataIntegrity(data: unknown, expectedHash?: string): boolean {
    if (!expectedHash) return true;
    
    const dataHash = encryptionManager.hash(JSON.stringify(data));
    return dataHash === expectedHash;
  }

  // Create data checksum for integrity verification
  export function createDataChecksum(data: unknown): string {
    return encryptionManager.hash(JSON.stringify(data));
  }
}

// Security utilities
export namespace SecurityUtils {
  // Check if running in secure context
  export function isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
  }

  // Generate secure session token
  export function generateSessionToken(): string {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  }

  // Validate password strength
  export function validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[^\w\s]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  }

  // Secure data wipe
  export function secureWipe(key: string): void {
    // Overwrite localStorage entry multiple times before removal
    const randomData = CryptoJS.lib.WordArray.random(1024).toString();
    for (let i = 0; i < 3; i++) {
      localStorage.setItem(key, randomData);
    }
    localStorage.removeItem(key);
  }

  // Check for potential security threats
  export function performSecurityCheck(): {
    isSecure: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (!isSecureContext()) {
      warnings.push('Application is not running in a secure context (HTTPS)');
    }

    if (!window.crypto || !window.crypto.subtle) {
      warnings.push('Web Crypto API is not available');
    }

    if (typeof Storage === 'undefined') {
      warnings.push('Local storage is not available');
    }

    return {
      isSecure: warnings.length === 0,
      warnings,
    };
  }
}