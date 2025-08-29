import type {
	ExternalTransactionFormat,
	Transaction,
} from "../../types/finance";

export interface ValidationResult {
	success: boolean;
	errors: string[];
	warnings: string[];
	data?: any;
}

export interface ImportValidationOptions {
	allowDuplicates?: boolean;
	skipInvalidRows?: boolean;
	maxFileSize?: number; // in bytes
	requiredFields?: string[];
	dateFormats?: string[];
}

export namespace DataTransformUtils {
	/**
	 * Type guard to validate transaction type
	 */
	function isValidTransactionType(
		value: string,
	): value is "income" | "expense" {
		return value === "income" || value === "expense";
	}

	/**
	 * Safely convert income/expense string to transaction type
	 */
	function convertToTransactionType(
		incomeExpense: "Income" | "Expense",
	): "income" | "expense" {
		const lowercased = incomeExpense.toLowerCase();
		if (isValidTransactionType(lowercased)) {
			return lowercased;
		}
		// Fallback to expense if conversion fails
		return "expense";
	}

	/**
	 * Validate date string and convert to Date object
	 */
	function parseAndValidateDate(dateStr: string): Date | null {
		if (!dateStr || typeof dateStr !== "string") {
			return null;
		}

		// Try parsing the date directly
		// Supports common formats: YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY, YYYY/MM/DD

		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) {
			return null;
		}

		// Check if date is reasonable (not too far in past/future)
		const now = new Date();
		const minDate = new Date(now.getFullYear() - 10, 0, 1);
		const maxDate = new Date(now.getFullYear() + 1, 11, 31);

		if (date < minDate || date > maxDate) {
			return null;
		}

		return date;
	}

	/**
	 * Validate and sanitize amount
	 */
	function validateAmount(amount: unknown): number | null {
		if (typeof amount === "number") {
			if (Number.isNaN(amount) || !Number.isFinite(amount) || amount <= 0) {
				return null;
			}
			return Math.round(amount * 100) / 100; // Round to 2 decimal places
		}

		if (typeof amount === "string") {
			// Remove currency symbols and whitespace
			const cleaned = amount.replace(/[$,\s]/g, "");
			const parsed = parseFloat(cleaned);
			if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0) {
				return null;
			}
			return Math.round(parsed * 100) / 100;
		}

		return null;
	}

	/**
	 * Generate unique transaction hash for duplicate detection
	 */
	function generateTransactionHash(
		transaction: Partial<ExternalTransactionFormat>,
	): string {
		const key = `${transaction.Date}_${transaction.Account}_${transaction.Amount}_${transaction.Description || transaction.Note}`;
		return btoa(key)
			.replace(/[^a-zA-Z0-9]/g, "")
			.substring(0, 16);
	}

	/**
	 * Convert external JSON format to internal Transaction format
	 */
	export function fromExternalFormat(
		external: ExternalTransactionFormat,
	): Omit<Transaction, "id" | "createdAt" | "updatedAt"> {
		return {
			date: new Date(external.Date),
			account: external.Account,
			category: external.Category,
			subcategory: external.Subcategory || undefined,
			note: external.Note,
			amount: external.Amount,
			currency: external.Currency,
			myr: external.MYR,
			incomeExpense: external["Income/Expense"],
			description: external.Description || "",
			account2: external.Account_2,
			type: convertToTransactionType(external["Income/Expense"]),
			status: "completed",
		};
	}

	/**
	 * Convert internal Transaction format to external JSON format
	 */
	export function toExternalFormat(
		transaction: Transaction,
	): ExternalTransactionFormat {
		return {
			Date: transaction.date.toISOString(),
			Account: transaction.account,
			Category: transaction.category,
			Subcategory: transaction.subcategory || null,
			Note: transaction.note || null,
			MYR: transaction.myr || transaction.amount,
			"Income/Expense":
				transaction.incomeExpense ||
				(transaction.type === "income" ? "Income" : "Expense"),
			Description: transaction.description || null,
			Amount: transaction.amount,
			Currency: transaction.currency || "MYR",
			Account_2: transaction.account2 || transaction.amount,
		};
	}

	/**
	 * Convert array of external format to internal format
	 */
	export function fromExternalFormatArray(
		externals: ExternalTransactionFormat[],
	): Array<Omit<Transaction, "id" | "createdAt" | "updatedAt">> {
		return externals.map(fromExternalFormat);
	}

	/**
	 * Convert array of internal format to external format
	 */
	export function toExternalFormatArray(
		transactions: Transaction[],
	): ExternalTransactionFormat[] {
		return transactions.map(toExternalFormat);
	}

	/**
	 * Enhanced validation for external format data with detailed error reporting
	 */
	export function validateExternalFormat(
		data: unknown,
	): data is ExternalTransactionFormat {
		if (typeof data !== "object" || data === null) {
			return false;
		}

		const obj = data as Record<string, unknown>;
		return (
			typeof obj.Date === "string" &&
			typeof obj.Account === "string" &&
			typeof obj.Category === "string" &&
			typeof obj.MYR === "number" &&
			(obj["Income/Expense"] === "Income" ||
				obj["Income/Expense"] === "Expense") &&
			typeof obj.Amount === "number" &&
			typeof obj.Currency === "string" &&
			typeof obj.Account_2 === "number"
		);
	}

	/**
	 * Comprehensive validation with detailed error reporting
	 */
	export function validateTransactionData(
		data: unknown,
		rowIndex?: number,
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		const prefix = rowIndex !== undefined ? `Row ${rowIndex + 1}: ` : "";

		if (typeof data !== "object" || data === null) {
			errors.push(`${prefix}Invalid data format - expected object`);
			return { success: false, errors, warnings };
		}

		const obj = data as Record<string, unknown>;

		// Validate required fields
		if (!obj.Date || typeof obj.Date !== "string") {
			errors.push(`${prefix}Date is required and must be a string`);
		} else {
			const validDate = parseAndValidateDate(obj.Date);
			if (!validDate) {
				errors.push(`${prefix}Invalid date format: ${obj.Date}`);
			}
		}

		if (
			!obj.Account ||
			typeof obj.Account !== "string" ||
			obj.Account.trim().length === 0
		) {
			errors.push(`${prefix}Account is required and cannot be empty`);
		}

		if (
			!obj.Category ||
			typeof obj.Category !== "string" ||
			obj.Category.trim().length === 0
		) {
			errors.push(`${prefix}Category is required and cannot be empty`);
		}

		if (
			!obj["Income/Expense"] ||
			(obj["Income/Expense"] !== "Income" &&
				obj["Income/Expense"] !== "Expense")
		) {
			errors.push(
				`${prefix}Income/Expense must be either 'Income' or 'Expense'`,
			);
		}

		// Validate amounts
		const amount = validateAmount(obj.Amount);
		if (amount === null) {
			errors.push(`${prefix}Amount must be a positive number`);
		}

		const myr = validateAmount(obj.MYR);
		if (myr === null) {
			errors.push(`${prefix}MYR amount must be a positive number`);
		}

		// Validate optional fields with warnings
		if (!obj.Description && !obj.Note) {
			warnings.push(`${prefix}No description or note provided`);
		}

		if (!obj.Currency || typeof obj.Currency !== "string") {
			warnings.push(`${prefix}Currency not specified, defaulting to MYR`);
		}

		return {
			success: errors.length === 0,
			errors,
			warnings,
			data: errors.length === 0 ? obj : undefined,
		};
	}

	/**
	 * Parse CSV data into array of objects
	 */
	export function parseCSV(csvData: string): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		try {
			const lines = csvData.trim().split("\n");
			if (lines.length < 2) {
				errors.push("CSV must contain at least a header row and one data row");
				return { success: false, errors, warnings };
			}

			const headers = lines[0]
				.split(",")
				.map((h) => h.trim().replace(/"/g, ""));
			const requiredHeaders = [
				"Date",
				"Account",
				"Category",
				"Amount",
				"Income/Expense",
			];

			for (const required of requiredHeaders) {
				if (!headers.includes(required)) {
					errors.push(`Missing required column: ${required}`);
				}
			}

			if (errors.length > 0) {
				return { success: false, errors, warnings };
			}

			const data: any[] = [];
			for (let i = 1; i < lines.length; i++) {
				const values = lines[i]
					.split(",")
					.map((v) => v.trim().replace(/"/g, ""));
				if (values.length !== headers.length) {
					warnings.push(`Row ${i + 1}: Column count mismatch, skipping`);
					continue;
				}

				const row: any = {};
				headers.forEach((header, index) => {
					let value: any = values[index];
					// Convert numeric fields
					if (["Amount", "MYR", "Account_2"].includes(header)) {
						value = parseFloat(value) || 0;
					}
					row[header] = value;
				});
				data.push(row);
			}

			return { success: true, errors, warnings, data };
		} catch (error) {
			errors.push(
				`CSV parsing error: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			return { success: false, errors, warnings };
		}
	}

	/**
	 * Detect and remove duplicate transactions
	 */
	export function detectDuplicates(
		transactions: ExternalTransactionFormat[],
		existingHashes?: Set<string>,
	): {
		unique: ExternalTransactionFormat[];
		duplicates: ExternalTransactionFormat[];
	} {
		const seen = existingHashes || new Set<string>();
		const unique: ExternalTransactionFormat[] = [];
		const duplicates: ExternalTransactionFormat[] = [];

		for (const transaction of transactions) {
			const hash = generateTransactionHash(transaction);
			if (seen.has(hash)) {
				duplicates.push(transaction);
			} else {
				seen.add(hash);
				unique.push(transaction);
			}
		}

		return { unique, duplicates };
	}

	/**
	 * Handle null values appropriately during processing
	 */
	export function sanitizeNullValues(data: unknown): unknown {
		if (Array.isArray(data)) {
			return data.map(sanitizeNullValues);
		}

		if (data && typeof data === "object") {
			const sanitized: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(data)) {
				sanitized[key] = value === null ? undefined : sanitizeNullValues(value);
			}
			return sanitized;
		}

		return data;
	}

	/**
	 * Enhanced import data processing with comprehensive validation
	 */
	export function processImportData(
		rawData: string,
		format: "json" | "csv" = "json",
		options: ImportValidationOptions = {},
	): ValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];
		const maxSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default

		// Validate file size
		if (rawData.length > maxSize) {
			errors.push(
				`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
			);
			return { success: false, errors, warnings };
		}

		let parseResult: ValidationResult;

		// Parse based on format
		if (format === "csv") {
			parseResult = parseCSV(rawData);
		} else {
			try {
				const parsed = JSON.parse(rawData);
				const dataArray = Array.isArray(parsed) ? parsed : [parsed];
				parseResult = {
					success: true,
					errors: [],
					warnings: [],
					data: dataArray,
				};
			} catch (error) {
				return {
					success: false,
					errors: [
						`Invalid JSON format: ${error instanceof Error ? error.message : "Unknown error"}`,
					],
					warnings: [],
				};
			}
		}

		if (!parseResult.success) {
			return parseResult;
		}

		errors.push(...parseResult.errors);
		warnings.push(...parseResult.warnings);

		const dataArray = parseResult.data as any[];
		const validTransactions: ExternalTransactionFormat[] = [];
		const invalidCount = { count: 0 };

		// Validate each transaction
		for (let i = 0; i < dataArray.length; i++) {
			const validation = validateTransactionData(dataArray[i], i);

			if (validation.success && validation.data) {
				const sanitized = sanitizeNullValues(validation.data);
				if (validateExternalFormat(sanitized)) {
					validTransactions.push(sanitized as ExternalTransactionFormat);
				} else {
					invalidCount.count++;
					if (!options.skipInvalidRows) {
						errors.push(
							`Row ${i + 1}: Failed final validation after sanitization`,
						);
					}
				}
			} else {
				invalidCount.count++;
				if (options.skipInvalidRows) {
					warnings.push(...validation.errors);
				} else {
					errors.push(...validation.errors);
				}
			}

			warnings.push(...validation.warnings);
		}

		// Handle duplicates if not allowed
		let finalTransactions = validTransactions;
		if (!options.allowDuplicates) {
			const { unique, duplicates } = detectDuplicates(validTransactions);
			finalTransactions = unique;
			if (duplicates.length > 0) {
				warnings.push(
					`Found and removed ${duplicates.length} duplicate transactions`,
				);
			}
		}

		if (invalidCount.count > 0) {
			warnings.push(
				`${invalidCount.count} invalid rows were ${options.skipInvalidRows ? "skipped" : "found"}`,
			);
		}

		const success =
			finalTransactions.length > 0 &&
			(options.skipInvalidRows || errors.length === 0);

		return {
			success,
			errors,
			warnings,
			data: finalTransactions,
		};
	}

	/**
	 * Legacy function for backward compatibility
	 */
	export function processImportDataLegacy(
		rawData: string,
	): ExternalTransactionFormat[] {
		const result = processImportData(rawData, "json", {
			skipInvalidRows: true,
		});
		if (!result.success) {
			throw new Error(result.errors.join("; "));
		}
		return result.data as ExternalTransactionFormat[];
	}
}
