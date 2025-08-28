import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
	TransactionsContentGrid,
	TransactionsLayout,
	TransactionsSection,
	TransactionsToolbar,
} from "../components/layout";
import { ExportImportDialog } from "../components/transactions/ExportImportDialog";
import { TransactionFilters as TransactionFiltersComponent } from "../components/transactions/TransactionFilters";
import { TransactionForm } from "../components/transactions/TransactionForm";
import { TransactionHistoryTable } from "../components/transactions/TransactionHistoryTable";
import { TransactionOperationsToolbar } from "../components/transactions/TransactionOperationsToolbar";
import { TransactionStatistics } from "../components/transactions/TransactionStatistics";
import { TransactionSummary } from "../components/transactions/TransactionSummary";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { useToast } from "../lib/hooks/useToast";
import type {
	TransactionFilters,
	TransactionSummary as TransactionSummaryType,
} from "../stores/transactionStore";
import { useTransactionStore } from "../stores/transactionStore";
import type { Account, Category, Transaction } from "../types/finance";

export const Route = createFileRoute("/transactions")({
	component: Transactions,
});

function Transactions() {
	const { toast } = useToast();
	const {
		transactions: storeTransactions,
		categories: storeCategories,
		accounts: storeAccounts,
		isLoading,
		error: storeError,
		getTransactions,
		getTransactionSummary,
		createTransaction,
		updateTransaction,
		deleteTransaction,
		refreshTransactions,
		setLoading,
		setError,
	} = useTransactionStore();
	const [filteredTransactions, setFilteredTransactions] = useState<
		Transaction[]
	>([]);
	const [summary, setSummary] = useState<TransactionSummaryType | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingTransaction, setEditingTransaction] =
		useState<Transaction | null>(null);
	const [showExportImport, setShowExportImport] = useState(false);

	// Filter states
	const [filters, setFilters] = useState<TransactionFilters>({});
	const [searchTerm, setSearchTerm] = useState("");
	const [sortBy, setSortBy] = useState<"date" | "amount" | "description">(
		"date",
	);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(10);
	const [selectedTransactions, setSelectedTransactions] = useState<
		Transaction[]
	>([]);

	// Load initial data
	useEffect(() => {
		loadData();
	}, []);

	// Real-time status update functionality
	const updateTransactionStatus = useCallback(
		async (
			id: string,
			status: Transaction["status"],
			errorMessage?: string,
		) => {
			try {
				const updatedTransaction = await updateTransaction(id, { status });
				if (updatedTransaction) {
					// Update the filtered transactions
					setFilteredTransactions((prev) =>
						prev.map((t) => (t.id === id ? updatedTransaction : t)),
					);
					toast({
						variant: "success",
						title: "Status Updated",
						description: `Transaction status updated to ${status}.`,
					});
				}
			} catch (err) {
				console.error("Failed to update transaction status:", err);
				const errorMsg = "Failed to update transaction status";
				setError(errorMsg);
				toast({
					variant: "destructive",
					title: "Update Failed",
					description: err instanceof Error ? err.message : errorMsg,
				});
			}
		},
		[toast, updateTransaction, setError],
	);

	// Retry failed transaction
	const retryFailedTransaction = useCallback(
		async (id: string) => {
			try {
				const retryResult = await updateTransaction(id, { status: "pending" });
				if (retryResult) {
					// Update the filtered transactions
					setFilteredTransactions((prev) =>
						prev.map((t) => (t.id === id ? retryResult : t)),
					);
					toast({
						variant: "success",
						title: "Transaction Retried",
						description: "Transaction has been queued for retry.",
					});
				}
			} catch (err) {
				console.error("Failed to retry transaction:", err);
				const errorMsg = "Failed to retry transaction";
				setError(errorMsg);
				toast({
					variant: "destructive",
					title: "Retry Failed",
					description: err instanceof Error ? err.message : errorMsg,
				});
			}
		},
		[toast, updateTransaction, setError],
	);

	// Auto-refresh pending transactions
	useEffect(() => {
		const interval = setInterval(async () => {
			try {
				const pendingTransactions = storeTransactions.filter(
					(t) => t.status === "pending",
				);
				if (pendingTransactions.length > 0) {
					// Process pending transactions
					for (const transaction of pendingTransactions) {
						await updateTransaction(transaction.id, { status: "completed" });
					}
					// Reload data to get updated statuses
					loadData();
				}
			} catch (err) {
				console.error("Error processing pending transactions:", err);
			}
		}, 30000); // Check every 30 seconds

		return () => clearInterval(interval);
	}, [storeTransactions, updateTransaction]);

	const applyFiltersAndSearch = useCallback(() => {
		let filtered = [...storeTransactions];

		// Apply search filter
		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(transaction) =>
					transaction.description.toLowerCase().includes(term) ||
					transaction.category?.toLowerCase().includes(term) ||
					transaction.account?.toLowerCase().includes(term),
			);
		}

		// Apply filters
		if (filters.category) {
			filtered = filtered.filter((t) => t.category === filters.category);
		}
		if (filters.account) {
			filtered = filtered.filter((t) => t.account === filters.account);
		}
		if (filters.type) {
			filtered = filtered.filter((t) => t.type === filters.type);
		}
		if (filters.startDate) {
			const startDate = filters.startDate;
			filtered = filtered.filter((t) => new Date(t.date) >= startDate);
		}
		if (filters.endDate) {
			const endDate = filters.endDate;
			filtered = filtered.filter((t) => new Date(t.date) <= endDate);
		}
		if (filters.minAmount !== undefined) {
			const minAmount = filters.minAmount;
			filtered = filtered.filter((t) => t.amount >= minAmount);
		}
		if (filters.maxAmount !== undefined) {
			const maxAmount = filters.maxAmount;
			filtered = filtered.filter((t) => t.amount <= maxAmount);
		}

		// Apply sorting
		filtered.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (sortBy) {
				case "date":
					aValue = new Date(a.date).getTime();
					bValue = new Date(b.date).getTime();
					break;
				case "amount":
					aValue = a.amount;
					bValue = b.amount;
					break;
				case "description":
					aValue = a.description.toLowerCase();
					bValue = b.description.toLowerCase();
					break;
				default:
					aValue = new Date(a.date).getTime();
					bValue = new Date(b.date).getTime();
			}

			if (sortOrder === "asc") {
				return aValue > bValue ? 1 : -1;
			}
			return aValue < bValue ? 1 : -1;
		});

		setFilteredTransactions(filtered);
		setCurrentPage(1); // Reset to first page when filters change
	}, [storeTransactions, searchTerm, filters, sortBy, sortOrder]);

	// Apply filters and search
	useEffect(() => {
		applyFiltersAndSearch();
	}, [applyFiltersAndSearch]);

	const loadData = async () => {
		try {
			setLoading(true);
			setError(null);

			await refreshTransactions();

			const storeSummary = await getTransactionSummary();
			// Convert store summary to component expected format
			const summary: TransactionSummaryType = {
				totalIncome: storeSummary.totalIncome,
				totalExpenses: storeSummary.totalExpenses,
				netAmount: storeSummary.netAmount,
				transactionCount: storeSummary.transactionCount,
				averageTransaction: storeSummary.averageTransaction,
				categoryBreakdown: storeSummary.categoryBreakdown,
				accountBreakdown: storeSummary.accountBreakdown,
			};
			setSummary(summary);
		} catch (err) {
			const errorMsg =
				err instanceof Error ? err.message : "Failed to load data";
			setError(errorMsg);
			toast({
				variant: "destructive",
				title: "Loading Error",
				description: errorMsg,
			});
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteTransaction = async (id: string) => {
		try {
			await deleteTransaction(id);
			await loadData(); // Reload data after deletion
			toast({
				variant: "success",
				title: "Transaction Deleted",
				description: "Transaction has been successfully deleted.",
			});
		} catch (err) {
			const errorMsg =
				err instanceof Error ? err.message : "Failed to delete transaction";
			setError(errorMsg);
			toast({
				variant: "destructive",
				title: "Delete Failed",
				description: errorMsg,
			});
		}
	};

	const handleEditTransaction = (transaction: Transaction) => {
		setEditingTransaction(transaction);
		setShowForm(true);
	};

	const handleFormSubmit = async (transactionData: Partial<Transaction>) => {
		try {
			if (editingTransaction) {
				await updateTransaction(editingTransaction.id, transactionData);
			} else {
				await createTransaction(
					transactionData as Omit<
						Transaction,
						"id" | "createdAt" | "updatedAt"
					>,
				);
			}
			setShowForm(false);
			setEditingTransaction(null);
			await loadData(); // Reload data after form submission
		} catch (err) {
			throw new Error(
				err instanceof Error ? err.message : "Failed to save transaction",
			);
		}
	};

	const handleFormCancel = () => {
		setShowForm(false);
		setEditingTransaction(null);
	};

	// Bulk operations handlers
	const handleBulkDelete = async (ids: string[]) => {
		try {
			await Promise.all(ids.map((id) => deleteTransaction(id)));
			await loadData();
			setSelectedTransactions([]);
			toast({
				variant: "success",
				title: "Bulk Delete Successful",
				description: `${ids.length} transactions deleted.`,
			});
		} catch (err) {
			const errorMsg =
				err instanceof Error ? err.message : "Failed to delete transactions";
			setError(errorMsg);
			toast({
				variant: "destructive",
				title: "Bulk Delete Failed",
				description: errorMsg,
			});
		}
	};

	const handleBulkStatusUpdate = async (
		ids: string[],
		status: Transaction["status"],
	) => {
		try {
			await Promise.all(ids.map((id) => updateTransaction(id, { status })));
			await loadData();
			setSelectedTransactions([]);
			toast({
				variant: "success",
				title: "Bulk Status Update Successful",
				description: `${ids.length} transactions updated to ${status}.`,
			});
		} catch (err) {
			const errorMsg =
				err instanceof Error
					? err.message
					: "Failed to update transaction status";
			setError(errorMsg);
			toast({
				variant: "destructive",
				title: "Bulk Update Failed",
				description: errorMsg,
			});
		}
	};

	const handleBulkCategoryUpdate = async (
		ids: string[],
		categoryId: string,
	) => {
		try {
			await Promise.all(
				ids.map((id) => updateTransaction(id, { category: categoryId })),
			);
			await loadData();
			setSelectedTransactions([]);
			toast({
				variant: "success",
				title: "Bulk Category Update Successful",
				description: `${ids.length} transactions updated.`,
			});
		} catch (err) {
			const errorMsg =
				err instanceof Error
					? err.message
					: "Failed to update transaction categories";
			setError(errorMsg);
			toast({
				variant: "destructive",
				title: "Bulk Update Failed",
				description: errorMsg,
			});
		}
	};

	const handleExportSelected = (transactions: Transaction[]) => {
		const csvContent = [
			"Date,Description,Amount,Type,Category,Account,Status",
			...transactions.map(
				(t) =>
					`${t.date},"${t.description}",${t.amount},${t.type},${t.category || ""},${t.account || ""},${t.status}`,
			),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `selected-transactions-${new Date().toISOString().split("T")[0]}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		toast({
			variant: "success",
			title: "Export Successful",
			description: `${transactions.length} transactions exported.`,
		});
	};

	// Pagination
	const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const paginatedTransactions = filteredTransactions.slice(
		startIndex,
		startIndex + itemsPerPage,
	);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
							<p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
								Loading transactions...
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<TransactionsLayout>
			<TransactionsSection>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono uppercase">
							Transactions
						</h1>
						<p className="text-muted-foreground font-mono text-xs sm:text-sm uppercase tracking-wider">
							Manage your income and expenses
						</p>
					</div>
					<TransactionsToolbar>
						<Button
							onClick={() => setShowForm(true)}
							className="w-full sm:w-auto font-mono text-sm sm:text-base"
							disabled={isLoading}
						>
							💰 Add Transaction
						</Button>
						<Button
							variant="outline"
							onClick={() => setShowExportImport(true)}
							className="w-full sm:w-auto font-mono text-sm sm:text-base"
							disabled={isLoading}
						>
							📊 Export/Import
						</Button>
					</TransactionsToolbar>
				</div>
			</TransactionsSection>

			<TransactionsSection>
				{/* Error Alert */}
				{storeError && (
					<Alert className="mb-6">
						<AlertDescription>{storeError}</AlertDescription>
					</Alert>
				)}

				{/* Transaction Summary */}
				{summary && (
					<TransactionSummary summary={summary} loading={isLoading} />
				)}
				{!summary && isLoading && (
					<TransactionSummary
						summary={{
							totalIncome: 0,
							totalExpenses: 0,
							netAmount: 0,
							transactionCount: 0,
							averageTransaction: 0,
							categoryBreakdown: {},
							accountBreakdown: {},
						}}
						loading={true}
					/>
				)}
			</TransactionsSection>

			<TransactionsSection>
				{/* Transaction Operations Toolbar */}
				<TransactionOperationsToolbar
					selectedTransactions={selectedTransactions}
					onBulkDelete={handleBulkDelete}
					onBulkStatusUpdate={handleBulkStatusUpdate}
					onBulkCategoryUpdate={handleBulkCategoryUpdate}
					onExportSelected={handleExportSelected}
					onAddTransaction={() => setShowForm(true)}
					onExportImport={() => setShowExportImport(true)}
					categories={storeCategories}
					loading={isLoading}
				/>
			</TransactionsSection>

			<TransactionsContentGrid>
				{/* Transaction Statistics */}
				<TransactionStatistics
					transactions={filteredTransactions}
					loading={isLoading}
				/>

				{/* Transaction Filters */}
				<TransactionFiltersComponent
					filters={filters}
					onFiltersChange={setFilters}
					searchTerm={searchTerm}
					onSearchChange={setSearchTerm}
					accounts={storeAccounts}
					categories={storeCategories}
					loading={isLoading}
				/>
			</TransactionsContentGrid>

			<TransactionsSection>
				{/* Transaction History Table */}
				<TransactionHistoryTable
					transactions={filteredTransactions}
					loading={isLoading}
					onEdit={handleEditTransaction}
					onDelete={handleDeleteTransaction}
					onUpdateStatus={updateTransactionStatus}
					onRetryTransaction={retryFailedTransaction}
					sortBy={sortBy}
					sortOrder={sortOrder}
					onSort={(field) => {
						if (field === sortBy) {
							setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
						} else {
							setSortBy(field);
							setSortOrder("desc");
						}
					}}
					currentPage={currentPage}
					itemsPerPage={itemsPerPage}
					onPageChange={setCurrentPage}
				/>
			</TransactionsSection>

			{/* Transaction Form Modal */}
			{showForm && (
				<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4">
					<div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0">
						<TransactionForm
							transaction={editingTransaction}
							accounts={storeAccounts}
							categories={storeCategories}
							onSubmit={handleFormSubmit}
							onCancel={handleFormCancel}
							loading={isLoading}
						/>
					</div>
				</div>
			)}

			{/* Export/Import Dialog */}
			<ExportImportDialog
				isOpen={showExportImport}
				onClose={() => setShowExportImport(false)}
				onImportComplete={loadData}
				currentFilters={filters}
			/>
		</TransactionsLayout>
	);
}
