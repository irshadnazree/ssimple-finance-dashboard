import { useState } from "react";
import type { Transaction } from "../../types/finance";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

interface TransactionOperationsToolbarProps {
	selectedTransactions: Transaction[];
	onBulkDelete: (ids: string[]) => void;
	onBulkStatusUpdate: (ids: string[], status: Transaction["status"]) => void;
	onBulkCategoryUpdate: (ids: string[], categoryId: string) => void;
	onExportSelected: (transactions: Transaction[]) => void;
	onAddTransaction: () => void;
	onExportImport: () => void;
	loading?: boolean;
	categories: Array<{ id: string; name: string }>;
}

export function TransactionOperationsToolbar({
	selectedTransactions,
	onBulkDelete,
	onBulkStatusUpdate,
	onBulkCategoryUpdate,
	onExportSelected,
	onAddTransaction,
	onExportImport,
	loading = false,
	categories,
}: TransactionOperationsToolbarProps) {
	const [bulkAction, setBulkAction] = useState("");
	const [bulkStatus, setBulkStatus] =
		useState<Transaction["status"]>("completed");
	const [bulkCategory, setBulkCategory] = useState("");

	const hasSelection = selectedTransactions.length > 0;

	const handleBulkAction = () => {
		if (!hasSelection) return;

		const selectedIds = selectedTransactions.map((t) => t.id);

		switch (bulkAction) {
			case "delete":
				onBulkDelete(selectedIds);
				break;
			case "status":
				onBulkStatusUpdate(selectedIds, bulkStatus);
				break;
			case "category":
				if (bulkCategory) {
					onBulkCategoryUpdate(selectedIds, bulkCategory);
				}
				break;
			case "export":
				onExportSelected(selectedTransactions);
				break;
		}

		setBulkAction("");
	};

	return (
		<Card className="mb-6">
			<CardHeader className="pb-4">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="flex items-center gap-3">
						<CardTitle className="font-mono uppercase tracking-wider text-sm sm:text-base">
							Transaction Operations
						</CardTitle>
						{hasSelection && (
							<Badge variant="secondary" className="text-xs font-mono">
								{selectedTransactions.length} selected
							</Badge>
						)}
					</div>

					{/* Primary Actions */}
					<div className="flex flex-col sm:flex-row gap-2">
						<Button
							onClick={onAddTransaction}
							className="w-full sm:w-auto font-mono text-sm"
							disabled={loading}
						>
							💰 Add Transaction
						</Button>
						<Button
							variant="outline"
							onClick={onExportImport}
							className="w-full sm:w-auto font-mono text-sm"
							disabled={loading}
						>
							📊 Export/Import
						</Button>
					</div>
				</div>
			</CardHeader>

			{/* Bulk Operations */}
			<CardContent className="pt-0">
				<div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
					{/* Bulk Action Selection */}
					<div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						<div>
							<Label
								htmlFor="bulkAction"
								className="font-mono text-xs uppercase tracking-wider"
							>
								Bulk Action
							</Label>
							<Select
								id="bulkAction"
								value={bulkAction}
								onChange={(e) => setBulkAction(e.target.value)}
								disabled={!hasSelection || loading}
								className="mt-1"
							>
								<option value="">Select action...</option>
								<option value="delete">Delete Selected</option>
								<option value="status">Update Status</option>
								<option value="category">Change Category</option>
								<option value="export">Export Selected</option>
							</Select>
						</div>

						{/* Status Selection */}
						{bulkAction === "status" && (
							<div>
								<Label
									htmlFor="bulkStatus"
									className="font-mono text-xs uppercase tracking-wider"
								>
									New Status
								</Label>
								<Select
									id="bulkStatus"
									value={bulkStatus}
									onChange={(e) =>
										setBulkStatus(e.target.value as Transaction["status"])
									}
									className="mt-1"
								>
									<option value="completed">Completed</option>
									<option value="pending">Pending</option>
									<option value="failed">Failed</option>
									<option value="cancelled">Cancelled</option>
								</Select>
							</div>
						)}

						{/* Category Selection */}
						{bulkAction === "category" && (
							<div>
								<Label
									htmlFor="bulkCategory"
									className="font-mono text-xs uppercase tracking-wider"
								>
									New Category
								</Label>
								<Select
									id="bulkCategory"
									value={bulkCategory}
									onChange={(e) => setBulkCategory(e.target.value)}
									className="mt-1"
								>
									<option value="">Select category...</option>
									{categories.map((category) => (
										<option key={category.id} value={category.id}>
											{category.name}
										</option>
									))}
								</Select>
							</div>
						)}
					</div>

					{/* Execute Button */}
					<div className="w-full lg:w-auto">
						<Button
							onClick={handleBulkAction}
							disabled={
								!hasSelection ||
								!bulkAction ||
								loading ||
								(bulkAction === "category" && !bulkCategory)
							}
							variant={bulkAction === "delete" ? "destructive" : "default"}
							className="w-full lg:w-auto font-mono text-sm"
						>
							{bulkAction === "delete" && "🗑️ Delete"}
							{bulkAction === "status" && "🔄 Update Status"}
							{bulkAction === "category" && "🏷️ Change Category"}
							{bulkAction === "export" && "📤 Export"}
							{!bulkAction && "Execute"}
						</Button>
					</div>
				</div>

				{/* Selection Summary */}
				{hasSelection && (
					<div className="mt-4 p-3 bg-muted/50 rounded-lg">
						<div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
							<span>SELECTED: {selectedTransactions.length} transactions</span>
							<span>
								TOTAL: $
								{selectedTransactions
									.reduce((sum, t) => sum + Math.abs(t.amount), 0)
									.toFixed(2)}
							</span>
							<span>
								TYPES:{" "}
								{Array.from(
									new Set(selectedTransactions.map((t) => t.type)),
								).join(", ")}
							</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
