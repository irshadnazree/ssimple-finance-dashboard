import type { Transaction, ExternalTransactionFormat } from '../../types/finance';

export namespace DataTransformUtils {
	/**
	 * Convert external JSON format to internal Transaction format
	 */
	export function fromExternalFormat(external: ExternalTransactionFormat): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> {
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
			description: external.Description || '',
			account2: external.Account_2,
			type: external["Income/Expense"].toLowerCase() as 'income' | 'expense'
		};
	}

	/**
	 * Convert internal Transaction format to external JSON format
	 */
	export function toExternalFormat(transaction: Transaction): ExternalTransactionFormat {
		return {
			Date: transaction.date.toISOString(),
			Account: transaction.account,
			Category: transaction.category,
			Subcategory: transaction.subcategory || null,
			Note: transaction.note || null,
			MYR: transaction.myr || transaction.amount,
			"Income/Expense": transaction.incomeExpense || (transaction.type === 'income' ? 'Income' : 'Expense'),
			Description: transaction.description || null,
			Amount: transaction.amount,
			Currency: transaction.currency || 'MYR',
			Account_2: transaction.account2 || transaction.amount
		};
	}

	/**
	 * Convert array of external format to internal format
	 */
	export function fromExternalFormatArray(externals: ExternalTransactionFormat[]): Array<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>> {
		return externals.map(fromExternalFormat);
	}

	/**
	 * Convert array of internal format to external format
	 */
	export function toExternalFormatArray(transactions: Transaction[]): ExternalTransactionFormat[] {
		return transactions.map(toExternalFormat);
	}

	/**
	 * Validate external format data
	 */
	export function validateExternalFormat(data: unknown): data is ExternalTransactionFormat {
		if (typeof data !== 'object' || data === null) {
			return false;
		}
		
		const obj = data as Record<string, unknown>;
		return (
			typeof obj.Date === 'string' &&
			typeof obj.Account === 'string' &&
			typeof obj.Category === 'string' &&
			typeof obj.MYR === 'number' &&
			(obj["Income/Expense"] === 'Income' || obj["Income/Expense"] === 'Expense') &&
			typeof obj.Amount === 'number' &&
			typeof obj.Currency === 'string' &&
			typeof obj.Account_2 === 'number'
		);
	}

	/**
	 * Handle null values appropriately during processing
	 */
	export function sanitizeNullValues(data: unknown): unknown {
		if (Array.isArray(data)) {
			return data.map(sanitizeNullValues);
		}
		
		if (data && typeof data === 'object') {
			const sanitized: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(data)) {
				sanitized[key] = value === null ? undefined : sanitizeNullValues(value);
			}
			return sanitized;
		}
		
		return data;
	}

	/**
	 * Validate and transform imported data
	 */
	export function processImportData(rawData: string): ExternalTransactionFormat[] {
		try {
			const parsed = JSON.parse(rawData);
			const dataArray = Array.isArray(parsed) ? parsed : [parsed];
			
			// Validate each item
			const validData = dataArray.filter(item => {
				if (!validateExternalFormat(item)) {
					console.warn('Invalid transaction format:', item);
					return false;
				}
				return true;
			});
			
			return sanitizeNullValues(validData) as ExternalTransactionFormat[];
		} catch (error) {
			console.error('Error parsing import data:', error);
			throw new Error('Invalid JSON format');
		}
	}
}