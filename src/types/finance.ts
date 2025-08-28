export interface Transaction {
	id: string;
	amount: number;
	description: string;
	category: string;
	subcategory?: string;
	date: Date;
	type: "income" | "expense" | "transfer";
	account: string;
	tags?: string[];
	recurring?: RecurringTransaction;
	createdAt: Date;
	updatedAt: Date;

	// Transaction status management
	status: "pending" | "completed" | "cancelled" | "failed";
	processedAt?: Date;
	errorMessage?: string;

	// New fields to match the provided JSON format
	note?: string | null;
	currency: string;
	myr?: number; // Malaysian Ringgit amount
	incomeExpense?: "Income" | "Expense"; // Maps to the "Income/Expense" field
	account2?: number; // Maps to "Account_2" field
}

// Interface for the external JSON format used for import/export and backups
export interface ExternalTransactionFormat {
	Date: string;
	Account: string;
	Category: string;
	Subcategory?: string | null;
	Note?: string | null;
	MYR: number;
	"Income/Expense": "Income" | "Expense";
	Description?: string | null;
	Amount: number;
	Currency: string;
	Account_2: number;
}

export interface RecurringTransaction {
	frequency: "daily" | "weekly" | "monthly" | "yearly";
	interval: number; // e.g., every 2 weeks = frequency: 'weekly', interval: 2
	endDate?: Date;
	nextDue: Date;
}

export interface Account {
	id: string;
	name: string;
	type: "checking" | "savings" | "credit" | "investment" | "cash";
	balance: number;
	currency: string;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Category {
	id: string;
	name: string;
	type: "income" | "expense";
	color: string;
	icon?: string;
	subcategories?: Subcategory[];
	isDefault: boolean;
	createdAt: Date;
}

export interface Subcategory {
	id: string;
	name: string;
	categoryId: string;
	color?: string;
	icon?: string;
}

export interface FinancialSummary {
	totalIncome: number;
	totalExpenses: number;
	netWorth: number;
	cashFlow: number;
	period: "week" | "month" | "year";
	periodStart: Date;
	periodEnd: Date;
}

export interface SyncStatus {
	lastSync: Date | null;
	isOnline: boolean;
	isSyncing: boolean;
	hasConflicts: boolean;
	conflictCount: number;
	autoSync: boolean;
}

export interface UserPreferences {
	currency: string;
	dateFormat: string;
	theme: "light" | "dark" | "system";
	defaultAccount: string;

	syncSettings: {
		autoSync: boolean;
		syncInterval: number; // minutes
		backupRetention: number; // days
	};
}

export interface EncryptedData {
	data: string; // encrypted JSON string
	iv: string; // initialization vector
	timestamp: number;
}

export interface DataConflict {
	id: string;
	type: "transaction" | "account" | "category";
	localData: Transaction | Account | Category;
	cloudData: Transaction | Account | Category;
	conflictDate: Date;
	resolved: boolean;
}

export type ChartTimeframe = "7d" | "30d" | "90d" | "1y" | "all";

export interface ChartDataPoint {
	date: string;
	value: number;
	category?: string;
	label?: string;
}

// Report Types and Data Models
export type ReportType =
	| "financial-summary"
	| "transaction-analysis"
	| "category-breakdown"
	| "account-performance"
	| "cash-flow"
	| "budget-variance"
	| "trend-analysis"
	| "tax-summary";

export type TransactionType = Transaction["type"];

export type ReportPeriod =
	| "7d"
	| "30d"
	| "90d"
	| "6m"
	| "1y"
	| "ytd"
	| "custom";

export type ExportFormat = "pdf" | "csv" | "excel" | "json";

export interface DateRange {
	startDate: Date;
	endDate: Date;
	label?: string;
}

export interface ReportFilters {
	dateRange: DateRange;
	accounts?: string[];
	categories?: string[];
	transactionTypes?: Transaction["type"][];
	amountRange?: {
		min?: number;
		max?: number;
	};
	tags?: string[];
	status?: Transaction["status"][];
}

export interface ReportMetadata {
	id: string;
	name: string;
	type: ReportType;
	description: string;
	generatedAt: Date;
	generatedBy?: string;
	filters: ReportFilters;
	parameters?: Record<string, string | number | boolean>;
}

export interface FinancialSummaryReport {
	metadata: ReportMetadata;
	summary: {
		totalIncome: number;
		totalExpenses: number;
		netIncome: number;
		cashFlow: number;
		totalBalance: number;
		averageDailySpending: number;
		largestExpense: Transaction;
		largestIncome: Transaction;
	};
	periodComparison?: {
		previousPeriod: {
			income: number;
			expenses: number;
			netIncome: number;
		};
		changePercentage: {
			income: number;
			expenses: number;
			netIncome: number;
		};
	};
}

export interface TransactionAnalysisReport {
	metadata: ReportMetadata;
	transactionStats: {
		totalTransactions: number;
		averageTransactionAmount: number;
		medianTransactionAmount: number;
		transactionFrequency: {
			daily: number;
			weekly: number;
			monthly: number;
		};
	};
	topTransactions: {
		largestExpenses: Transaction[];
		largestIncomes: Transaction[];
		mostFrequentCategories: Array<{
			category: string;
			count: number;
			totalAmount: number;
		}>;
	};
	trendData: Array<{
		date: string;
		income: number;
		expenses: number;
		net: number;
		transactionCount: number;
	}>;
}

export interface CategoryBreakdownReport {
	metadata: ReportMetadata;
	incomeCategories: Array<{
		category: string;
		amount: number;
		percentage: number;
		transactionCount: number;
		averageAmount: number;
		subcategories?: Array<{
			name: string;
			amount: number;
			percentage: number;
		}>;
	}>;
	expenseCategories: Array<{
		category: string;
		amount: number;
		percentage: number;
		transactionCount: number;
		averageAmount: number;
		subcategories?: Array<{
			name: string;
			amount: number;
			percentage: number;
		}>;
	}>;
	chartData: Array<{
		category: string;
		value: number;
		color: string;
	}>;
}

export interface AccountPerformanceReport {
	metadata: ReportMetadata;
	accounts: Array<{
		id: string;
		name: string;
		type: Account["type"];
		startingBalance: number;
		endingBalance: number;
		netChange: number;
		changePercentage: number;
		totalInflows: number;
		totalOutflows: number;
		transactionCount: number;
		averageTransactionAmount: number;
		performanceScore: number;
	}>;
	overallPerformance: {
		totalNetWorth: number;
		netWorthChange: number;
		bestPerformingAccount: string;
		worstPerformingAccount: string;
	};
}

export interface CashFlowReport {
	metadata: ReportMetadata;
	cashFlowData: Array<{
		date: string;
		inflows: number;
		outflows: number;
		netFlow: number;
		cumulativeFlow: number;
		runningBalance: number;
	}>;
	projections?: Array<{
		date: string;
		projectedInflow: number;
		projectedOutflow: number;
		projectedBalance: number;
		confidenceLevel: number;
	}>;
	summary: {
		averageMonthlyInflow: number;
		averageMonthlyOutflow: number;
		cashFlowVolatility: number;
		longestPositiveStreak: number;
		longestNegativeStreak: number;
	};
}

export interface PerformanceMetrics {
	savingsRate: number;
	expenseRatio: number;
	incomeGrowthRate: number;
	expenseGrowthRate: number;
	financialHealthScore: number;
	budgetAdherence?: number;
	debtToIncomeRatio?: number;
	emergencyFundRatio?: number;
	investmentAllocation?: number;
}

export interface ReportSchedule {
	id: string;
	name: string;
	reportType: ReportType;
	filters: ReportFilters;
	frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
	nextRun: Date;
	lastRun?: Date;
	isActive: boolean;
	deliveryMethod: "email" | "download" | "both";
	recipients?: string[];
	format: ExportFormat;
	createdAt: Date;
	updatedAt: Date;
}

export interface UserPermissions {
	canViewReports: boolean;
	canExportReports: boolean;
	canScheduleReports: boolean;
	canViewSensitiveData: boolean;
	allowedReportTypes: ReportType[];
	allowedAccounts: string[];
	maxExportFrequency?: number; // per day
}

export interface ReportCache {
	id: string;
	reportType: ReportType;
	filtersHash: string;
	data:
		| FinancialSummaryReport
		| TransactionAnalysisReport
		| CategoryBreakdownReport
		| AccountPerformanceReport
		| CashFlowReport;
	generatedAt: Date;
	expiresAt: Date;
	hitCount: number;
}

export interface ValidationError {
	field: string;
	message: string;
	code: string;
}

export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
	errors?: ValidationError[];
}
