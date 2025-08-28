import {
	addDays,
	addMonths,
	addWeeks,
	addYears,
	endOfMonth,
	endOfWeek,
	endOfYear,
	isWithinInterval,
	startOfMonth,
	startOfWeek,
	startOfYear,
} from "date-fns";
import type {
	Account,
	ChartDataPoint,
	ChartTimeframe,
	FinancialSummary,
	RecurringTransaction,
	Transaction,
	ValidationError,
} from "../../types/finance";

// Validation utilities for financial data
export namespace ValidationUtils {
	export function validateTransaction(
		transaction: Partial<Transaction>,
	): ValidationError[] {
		const errors: ValidationError[] = [];

		if (!transaction.amount || transaction.amount <= 0) {
			errors.push({
				field: "amount",
				message: "Amount is required and must be greater than 0",
				code: "AMOUNT_REQUIRED",
			});
		}

		if (transaction.amount && transaction.amount < 0) {
			errors.push({
				field: "amount",
				message: "Amount must be positive",
				code: "AMOUNT_POSITIVE",
			});
		}

		if (
			!transaction.description ||
			transaction.description.trim().length === 0
		) {
			errors.push({
				field: "description",
				message: "Description is required",
				code: "DESCRIPTION_REQUIRED",
			});
		}

		if (!transaction.category) {
			errors.push({
				field: "category",
				message: "Category is required",
				code: "CATEGORY_REQUIRED",
			});
		}

		if (!transaction.account) {
			errors.push({
				field: "account",
				message: "Account is required",
				code: "ACCOUNT_REQUIRED",
			});
		}

		if (!transaction.date) {
			errors.push({
				field: "date",
				message: "Date is required",
				code: "DATE_REQUIRED",
			});
		}

		return errors;
	}

	export function validateAccount(
		account: Partial<Account>,
	): ValidationError[] {
		const errors: ValidationError[] = [];

		if (!account.name || account.name.trim().length === 0) {
			errors.push({
				field: "name",
				message: "Account name is required",
				code: "NAME_REQUIRED",
			});
		}

		if (!account.type) {
			errors.push({
				field: "type",
				message: "Account type is required",
				code: "TYPE_REQUIRED",
			});
		}

		if (account.balance === undefined || account.balance === null) {
			errors.push({
				field: "balance",
				message: "Initial balance is required",
				code: "BALANCE_REQUIRED",
			});
		}

		return errors;
	}

	export function validateAmount(amount: number): boolean {
		return !Number.isNaN(amount) && Number.isFinite(amount) && amount >= 0;
	}

	export function validateDateRange(startDate: Date, endDate: Date): boolean {
		return startDate <= endDate;
	}

	export function sanitizeAmount(amount: number): number {
		if (Number.isNaN(amount) || !Number.isFinite(amount)) {
			return 0;
		}
		return Math.round(amount * 100) / 100; // Round to 2 decimal places
	}

	export function validateTransactionType(type: string): boolean {
		return ["income", "expense"].includes(type);
	}

	export function validateBudgetPeriod(period: string): boolean {
		return ["weekly", "monthly", "yearly"].includes(period);
	}

	export function validateAccountType(type: string): boolean {
		return ["checking", "savings", "credit", "investment", "cash"].includes(
			type,
		);
	}

	export function validateCurrency(currency: string): boolean {
		const validCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"];
		return validCurrencies.includes(currency);
	}

	export function validateEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	export function validatePassword(password: string): ValidationError[] {
		const errors: ValidationError[] = [];

		if (password.length < 8) {
			errors.push({
				field: "password",
				message: "Password must be at least 8 characters long",
				code: "PASSWORD_LENGTH",
			});
		}

		if (!/[A-Z]/.test(password)) {
			errors.push({
				field: "password",
				message: "Password must contain at least one uppercase letter",
				code: "PASSWORD_UPPERCASE",
			});
		}

		if (!/[a-z]/.test(password)) {
			errors.push({
				field: "password",
				message: "Password must contain at least one lowercase letter",
				code: "PASSWORD_LOWERCASE",
			});
		}

		if (!/\d/.test(password)) {
			errors.push({
				field: "password",
				message: "Password must contain at least one number",
				code: "PASSWORD_NUMBER",
			});
		}

		return errors;
	}
}

// Financial calculation utilities
export namespace FinanceCalculations {
	export function calculateTotalIncome(
		transactions: Transaction[],
		startDate?: Date,
		endDate?: Date,
	): number {
		return transactions
			.filter((t) => {
				if (t.type !== "income") return false;
				if (startDate && new Date(t.date) < startDate) return false;
				if (endDate && new Date(t.date) > endDate) return false;
				return true;
			})
			.reduce((sum, t) => sum + t.amount, 0);
	}

	export function calculateTotalExpenses(
		transactions: Transaction[],
		startDate?: Date,
		endDate?: Date,
	): number {
		return transactions
			.filter((t) => {
				if (t.type !== "expense") return false;
				if (startDate && new Date(t.date) < startDate) return false;
				if (endDate && new Date(t.date) > endDate) return false;
				return true;
			})
			.reduce((sum, t) => sum + t.amount, 0);
	}

	export function calculateNetWorth(accounts: Account[]): number {
		return accounts.reduce((total, account) => {
			if (account.type === "credit") {
				return total - account.balance;
			}
			return total + account.balance;
		}, 0);
	}

	export function calculateCashFlow(
		transactions: Transaction[],
		startDate?: Date,
		endDate?: Date,
	): number {
		const income = calculateTotalIncome(transactions, startDate, endDate);
		const expenses = calculateTotalExpenses(transactions, startDate, endDate);
		return income - expenses;
	}

	export function generateFinancialSummary(
		transactions: Transaction[],
		accounts: Account[],
	): FinancialSummary {
		const now = new Date();
		const startOfCurrentMonth = startOfMonth(now);
		const endOfCurrentMonth = endOfMonth(now);

		const monthlyIncome = calculateTotalIncome(
			transactions,
			startOfCurrentMonth,
			endOfCurrentMonth,
		);
		const monthlyExpenses = calculateTotalExpenses(
			transactions,
			startOfCurrentMonth,
			endOfCurrentMonth,
		);
		const netWorth = calculateNetWorth(accounts);
		const cashFlow = monthlyIncome - monthlyExpenses;

		return {
			totalIncome: monthlyIncome,
			totalExpenses: monthlyExpenses,
			netWorth,
			cashFlow,
			period: "month",
			periodStart: startOfCurrentMonth,
			periodEnd: endOfCurrentMonth,
		};
	}

	export function getTopCategories(
		transactions: Transaction[],
		type: "income" | "expense",
		limit = 5,
		startDate?: Date,
		endDate?: Date,
	): Array<{ category: string; amount: number; count: number }> {
		const filteredTransactions = transactions.filter((t) => {
			if (t.type !== type) return false;
			if (startDate && new Date(t.date) < startDate) return false;
			if (endDate && new Date(t.date) > endDate) return false;
			return true;
		});

		const categoryTotals = new Map<string, { amount: number; count: number }>();

		for (const transaction of filteredTransactions) {
			const existing = categoryTotals.get(transaction.category) || {
				amount: 0,
				count: 0,
			};
			categoryTotals.set(transaction.category, {
				amount: existing.amount + transaction.amount,
				count: existing.count + 1,
			});
		}

		return Array.from(categoryTotals.entries())
			.map(([category, data]) => ({ category, ...data }))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, limit);
	}

	export function getAccountBalance(
		account: string,
		transactions: Transaction[],
		initialBalance = 0,
	): number {
		const accountTransactions = transactions.filter(
			(t) => t.account === account,
		);

		return accountTransactions.reduce((balance, transaction) => {
			if (transaction.type === "income") {
				return balance + transaction.amount;
			}
			return balance - transaction.amount;
		}, initialBalance);
	}

	export function generateChartData(
		transactions: Transaction[],
		timeframe: ChartTimeframe,
		type: "income" | "expense" | "balance" = "expense",
		startDate?: Date,
		endDate?: Date,
	): ChartDataPoint[] {
		const now = new Date();
		let start: Date;
		let end: Date;
		let groupBy: "day" | "week" | "month";

		// Set date range based on timeframe
		switch (timeframe) {
			case "7d": {
				start = startDate || addDays(now, -7);
				end = endDate || now;
				groupBy = "day";
				break;
			}
			case "30d": {
				start = startDate || addDays(now, -30);
				end = endDate || now;
				groupBy = "day";
				break;
			}
			case "90d": {
				start = startDate || addDays(now, -90);
				end = endDate || now;
				groupBy = "week";
				break;
			}
			case "1y": {
				start = startDate || addDays(now, -365);
				end = endDate || now;
				groupBy = "month";
				break;
			}
			case "all": {
				start =
					startDate ||
					new Date(
						Math.min(...transactions.map((t) => new Date(t.date).getTime())),
					);
				end = endDate || now;
				groupBy = "month";
				break;
			}
			default: {
				start = startDate || startOfMonth(now);
				end = endDate || endOfMonth(now);
				groupBy = "day";
			}
		}

		const filteredTransactions = transactions.filter((t) => {
			if (type !== "balance" && t.type !== type) return false;
			const transactionDate = new Date(t.date);
			return isWithinInterval(transactionDate, { start, end });
		});

		const groupedData = {} as Record<string, number>;

		for (const transaction of filteredTransactions) {
			const date = new Date(transaction.date);
			let key: string;

			switch (groupBy) {
				case "day": {
					key = date.toISOString().split("T")[0];
					break;
				}
				case "week": {
					const weekStart = startOfWeek(date);
					key = weekStart.toISOString().split("T")[0];
					break;
				}
				case "month": {
					key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
					break;
				}
				default: {
					key = date.toISOString().split("T")[0];
				}
			}

			if (type === "balance") {
				const multiplier = transaction.type === "income" ? 1 : -1;
				groupedData[key] =
					(groupedData[key] || 0) + transaction.amount * multiplier;
			} else {
				groupedData[key] = (groupedData[key] || 0) + transaction.amount;
			}
		}

		return Object.entries(groupedData)
			.map(([date, value]) => ({ date, value }))
			.sort((a, b) => a.date.localeCompare(b.date));
	}
}

// Recurring transaction utilities
export namespace RecurringTransactions {
	export function generateUpcomingTransactions(
		baseTransaction: Transaction,
		daysAhead = 30,
	): Transaction[] {
		if (!baseTransaction.recurring) return [];

		const upcoming: Transaction[] = [];
		const endDate = addDays(new Date(), daysAhead);
		let currentDate = new Date(baseTransaction.recurring.nextDue);

		while (currentDate <= endDate && upcoming.length < 50) {
			upcoming.push({
				id: `${baseTransaction.id}-${currentDate.getTime()}`,
				amount: baseTransaction.amount,
				description: baseTransaction.description,
				category: baseTransaction.category,
				subcategory: baseTransaction.subcategory,
				account: baseTransaction.account,
				type: baseTransaction.type,
				date: new Date(currentDate),
				tags: baseTransaction.tags,
				currency: baseTransaction.currency,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// Calculate next occurrence
			switch (baseTransaction.recurring.frequency) {
				case "daily":
					currentDate = addDays(
						currentDate,
						baseTransaction.recurring.interval || 1,
					);
					break;
				case "weekly":
					currentDate = addWeeks(
						currentDate,
						baseTransaction.recurring.interval || 1,
					);
					break;
				case "monthly":
					currentDate = addMonths(
						currentDate,
						baseTransaction.recurring.interval || 1,
					);
					break;
				case "yearly":
					currentDate = addYears(
						currentDate,
						baseTransaction.recurring.interval || 1,
					);
					break;
			}
		}

		return upcoming;
	}
}

// Currency and formatting utilities
export namespace CurrencyUtils {
	export function formatCurrency(
		amount: number,
		currency = "USD",
		locale = "en-US",
	): string {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	}

	export function parseCurrency(currencyString: string): number {
		// Remove currency symbols and parse
		const cleaned = currencyString.replace(/[^\d.-]/g, "");
		const parsed = Number.parseFloat(cleaned);
		return Number.isNaN(parsed) ? 0 : parsed;
	}

	export function formatPercentage(value: number, decimals = 1): string {
		return `${value.toFixed(decimals)}%`;
	}

	export function formatNumber(value: number, decimals = 2): string {
		return value.toLocaleString("en-US", {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals,
		});
	}

	export function convertCurrency(
		amount: number,
		fromCurrency: string,
		toCurrency: string,
		exchangeRates: Record<string, number>,
	): number {
		if (fromCurrency === toCurrency) return amount;

		const fromRate = exchangeRates[fromCurrency] || 1;
		const toRate = exchangeRates[toCurrency] || 1;

		return (amount / fromRate) * toRate;
	}

	export function roundToTwoDecimals(amount: number): number {
		return Math.round(amount * 100) / 100;
	}

	export function isValidAmount(amount: number): boolean {
		return !Number.isNaN(amount) && Number.isFinite(amount) && amount >= 0;
	}

	export function calculateTax(amount: number, taxRate: number): number {
		return roundToTwoDecimals(amount * (taxRate / 100));
	}

	export function calculateTip(amount: number, tipPercentage: number): number {
		return roundToTwoDecimals(amount * (tipPercentage / 100));
	}

	export function calculateDiscount(
		originalAmount: number,
		discountPercentage: number,
	): number {
		const discountAmount = originalAmount * (discountPercentage / 100);
		return roundToTwoDecimals(originalAmount - discountAmount);
	}
}
