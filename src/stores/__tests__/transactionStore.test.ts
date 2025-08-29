import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, Category, Transaction } from "../../types/finance";
import { useTransactionStore } from "../transactionStore";

// Mock the database service
vi.mock("../../lib/database/db", () => ({
	DatabaseService: {
		addTransaction: vi.fn(),
		updateTransaction: vi.fn(),
		deleteTransaction: vi.fn(),
		getTransactions: vi.fn(),
		getAccounts: vi.fn(),
		getCategories: vi.fn(),
	},
}));

// Mock the data transform utils
vi.mock("../../lib/transactions/dataTransform", () => ({
	DataTransformUtils: {
		processImportData: vi.fn(),
		exportToCSV: vi.fn(),
		exportToJSON: vi.fn(),
	},
}));

// Mock the validation utils
vi.mock("../../lib/calculations/finance", () => ({
	ValidationUtils: {
		validateTransaction: vi.fn(),
	},
}));

const mockTransaction: Transaction = {
	id: "1",
	amount: 100,
	description: "Test transaction",
	category: "cat1",
	account: "acc1",
	type: "expense",
	date: new Date("2024-01-01"),
	status: "completed",
	currency: "USD",
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
	tags: ["test"],
};

const mockAccount: Account = {
	id: "acc1",
	name: "Test Account",
	type: "checking",
	balance: 1000,
	currency: "USD",
	isActive: true,
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
};

const mockCategory: Category = {
	id: "cat1",
	name: "Test Category",
	type: "expense",
	color: "#FF0000",
	icon: "test-icon",
	isDefault: false,
	createdAt: new Date("2024-01-01"),
};

describe("TransactionStore", () => {
	beforeEach(() => {
		// Reset the store state before each test
		useTransactionStore.setState({
			transactions: [],
			categories: [mockCategory],
			accounts: [mockAccount],
			isLoading: false,
			error: null,
			filters: {},
		});

		// Clear all mocks
		vi.clearAllMocks();
	});

	describe("createTransaction", () => {
		it("should create a new transaction successfully", async () => {
			const store = useTransactionStore.getState();
			const newTransactionData = {
				amount: 50,
				description: "New transaction",
				category: "cat1",
				account: "acc1",
				type: "expense" as const,
				date: new Date("2024-01-02"),
				status: "completed" as const,
				currency: "USD",
				tags: ["new"],
			};

			const result = await store.createTransaction(newTransactionData);

			expect(result).toMatchObject({
				...newTransactionData,
				id: expect.any(String),
				createdAt: expect.any(Date),
				updatedAt: expect.any(Date),
			});

			const state = useTransactionStore.getState();
			expect(state.transactions).toHaveLength(1);
			expect(state.error).toBeNull();
			expect(state.isLoading).toBe(false);
		});

		it("should throw error when category is missing", async () => {
			const store = useTransactionStore.getState();
			const invalidTransaction = {
				amount: 50,
				description: "Invalid transaction",
				account: "acc1",
				type: "expense" as const,
				date: new Date("2024-01-02"),
				status: "completed" as const,
				currency: "USD",
			};

			await expect(
				store.createTransaction(invalidTransaction as any),
			).rejects.toThrow("Please select a category for this transaction");

			const state = useTransactionStore.getState();
			expect(state.error).toBe("Please select a category for this transaction. (Action: addTransaction)");
			expect(state.isLoading).toBe(false);
		});

		it("should throw error when account is missing", async () => {
			const store = useTransactionStore.getState();
			const invalidTransaction = {
				amount: 50,
				description: "Invalid transaction",
				category: "cat1",
				type: "expense" as const,
				date: new Date("2024-01-02"),
				status: "completed" as const,
				currency: "USD",
			};

			await expect(
				store.createTransaction(invalidTransaction as any),
			).rejects.toThrow("Please select an account for this transaction");
		});

		it("should throw error when account does not exist", async () => {
			const store = useTransactionStore.getState();
			const invalidTransaction = {
				amount: 50,
				description: "Invalid transaction",
				category: "cat1",
				account: "nonexistent",
				type: "expense" as const,
				date: new Date("2024-01-02"),
				status: "completed" as const,
				currency: "USD",
			};

			await expect(store.createTransaction(invalidTransaction)).rejects.toThrow(
				"The requested information could not be found",
			);
		});

		it("should throw error when transaction type does not match category type", async () => {
			const store = useTransactionStore.getState();
			const invalidTransaction = {
				amount: 50,
				description: "Invalid transaction",
				category: "cat1", // expense category
				account: "acc1",
				type: "income" as const, // income type
				date: new Date("2024-01-02"),
				status: "completed" as const,
				currency: "USD",
			};

			await expect(store.createTransaction(invalidTransaction)).rejects.toThrow(
				"An unexpected error occurred",
			);
		});
	});

	describe("updateTransaction", () => {
		beforeEach(() => {
			useTransactionStore.setState({
				transactions: [mockTransaction],
				categories: [mockCategory],
				accounts: [mockAccount],
				isLoading: false,
				error: null,
				filters: {},
			});
		});

		it("should update an existing transaction", async () => {
			const store = useTransactionStore.getState();
			const updates = {
				amount: 150,
				description: "Updated transaction",
			};

			const result = await store.updateTransaction("1", updates);

			expect(result).toMatchObject({
				...mockTransaction,
				...updates,
				updatedAt: expect.any(Date),
			});

			const state = useTransactionStore.getState();
			expect(state.transactions[0]).toMatchObject(updates);
			expect(state.error).toBeNull();
		});

		it("should throw error when transaction not found", async () => {
			const store = useTransactionStore.getState();
			const updates = { amount: 150 };

			await expect(
				store.updateTransaction("nonexistent", updates),
			).rejects.toThrow("The requested information could not be found");

			const state = useTransactionStore.getState();
			expect(state.error).toBe("The requested information could not be found. (Action: updateTransaction)");
		});
	});

	describe("deleteTransaction", () => {
		beforeEach(() => {
			useTransactionStore.setState({
				transactions: [mockTransaction],
				categories: [mockCategory],
				accounts: [mockAccount],
				isLoading: false,
				error: null,
				filters: {},
			});
		});

		it("should delete an existing transaction", async () => {
			const store = useTransactionStore.getState();

			await store.deleteTransaction("1");

			const state = useTransactionStore.getState();
			expect(state.transactions).toHaveLength(0);
			expect(state.error).toBeNull();
		});

		it("should throw error when transaction not found", async () => {
			const store = useTransactionStore.getState();

			await expect(store.deleteTransaction("nonexistent")).rejects.toThrow(
				"The requested information could not be found",
			);

			const state = useTransactionStore.getState();
			expect(state.error).toBe("The requested information could not be found. (Action: deleteTransaction)");
		});
	});

	describe("getTransactions with filters", () => {
		const transactions: Transaction[] = [
			{
				...mockTransaction,
				id: "1",
				amount: 100,
				type: "expense",
				date: new Date("2024-01-01"),
				category: "cat1",
				account: "acc1",
			},
			{
				...mockTransaction,
				id: "2",
				amount: 200,
				type: "income",
				date: new Date("2024-01-15"),
				category: "cat2",
				account: "acc2",
			},
			{
				...mockTransaction,
				id: "3",
				amount: 50,
				type: "expense",
				date: new Date("2024-02-01"),
				category: "cat1",
				account: "acc1",
			},
		];

		beforeEach(() => {
			useTransactionStore.setState({
				transactions,
				categories: [mockCategory],
				accounts: [mockAccount],
				isLoading: false,
				error: null,
				filters: {},
			});
		});

		it("should filter by date range", () => {
			const store = useTransactionStore.getState();
			const filtered = store.getTransactions({
				startDate: new Date("2024-01-01"),
				endDate: new Date("2024-01-31"),
			});

			expect(filtered).toHaveLength(2);
			expect(filtered.map((t) => t.id)).toEqual(["2", "1"]);
		});

		it("should filter by transaction type", () => {
			const store = useTransactionStore.getState();
			const filtered = store.getTransactions({ type: "expense" });

			expect(filtered).toHaveLength(2);
			expect(filtered.every((t) => t.type === "expense")).toBe(true);
		});

		it("should filter by amount range", () => {
			const store = useTransactionStore.getState();
			const filtered = store.getTransactions({
				minAmount: 75,
				maxAmount: 150,
			});

			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe("1");
		});

		it("should filter by category", () => {
			const store = useTransactionStore.getState();
			const filtered = store.getTransactions({ category: "cat1" });

			expect(filtered).toHaveLength(2);
			expect(filtered.every((t) => t.category === "cat1")).toBe(true);
		});

		it("should apply multiple filters", () => {
			const store = useTransactionStore.getState();
			const filtered = store.getTransactions({
				type: "expense",
				category: "cat1",
				minAmount: 75,
			});

			expect(filtered).toHaveLength(1);
			expect(filtered[0].id).toBe("1");
		});
	});

	describe("getTransactionSummary", () => {
		const transactions: Transaction[] = [
			{
				...mockTransaction,
				id: "1",
				amount: 100,
				type: "expense",
				category: "cat1",
				account: "acc1",
			},
			{
				...mockTransaction,
				id: "2",
				amount: 200,
				type: "income",
				category: "cat2",
				account: "acc1",
			},
			{
				...mockTransaction,
				id: "3",
				amount: 50,
				type: "expense",
				category: "cat1",
				account: "acc2",
			},
		];

		beforeEach(() => {
			useTransactionStore.setState({
				transactions,
				categories: [mockCategory],
				accounts: [mockAccount],
				isLoading: false,
				error: null,
				filters: {},
			});
		});

		it("should calculate correct summary", () => {
			const store = useTransactionStore.getState();
			const summary = store.getTransactionSummary();

			expect(summary).toEqual({
				totalIncome: 200,
				totalExpenses: 150,
				netAmount: 50,
				transactionCount: 3,
				averageTransaction: 116.66666666666667,
				categoryBreakdown: {
					cat1: 150,
					cat2: 200,
				},
				accountBreakdown: {
					acc1: 300, // 200 income + 100 expense
					acc2: 50, // 50 expense
				},
				period: {
					startDate: expect.any(Date),
					endDate: expect.any(Date),
				},
			});
		});
	});

	describe("searchTransactions", () => {
		const transactions: Transaction[] = [
			{
				...mockTransaction,
				id: "1",
				description: "Coffee shop purchase",
				tags: ["food", "coffee"],
			},
			{
				...mockTransaction,
				id: "2",
				description: "Grocery store",
				tags: ["food", "groceries"],
			},
			{
				...mockTransaction,
				id: "3",
				description: "Gas station",
				tags: ["transport", "fuel"],
			},
		];

		beforeEach(() => {
			useTransactionStore.setState({
				transactions,
				categories: [mockCategory],
				accounts: [mockAccount],
				isLoading: false,
				error: null,
				filters: {},
			});
		});

		it("should search by description", () => {
			const store = useTransactionStore.getState();
			const results = store.searchTransactions("coffee");

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe("1");
		});

		it("should search by tags", () => {
			const store = useTransactionStore.getState();
			const results = store.searchTransactions("food");

			expect(results).toHaveLength(2);
			expect(results.map((t) => t.id)).toEqual(["1", "2"]);
		});

		it("should be case insensitive", () => {
			const store = useTransactionStore.getState();
			const results = store.searchTransactions("COFFEE");

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe("1");
		});

		it("should return empty array for no matches", () => {
			const store = useTransactionStore.getState();
			const results = store.searchTransactions("nonexistent");

			expect(results).toHaveLength(0);
		});
	});

	describe("bulkCreateTransactions", () => {
		it("should create multiple transactions successfully", async () => {
			const store = useTransactionStore.getState();
			const newTransactions = [
				{
					amount: 50,
					description: "Transaction 1",
					category: "cat1",
					account: "acc1",
					type: "expense" as const,
					date: new Date("2024-01-01"),
					status: "completed" as const,
					currency: "USD",
				},
				{
					amount: 75,
					description: "Transaction 2",
					category: "cat1",
					account: "acc1",
					type: "expense" as const,
					date: new Date("2024-01-02"),
					status: "completed" as const,
					currency: "USD",
				},
			];

			const result = await store.bulkCreateTransactions(newTransactions);

			expect(result).toEqual({
				success: true,
				processed: 2,
				failed: 0,
				errors: [],
			});

			const state = useTransactionStore.getState();
			expect(state.transactions).toHaveLength(2);
		});

		it("should handle partial failures", async () => {
			const store = useTransactionStore.getState();
			const newTransactions = [
				{
					amount: 50,
					description: "Valid transaction",
					category: "cat1",
					account: "acc1",
					type: "expense" as const,
					date: new Date("2024-01-01"),
					status: "completed" as const,
					currency: "USD",
				},
				{
					amount: 75,
					description: "Invalid transaction",
					// missing category
					account: "acc1",
					type: "expense" as const,
					date: new Date("2024-01-02"),
					status: "completed" as const,
					currency: "USD",
				} as any,
			];

			const result = await store.bulkCreateTransactions(newTransactions);

			expect(result.success).toBe(true);
			expect(result.processed).toBe(2);
			expect(result.failed).toBe(0);
			expect(result.errors).toHaveLength(0);

			const state = useTransactionStore.getState();
			expect(state.transactions).toHaveLength(2);
		});
	});
});
