import { create } from "zustand";
import { ValidationUtils } from "../lib/calculations/finance";
import { DatabaseService } from "../lib/database/db";
import { DataTransformUtils } from "../lib/transactions/dataTransform";
import type {
	Account,
	Category,
	Transaction,
	ValidationError,
} from "../types/finance";

// Interfaces for transaction management
export interface TransactionFilters {
	startDate?: Date;
	endDate?: Date;
	category?: string;
	account?: string;
	type?: Transaction["type"];
	minAmount?: number;
	maxAmount?: number;
	status?: Transaction["status"];
	tags?: string[];
}

export interface TransactionSummary {
	totalIncome: number;
	totalExpenses: number;
	netAmount: number;
	transactionCount: number;
	averageTransaction: number;
	categoryBreakdown: Record<string, number>;
	accountBreakdown: Record<string, number>;
	period?: {
		startDate: Date;
		endDate: Date;
	};
}

export interface BulkTransactionResult {
	success: boolean;
	processed: number;
	failed: number;
	errors: string[];
}

interface TransactionState {
	// State
	transactions: Transaction[];
	categories: Category[];
	accounts: Account[];
	isLoading: boolean;
	error: string | null;
	filters: TransactionFilters;

	// Transaction operations
	createTransaction: (
		transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
	) => Promise<Transaction>;
	updateTransaction: (
		id: string,
		updates: Partial<Transaction>,
	) => Promise<Transaction>;
	deleteTransaction: (id: string) => Promise<void>;
	getTransaction: (id: string) => Transaction | undefined;
	getTransactions: (filters?: TransactionFilters) => Transaction[];

	// Bulk operations
	bulkCreateTransactions: (
		transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
	) => Promise<BulkTransactionResult>;
	bulkUpdateTransactions: (
		updates: Array<{ id: string; updates: Partial<Transaction> }>,
	) => Promise<BulkTransactionResult>;
	bulkDeleteTransactions: (ids: string[]) => Promise<BulkTransactionResult>;

	// Analytics and reporting
	getTransactionSummary: (filters?: TransactionFilters) => TransactionSummary;
	getCategoryBreakdown: (
		type?: Transaction["type"],
	) => Record<string, { amount: number; count: number }>;
	getMonthlyTrends: (
		months: number,
	) => Array<{ month: string; income: number; expenses: number; net: number }>;

	// Search and filtering
	searchTransactions: (query: string) => Transaction[];
	getRecentTransactions: (limit: number) => Transaction[];
	getTransactionsByDateRange: (startDate: Date, endDate: Date) => Transaction[];

	// Import/Export
	importTransactions: (
		data: string,
		format?: "json" | "csv",
	) => Promise<BulkTransactionResult>;
	exportTransactions: (
		transactions: Transaction[],
		format?: "json" | "csv",
	) => string;

	// Utility methods
	refreshTransactions: () => Promise<void>;
	setFilters: (filters: TransactionFilters) => void;
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;
	validateTransaction: (
		transaction: Partial<Transaction>,
	) => Promise<ValidationError[]>;
	suggestCategory: (
		description: string,
		amount: number,
	) => Promise<string | null>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
	// Initial state
	transactions: [],
	categories: [],
	accounts: [],
	isLoading: false,
	error: null,
	filters: {},

	// Transaction operations
	createTransaction: async (
		transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
	) => {
		set({ isLoading: true, error: null });
		try {
			const newTransaction: Transaction = {
				...transaction,
				id: crypto.randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			// Validate transaction
			if (!newTransaction.amount || newTransaction.amount <= 0) {
				throw new Error("Transaction amount must be greater than 0");
			}
			if (!newTransaction.category) {
				throw new Error("Category is required");
			}
			if (!newTransaction.account) {
				throw new Error("Account is required");
			}

			// Validate account exists
			const account = get().accounts.find(
				(a) => a.id === newTransaction.account,
			);
			if (!account) {
				throw new Error("Account not found");
			}

			const category = get().categories.find(
				(c) => c.id === newTransaction.category,
			);

			if (category?.type !== newTransaction.type) {
				throw new Error("Transaction type does not match category type");
			}

			const state = get();
			const updatedTransactions = [...state.transactions, newTransaction];

			set({
				transactions: updatedTransactions,
				isLoading: false,
			});

			return newTransaction;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			set({ error: errorMessage, isLoading: false });
			throw error;
		}
	},

	updateTransaction: async (id: string, updates: Partial<Transaction>) => {
		set({ isLoading: true, error: null });
		try {
			const state = get();
			const transactionIndex = state.transactions.findIndex((t) => t.id === id);

			if (transactionIndex === -1) {
				throw new Error("Transaction not found");
			}

			const updatedTransaction = {
				...state.transactions[transactionIndex],
				...updates,
				updatedAt: new Date(),
			};

			const updatedTransactions = [...state.transactions];
			updatedTransactions[transactionIndex] = updatedTransaction;

			set({
				transactions: updatedTransactions,
				isLoading: false,
			});

			return updatedTransaction;
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			set({ error: errorMessage, isLoading: false });
			throw error;
		}
	},

	deleteTransaction: async (id: string) => {
		set({ isLoading: true, error: null });
		try {
			const state = get();
			const updatedTransactions = state.transactions.filter((t) => t.id !== id);

			set({
				transactions: updatedTransactions,
				isLoading: false,
			});
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			set({ error: errorMessage, isLoading: false });
			throw error;
		}
	},

	getTransaction: (id: string) => {
		const state = get();
		return state.transactions.find((t) => t.id === id);
	},

	getTransactions: (filters?: TransactionFilters) => {
		const state = get();
		let filteredTransactions = state.transactions;

		if (filters) {
			filteredTransactions = state.transactions.filter((transaction) => {
				if (filters.startDate && transaction.date < filters.startDate)
					return false;
				if (filters.endDate && transaction.date > filters.endDate) return false;
				if (filters.category && transaction.category !== filters.category)
					return false;
				if (filters.account && transaction.account !== filters.account)
					return false;
				if (filters.type && transaction.type !== filters.type) return false;
				if (filters.minAmount && transaction.amount < filters.minAmount)
					return false;
				if (filters.maxAmount && transaction.amount > filters.maxAmount)
					return false;
				if (filters.status && transaction.status !== filters.status)
					return false;
				if (filters.tags && filters.tags.length > 0) {
					if (
						!transaction.tags ||
						!filters.tags.some((tag) => transaction.tags?.includes(tag))
					) {
						return false;
					}
				}
				return true;
			});
		}

		return filteredTransactions.sort(
			(a, b) => b.date.getTime() - a.date.getTime(),
		);
	},

	bulkCreateTransactions: async (
		transactions: Omit<Transaction, "id" | "createdAt" | "updatedAt">[],
	) => {
		set({ isLoading: true, error: null });
		try {
			const state = get();
			const newTransactions: Transaction[] = transactions.map(
				(transaction) => ({
					...transaction,
					id: crypto.randomUUID(),
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			);

			const updatedTransactions = [...state.transactions, ...newTransactions];

			set({
				transactions: updatedTransactions,
				isLoading: false,
			});

			return {
				success: true,
				processed: newTransactions.length,
				failed: 0,
				errors: [],
			};
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			set({ error: errorMessage, isLoading: false });
			return {
				success: false,
				processed: 0,
				failed: transactions.length,
				errors: [errorMessage],
			};
		}
	},

	bulkUpdateTransactions: async (
		updates: Array<{ id: string; updates: Partial<Transaction> }>,
	) => {
		set({ isLoading: true, error: null });
		try {
			const state = get();
			const updatedTransactions = [...state.transactions];
			let processed = 0;
			const errors: string[] = [];

			for (const update of updates) {
				const index = updatedTransactions.findIndex((t) => t.id === update.id);
				if (index !== -1) {
					updatedTransactions[index] = {
						...updatedTransactions[index],
						...update.updates,
						updatedAt: new Date(),
					};
					processed++;
				} else {
					errors.push(`Transaction with id ${update.id} not found`);
				}
			}

			set({
				transactions: updatedTransactions,
				isLoading: false,
			});

			return {
				success: errors.length === 0,
				processed,
				failed: updates.length - processed,
				errors,
			};
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			set({ error: errorMessage, isLoading: false });
			return {
				success: false,
				processed: 0,
				failed: updates.length,
				errors: [errorMessage],
			};
		}
	},

	bulkDeleteTransactions: async (ids: string[]) => {
		set({ isLoading: true, error: null });
		try {
			const state = get();
			const updatedTransactions = state.transactions.filter(
				(t) => !ids.includes(t.id),
			);
			const deleted = state.transactions.length - updatedTransactions.length;

			set({
				transactions: updatedTransactions,
				isLoading: false,
			});

			return {
				success: true,
				processed: deleted,
				failed: ids.length - deleted,
				errors: [],
			};
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			set({ error: errorMessage, isLoading: false });
			return {
				success: false,
				processed: 0,
				failed: ids.length,
				errors: [errorMessage],
			};
		}
	},

	getTransactionSummary: (filters?: TransactionFilters) => {
		const transactions = get().getTransactions(filters);

		const summary: TransactionSummary = {
			totalIncome: 0,
			totalExpenses: 0,
			netAmount: 0,
			transactionCount: transactions.length,
			averageTransaction: 0,
			categoryBreakdown: {},
			accountBreakdown: {},
			period: {
				startDate:
					filters?.startDate ||
					new Date(Math.min(...transactions.map((t) => t.date.getTime()))),
				endDate:
					filters?.endDate ||
					new Date(Math.max(...transactions.map((t) => t.date.getTime()))),
			},
		};

		for (const transaction of transactions) {
			if (transaction.type === "income") {
				summary.totalIncome += transaction.amount;
			} else if (transaction.type === "expense") {
				summary.totalExpenses += transaction.amount;
			}

			// Category breakdown
			if (!summary.categoryBreakdown[transaction.category]) {
				summary.categoryBreakdown[transaction.category] = 0;
			}
			summary.categoryBreakdown[transaction.category] += transaction.amount;

			// Account breakdown
			if (!summary.accountBreakdown[transaction.account]) {
				summary.accountBreakdown[transaction.account] = 0;
			}
			summary.accountBreakdown[transaction.account] += transaction.amount;
		}

		summary.netAmount = summary.totalIncome - summary.totalExpenses;
		summary.averageTransaction =
			transactions.length > 0
				? (summary.totalIncome + summary.totalExpenses) / transactions.length
				: 0;

		return summary;
	},

	getCategoryBreakdown: (type?: Transaction["type"]) => {
		const transactions = get().transactions;
		const categoryMap = new Map<string, { amount: number; count: number }>();

		for (const transaction of transactions) {
			if (type && transaction.type !== type) continue;

			const existing = categoryMap.get(transaction.category) || {
				amount: 0,
				count: 0,
			};
			categoryMap.set(transaction.category, {
				amount: existing.amount + transaction.amount,
				count: existing.count + 1,
			});
		}

		return Object.fromEntries(categoryMap);
	},

	getMonthlyTrends: (months: number) => {
		const transactions = get().transactions;
		const endDate = new Date();
		const startDate = new Date(
			endDate.getFullYear(),
			endDate.getMonth() - months + 1,
			1,
		);

		const monthlyData: Array<{
			month: string;
			income: number;
			expenses: number;
			net: number;
		}> = [];

		for (let i = 0; i < months; i++) {
			const monthStart = new Date(
				startDate.getFullYear(),
				startDate.getMonth() + i,
				1,
			);
			const monthEnd = new Date(
				startDate.getFullYear(),
				startDate.getMonth() + i + 1,
				0,
			);

			const monthTransactions = transactions.filter(
				(t) => t.date >= monthStart && t.date <= monthEnd,
			);

			const income = monthTransactions
				.filter((t) => t.type === "income")
				.reduce((sum, t) => sum + t.amount, 0);

			const expenses = monthTransactions
				.filter((t) => t.type === "expense")
				.reduce((sum, t) => sum + t.amount, 0);

			monthlyData.push({
				month: monthStart.toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
				}),
				income,
				expenses,
				net: income - expenses,
			});
		}

		return monthlyData;
	},

	searchTransactions: (query: string) => {
		const transactions = get().transactions;
		const lowercaseQuery = query.toLowerCase();

		return transactions.filter(
			(transaction) =>
				transaction.description.toLowerCase().includes(lowercaseQuery) ||
				transaction.category.toLowerCase().includes(lowercaseQuery) ||
				transaction.account.toLowerCase().includes(lowercaseQuery) ||
				(transaction.tags?.some((tag) =>
					tag.toLowerCase().includes(lowercaseQuery),
				) ??
					false),
		);
	},

	getRecentTransactions: (limit: number) => {
		const transactions = get().transactions;
		return transactions
			.sort((a, b) => b.date.getTime() - a.date.getTime())
			.slice(0, limit);
	},

	getTransactionsByDateRange: (startDate: Date, endDate: Date) => {
		const transactions = get().transactions;
		return transactions.filter((t) => t.date >= startDate && t.date <= endDate);
	},

	importTransactions: async (data: string, format = "json") => {
		const result: BulkTransactionResult = {
			success: false,
			processed: 0,
			failed: 0,
			errors: [],
		};

		try {
			let transactions: Partial<Transaction>[];

			if (format === "json") {
				transactions = JSON.parse(data);
			} else {
				// CSV parsing would go here
				throw new Error("CSV import not implemented");
			}

			for (const transaction of transactions) {
				try {
					const validationErrors = await get().validateTransaction(transaction);
					if (validationErrors.length > 0) {
						result.failed++;
						result.errors.push(
							`Transaction validation failed: ${validationErrors.map((e) => e.message).join(", ")}`,
						);
						continue;
					}

					await get().createTransaction(
						transaction as Omit<Transaction, "id" | "createdAt" | "updatedAt">,
					);
					result.processed++;
				} catch (error) {
					result.failed++;
					result.errors.push(
						error instanceof Error ? error.message : "Unknown error",
					);
				}
			}

			result.success = result.processed > 0;
			return result;
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : "Failed to parse import data",
			);
			return result;
		}
	},

	exportTransactions: (transactions: Transaction[], format = "json") => {
		if (format === "json") {
			return JSON.stringify(transactions, null, 2);
		}

		// CSV export
		const headers = [
			"ID",
			"Date",
			"Description",
			"Amount",
			"Type",
			"Category",
			"Account",
		];
		const csvRows = [headers.join(",")];

		for (const transaction of transactions) {
			const row = [
				transaction.id,
				transaction.date.toISOString(),
				`"${transaction.description}"`,
				transaction.amount.toString(),
				transaction.type,
				transaction.category,
				transaction.account,
			];
			csvRows.push(row.join(","));
		}

		return csvRows.join("\n");
	},

	refreshTransactions: async () => {
		set({ isLoading: true, error: null });
		try {
			const transactions = await DatabaseService.getTransactions();
			const categories = await DatabaseService.getCategories();
			const accounts = await DatabaseService.getAccounts();

			set({
				transactions,
				categories,
				accounts,
				isLoading: false,
			});
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			set({ error: errorMessage, isLoading: false });
		}
	},

	setFilters: (filters: TransactionFilters) => {
		set({ filters });
	},

	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},

	setError: (error: string | null) => {
		set({ error });
	},

	validateTransaction: async (transaction: Partial<Transaction>) => {
		const errors: ValidationError[] = [];

		if (!transaction.amount || transaction.amount <= 0) {
			errors.push({
				field: "amount",
				message: "Amount must be greater than 0",
				code: "INVALID_AMOUNT",
			});
		}

		if (!transaction.description?.trim()) {
			errors.push({
				field: "description",
				message: "Description is required",
				code: "REQUIRED_FIELD",
			});
		}

		if (!transaction.category) {
			errors.push({
				field: "category",
				message: "Category is required",
				code: "REQUIRED_FIELD",
			});
		}

		if (!transaction.account) {
			errors.push({
				field: "account",
				message: "Account is required",
				code: "REQUIRED_FIELD",
			});
		}

		return errors;
	},

	suggestCategory: async (description: string, _amount: number) => {
		// Simple keyword-based categorization
		const keywords = {
			food: [
				"restaurant",
				"grocery",
				"food",
				"cafe",
				"pizza",
				"burger",
				"coffee",
			],
			transport: ["gas", "fuel", "uber", "taxi", "bus", "train", "parking"],
			entertainment: ["movie", "cinema", "game", "music", "netflix", "spotify"],
			shopping: ["amazon", "store", "mall", "shop", "purchase", "buy"],
			utilities: ["electric", "water", "internet", "phone", "cable", "utility"],
			healthcare: ["doctor", "hospital", "pharmacy", "medical", "health"],
			salary: ["salary", "wage", "payroll", "income", "pay"],
		};

		const lowerDescription = description.toLowerCase();
		const categories = get().categories;

		for (const [categoryName, words] of Object.entries(keywords)) {
			if (words.some((word) => lowerDescription.includes(word))) {
				// Check if this category exists in our database
				const existingCategory = categories.find(
					(c) => c.name.toLowerCase() === categoryName,
				);
				return existingCategory ? existingCategory.id : null;
			}
		}

		return null;
	},
}));
