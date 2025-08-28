import { describe, expect, it } from "vitest";
import type { Account, Budget, Transaction } from "../../types/finance";
import { FinanceCalculations, ValidationUtils } from "../calculations/finance";

describe("FinanceCalculations", () => {
	const mockTransactions: Transaction[] = [
		{
			id: "1",
			amount: 1000,
			type: "income",
			category: "salary",
			description: "Monthly salary",
			date: new Date("2024-01-01"),
			account: "checking",
			currency: "MYR",
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			id: "2",
			amount: 500,
			type: "expense",
			category: "groceries",
			description: "Weekly groceries",
			date: new Date("2024-01-02"),
			account: "checking",
			currency: "MYR",
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			id: "3",
			amount: 300,
			type: "expense",
			category: "utilities",
			description: "Electric bill",
			date: new Date("2024-01-10"),
			account: "checking",
			currency: "MYR",
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	];

	describe("calculateTotalIncome", () => {
		it("should calculate total income correctly", () => {
			const income = FinanceCalculations.calculateTotalIncome(mockTransactions);
			expect(income).toBe(1000);
		});

		it("should return 0 for transactions with no income", () => {
			const expenseOnlyTransactions = mockTransactions.filter(
				(t) => t.type === "expense",
			);
			const income = FinanceCalculations.calculateTotalIncome(
				expenseOnlyTransactions,
			);
			expect(income).toBe(0);
		});

		it("should filter by date range", () => {
			const startDate = new Date("2024-01-01");
			const endDate = new Date("2024-01-01");
			const income = FinanceCalculations.calculateTotalIncome(
				mockTransactions,
				startDate,
				endDate,
			);
			expect(income).toBe(1000);
		});
	});

	describe("calculateTotalExpenses", () => {
		it("should calculate total expenses correctly", () => {
			const expenses =
				FinanceCalculations.calculateTotalExpenses(mockTransactions);
			expect(expenses).toBe(800);
		});

		it("should return 0 for transactions with no expenses", () => {
			const incomeOnlyTransactions = mockTransactions.filter(
				(t) => t.type === "income",
			);
			const expenses = FinanceCalculations.calculateTotalExpenses(
				incomeOnlyTransactions,
			);
			expect(expenses).toBe(0);
		});
	});

	describe("calculateCashFlow", () => {
		it("should calculate cash flow correctly", () => {
			const cashFlow = FinanceCalculations.calculateCashFlow(mockTransactions);
			expect(cashFlow).toBe(200); // 1000 income - 800 expenses
		});

		it("should handle negative cash flow", () => {
			const negativeTransactions: Transaction[] = [
				{
					id: "1",
					amount: 100,
					type: "income",
					category: "salary",
					description: "Small income",
					date: new Date("2024-01-01"),
					account: "checking",
					currency: "MYR",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "2",
					amount: 500,
					type: "expense",
					category: "rent",
					description: "Monthly rent",
					date: new Date("2024-01-02"),
					account: "checking",
					currency: "MYR",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];
			const cashFlow =
				FinanceCalculations.calculateCashFlow(negativeTransactions);
			expect(cashFlow).toBe(-400);
		});
	});

	describe("calculateNetWorth", () => {
		it("should calculate net worth correctly", () => {
			const accounts: Account[] = [
				{
					id: "1",
					name: "Checking",
					type: "checking",
					balance: 1000,
					currency: "USD",
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "2",
					name: "Credit Card",
					type: "credit",
					balance: 500,
					currency: "USD",
					isActive: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];
			const netWorth = FinanceCalculations.calculateNetWorth(accounts);
			expect(netWorth).toBe(500); // 1000 - 500 (credit is subtracted)
		});
	});
});

describe("ValidationUtils", () => {
	describe("validateTransaction", () => {
		it("should validate a correct transaction", () => {
			const transaction = {
				amount: 100,
				type: "expense" as const,
				category: "groceries",
				description: "Weekly groceries",
				account: "checking",
				date: new Date(),
			};

			const errors = ValidationUtils.validateTransaction(transaction);
			expect(errors).toEqual([]);
		});

		it("should return errors for invalid amount", () => {
			const transaction = {
				amount: -100,
				type: "expense" as const,
				category: "groceries",
				description: "Invalid transaction",
				account: "checking",
				date: new Date(),
			};

			const errors = ValidationUtils.validateTransaction(transaction);
			expect(errors.some((e) => e.message === "Amount must be positive")).toBe(
				true,
			);
		});

		it("should return errors for missing required fields", () => {
			const transaction = {
				amount: 100,
				type: "expense" as const,
				category: "",
				description: "",
				account: "",
				date: new Date(),
			};

			const errors = ValidationUtils.validateTransaction(transaction);
			expect(errors.some((e) => e.field === "category")).toBe(true);
			expect(errors.some((e) => e.field === "description")).toBe(true);
			expect(errors.some((e) => e.field === "account")).toBe(true);
		});

		it("should return errors for missing required fields", () => {
			const transaction = {
				amount: 100,
				type: "expense" as const,
				category: "",
				description: "",
				account: "",
			};

			const errors = ValidationUtils.validateTransaction(transaction);
			expect(errors.some((e) => e.field === "category")).toBe(true);
			expect(errors.some((e) => e.field === "description")).toBe(true);
			expect(errors.some((e) => e.field === "account")).toBe(true);
			expect(errors.some((e) => e.field === "date")).toBe(true);
		});
	});

	describe("validateBudget", () => {
		it("should validate a correct budget", () => {
			const budget = {
				name: "Monthly Groceries",
				category: "groceries",
				amount: 500,
				period: "monthly" as const,
				startDate: new Date(),
			};

			const errors = ValidationUtils.validateBudget(budget);
			expect(errors).toEqual([]);
		});

		it("should return errors for invalid budget amount", () => {
			const budget = {
				name: "Invalid Budget",
				category: "groceries",
				amount: -100,
				period: "monthly" as const,
				startDate: new Date(),
			};

			const errors = ValidationUtils.validateBudget(budget);
			expect(errors.some((e) => e.field === "amount")).toBe(true);
		});

		it("should return errors for missing required fields", () => {
			const budget = {
				name: "",
				category: "",
				amount: 500,
				period: "monthly" as const,
				startDate: new Date(),
			};

			const errors = ValidationUtils.validateBudget(budget);
			expect(errors.some((e) => e.field === "name")).toBe(true);
			expect(errors.some((e) => e.field === "category")).toBe(true);
		});
	});
});
