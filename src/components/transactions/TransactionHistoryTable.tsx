import { useState } from "react";
import type { Transaction } from "../../types/finance";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { LoadingSpinner } from "../ui/loading-spinner";
import { TableSkeleton } from "../ui/skeleton";

interface TransactionHistoryTableProps {
	transactions: Transaction[];
	loading?: boolean;
	onEdit?: (transaction: Transaction) => void;
	onDelete?: (id: string) => void;
	onUpdateStatus?: (
		id: string,
		status: Transaction["status"],
		errorMessage?: string,
	) => void;
	onRetryTransaction?: (id: string) => void;
	sortBy: "date" | "amount" | "description";
	sortOrder: "asc" | "desc";
	onSort: (field: "date" | "amount" | "description") => void;
	currentPage: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
}

export function TransactionHistoryTable({
	transactions,
	loading,
	onEdit,
	onDelete,
	onUpdateStatus,
	onRetryTransaction,
	sortBy,
	sortOrder,
	onSort,
	currentPage,
	itemsPerPage,
	onPageChange,
}: TransactionHistoryTableProps) {
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		}).format(new Date(date));
	};

	const getTypeColor = (type: Transaction["type"]) => {
		switch (type) {
			case "income":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
			case "expense":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
			case "transfer":
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
			default:
				return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
		}
	};

	const getStatusColor = (status: Transaction["status"]) => {
		switch (status) {
			case "completed":
				return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
			case "pending":
				return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
			case "failed":
				return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
			case "cancelled":
				return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
			default:
				return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		}
	};

	const getStatusIcon = (status: Transaction["status"]) => {
		switch (status) {
			case "completed":
				return "✅";
			case "pending":
				return "⏳";
			case "failed":
				return "❌";
			case "cancelled":
				return "🚫";
			default:
				return "📋";
		}
	};

	const getSortIcon = (field: string) => {
		if (sortBy !== field) return "↕️";
		return sortOrder === "asc" ? "↑" : "↓";
	};

	const handleDelete = async (id: string) => {
		if (!onDelete) return;
		setDeletingId(id);
		try {
			await onDelete(id);
		} finally {
			setDeletingId(null);
		}
	};

	// Calculate pagination
	const totalPages = Math.ceil(transactions.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedTransactions = transactions.slice(startIndex, endIndex);

	if (loading) {
		return (
			<Card className="bg-card/60 backdrop-blur-sm border-border/50">
				<CardHeader>
					<CardTitle className="font-mono uppercase tracking-wider">
						Transaction History
					</CardTitle>
				</CardHeader>
				<CardContent>
					<TableSkeleton columns={8} rows={itemsPerPage} />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-card/60 backdrop-blur-sm border-border/50">
			<CardHeader>
				<CardTitle className="font-mono uppercase tracking-wider">
					Transaction History
				</CardTitle>
			</CardHeader>
			<CardContent>
				{transactions.length === 0 ? (
					<div className="text-center py-12">
						<div className="text-6xl mb-4">💳</div>
						<h3 className="text-lg font-semibold mb-2">
							No transactions found
						</h3>
						<p className="text-muted-foreground">
							Start by adding your first transaction or adjust your filters.
						</p>
					</div>
				) : (
					<>
						{/* Desktop Table */}
						<div className="hidden md:block">
							<div className="overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-border/50">
											<th className="text-left p-3">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onSort("date")}
													className="font-mono text-xs uppercase tracking-wider hover:bg-muted/50"
												>
													Date {getSortIcon("date")}
												</Button>
											</th>
											<th className="text-left p-3">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onSort("description")}
													className="font-mono text-xs uppercase tracking-wider hover:bg-muted/50"
												>
													Description {getSortIcon("description")}
												</Button>
											</th>
											<th className="text-left p-3">
												<span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
													Category
												</span>
											</th>
											<th className="text-left p-3">
												<span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
													Account
												</span>
											</th>
											<th className="text-right p-3">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onSort("amount")}
													className="font-mono text-xs uppercase tracking-wider hover:bg-muted/50"
												>
													Amount {getSortIcon("amount")}
												</Button>
											</th>
											<th className="text-left p-3">
												<span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
													Type
												</span>
											</th>
											<th className="text-left p-3">
												<span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
													Status
												</span>
											</th>
											<th className="text-right p-3">
												<span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
													Actions
												</span>
											</th>
										</tr>
									</thead>
									<tbody>
										{paginatedTransactions.map((transaction) => (
											<tr
												key={transaction.id}
												className="border-b border-border/30 hover:bg-muted/30 transition-colors"
											>
												<td className="p-3 font-mono text-sm">
													{formatDate(transaction.date)}
												</td>
												<td className="p-3">
													<div className="font-medium">
														{transaction.description}
													</div>
													{transaction.note && (
														<div className="text-xs text-muted-foreground mt-1">
															{transaction.note}
														</div>
													)}
												</td>
												<td className="p-3">
													<Badge variant="outline" className="text-xs">
														{transaction.category}
													</Badge>
												</td>
												<td className="p-3 text-sm text-muted-foreground">
													{transaction.account}
												</td>
												<td className="p-3 text-right">
													<span
														className={`font-mono font-semibold ${
															transaction.type === "income"
																? "text-green-600 dark:text-green-400"
																: transaction.type === "expense"
																	? "text-red-600 dark:text-red-400"
																	: "text-blue-600 dark:text-blue-400"
														}`}
													>
														{transaction.type === "expense" ? "-" : "+"}
														{formatCurrency(Math.abs(transaction.amount))}
													</span>
												</td>
												<td className="p-3">
													<Badge className={getTypeColor(transaction.type)}>
														{transaction.type}
													</Badge>
												</td>
												<td className="p-3">
													<Badge
														className={getStatusColor(
															transaction.status || "pending",
														)}
													>
														<span className="mr-1">
															{getStatusIcon(transaction.status || "pending")}
														</span>
														{transaction.status || "pending"}
													</Badge>
												</td>
												<td className="p-3 text-right">
													<div className="flex items-center justify-end space-x-1">
														{onEdit && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => onEdit(transaction)}
																className="h-8 w-8 p-0"
																title="Edit transaction"
															>
																✏️
															</Button>
														)}
														{onRetryTransaction &&
															transaction.status === "failed" && (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		onRetryTransaction(transaction.id)
																	}
																	className="h-8 w-8 p-0 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950"
																	title="Retry failed transaction"
																>
																	🔄
																</Button>
															)}
														{onUpdateStatus &&
															transaction.status === "pending" && (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		onUpdateStatus(transaction.id, "completed")
																	}
																	className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
																	title="Mark as completed"
																>
																	✅
																</Button>
															)}
														{onUpdateStatus &&
															transaction.status === "pending" && (
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		onUpdateStatus(transaction.id, "cancelled")
																	}
																	className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-950"
																	title="Cancel transaction"
																>
																	🚫
																</Button>
															)}
														{onDelete && (
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleDelete(transaction.id)}
																disabled={deletingId === transaction.id}
																className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
																title="Delete transaction"
															>
																{deletingId === transaction.id ? (
																	<LoadingSpinner size="sm" />
																) : (
																	"🗑️"
																)}
															</Button>
														)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>

						{/* Mobile Cards */}
						<div className="md:hidden space-y-4">
							{paginatedTransactions.map((transaction) => (
								<Card key={transaction.id} className="border-border/50">
									<CardContent className="p-4">
										<div className="flex items-start justify-between mb-3">
											<div className="flex-1">
												<div className="font-medium mb-1">
													{transaction.description}
												</div>
												<div className="text-xs text-muted-foreground font-mono">
													{formatDate(transaction.date)}
												</div>
											</div>
											<div className="text-right">
												<div
													className={`font-mono font-semibold text-lg ${
														transaction.type === "income"
															? "text-green-600 dark:text-green-400"
															: transaction.type === "expense"
																? "text-red-600 dark:text-red-400"
																: "text-blue-600 dark:text-blue-400"
													}`}
												>
													{transaction.type === "expense" ? "-" : "+"}
													{formatCurrency(Math.abs(transaction.amount))}
												</div>
											</div>
										</div>

										<div className="flex items-center justify-between mb-3">
											<div className="flex items-center space-x-2 flex-wrap gap-1">
												<Badge variant="outline" className="text-xs">
													{transaction.category}
												</Badge>
												<Badge className={getTypeColor(transaction.type)}>
													{transaction.type}
												</Badge>
												<Badge
													className={getStatusColor(
														transaction.status || "pending",
													)}
												>
													<span className="mr-1">
														{getStatusIcon(transaction.status || "pending")}
													</span>
													{transaction.status || "pending"}
												</Badge>
											</div>
											<div className="text-xs text-muted-foreground">
												{transaction.account}
											</div>
										</div>

										{transaction.note && (
											<div className="text-xs text-muted-foreground mb-3 p-2 bg-muted/30 rounded">
												{transaction.note}
											</div>
										)}

										<div className="flex items-center justify-end space-x-2 flex-wrap gap-1">
											{onEdit && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => onEdit(transaction)}
													className="text-xs"
												>
													✏️ Edit
												</Button>
											)}
											{onRetryTransaction &&
												transaction.status === "failed" && (
													<Button
														variant="outline"
														size="sm"
														onClick={() => onRetryTransaction(transaction.id)}
														className="text-xs text-yellow-600 hover:text-yellow-700 border-yellow-200 hover:border-yellow-300"
													>
														🔄 Retry
													</Button>
												)}
											{onUpdateStatus && transaction.status === "pending" && (
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														onUpdateStatus(transaction.id, "completed")
													}
													className="text-xs text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
												>
													✅ Complete
												</Button>
											)}
											{onUpdateStatus && transaction.status === "pending" && (
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														onUpdateStatus(transaction.id, "cancelled")
													}
													className="text-xs text-gray-600 hover:text-gray-700 border-gray-200 hover:border-gray-300"
												>
													🚫 Cancel
												</Button>
											)}
											{onDelete && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => handleDelete(transaction.id)}
													disabled={deletingId === transaction.id}
													className="text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
												>
													{deletingId === transaction.id ? (
														<>
															<LoadingSpinner size="sm" className="mr-2" />
															Deleting...
														</>
													) : (
														"🗑️ Delete"
													)}
												</Button>
											)}
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						{/* Pagination */}
						{totalPages > 1 && (
							<div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
								<div className="text-sm text-muted-foreground font-mono">
									Showing {startIndex + 1}-
									{Math.min(endIndex, transactions.length)} of{" "}
									{transactions.length} transactions
								</div>
								<div className="flex items-center space-x-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => onPageChange(currentPage - 1)}
										disabled={currentPage === 1}
										className="font-mono"
									>
										← Previous
									</Button>

									<div className="flex items-center space-x-1">
										{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
											const pageNum =
												currentPage <= 3 ? i + 1 : currentPage - 2 + i;
											if (pageNum > totalPages) return null;

											return (
												<Button
													key={`page-${pageNum}`}
													variant={
														currentPage === pageNum ? "default" : "outline"
													}
													size="sm"
													onClick={() => onPageChange(pageNum)}
													className="w-8 h-8 p-0 font-mono"
												>
													{pageNum}
												</Button>
											);
										})}
									</div>

									<Button
										variant="outline"
										size="sm"
										onClick={() => onPageChange(currentPage + 1)}
										disabled={currentPage === totalPages}
										className="font-mono"
									>
										Next →
									</Button>
								</div>
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
