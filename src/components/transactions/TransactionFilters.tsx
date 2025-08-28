import { useState } from "react";
import type { TransactionFilters as TransactionFiltersType } from "../../stores/transactionStore";
import type { Account, Category, Transaction } from "../../types/finance";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";

interface TransactionFiltersProps {
	filters: TransactionFiltersType;
	onFiltersChange: (filters: TransactionFiltersType) => void;
	searchTerm: string;
	onSearchChange: (search: string) => void;
	accounts: Account[];
	categories: Category[];
	loading?: boolean;
}

export function TransactionFilters({
	filters,
	onFiltersChange,
	searchTerm,
	onSearchChange,
	accounts,
	categories,
	loading = false,
}: TransactionFiltersProps) {
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [minAmount, setMinAmount] = useState("");
	const [maxAmount, setMaxAmount] = useState("");

	const handleFilterChange = (
		key: keyof TransactionFiltersType,
		value: string | Transaction["type"],
	) => {
		onFiltersChange({
			...filters,
			[key]: value || undefined,
		});
	};

	const handleAdvancedFilterChange = () => {
		const advancedFilters: TransactionFiltersType = {
			...filters,
			startDate: startDate ? new Date(startDate) : undefined,
			endDate: endDate ? new Date(endDate) : undefined,
			minAmount: minAmount ? Number.parseFloat(minAmount) : undefined,
			maxAmount: maxAmount ? Number.parseFloat(maxAmount) : undefined,
		};
		onFiltersChange(advancedFilters);
	};

	const clearAllFilters = () => {
		onFiltersChange({});
		onSearchChange("");
		setStartDate("");
		setEndDate("");
		setMinAmount("");
		setMaxAmount("");
	};

	const getActiveFiltersCount = () => {
		const basicFilters = [
			filters.category,
			filters.account,
			filters.type,
			searchTerm,
		].filter(Boolean).length;
		const advancedFilters = [startDate, endDate, minAmount, maxAmount].filter(
			Boolean,
		).length;
		return basicFilters + advancedFilters;
	};

	const activeFiltersCount = getActiveFiltersCount();

	return (
		<Card className="mb-6">
			<CardHeader className="pb-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<CardTitle className="font-mono uppercase tracking-wider text-sm sm:text-base">
							Filters & Search
						</CardTitle>
						{activeFiltersCount > 0 && (
							<Badge variant="secondary" className="text-xs font-mono">
								{activeFiltersCount} active filter
								{activeFiltersCount !== 1 ? "s" : ""}
							</Badge>
						)}
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowAdvanced(!showAdvanced)}
						className="text-xs sm:text-sm font-mono"
						disabled={loading}
					>
						{showAdvanced ? "🔼 Hide Advanced" : "🔽 Show Advanced"}
					</Button>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Search */}
				<div className="w-full">
					<Label
						htmlFor="search"
						className="font-mono text-xs uppercase tracking-wider"
					>
						Search
					</Label>
					<Input
						id="search"
						placeholder="Search by description..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="mt-1 text-base sm:text-sm"
						disabled={loading}
					/>
				</div>

				{/* Basic Filters */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<div>
						<Label
							htmlFor="category"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Category
						</Label>
						<Select
							id="category"
							value={filters.category || ""}
							onChange={(e) => handleFilterChange("category", e.target.value)}
							className="mt-1 text-base sm:text-sm"
							disabled={loading}
						>
							<option value="">All Categories</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</Select>
					</div>

					<div>
						<Label
							htmlFor="account"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Account
						</Label>
						<Select
							id="account"
							value={filters.account || ""}
							onChange={(e) => handleFilterChange("account", e.target.value)}
							className="mt-1 text-base sm:text-sm"
							disabled={loading}
						>
							<option value="">All Accounts</option>
							{accounts.map((account) => (
								<option key={account.id} value={account.id}>
									{account.name}
								</option>
							))}
						</Select>
					</div>

					<div className="sm:col-span-2 lg:col-span-1">
						<Label
							htmlFor="type"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Type
						</Label>
						<Select
							id="type"
							value={filters.type || ""}
							onChange={(e) =>
								handleFilterChange(
									"type",
									e.target.value as Transaction["type"],
								)
							}
							className="mt-1 text-base sm:text-sm"
							disabled={loading}
						>
							<option value="">All Types</option>
							<option value="income">Income</option>
							<option value="expense">Expense</option>
							<option value="transfer">Transfer</option>
						</Select>
					</div>
				</div>

				{/* Advanced Filters */}
				{showAdvanced && (
					<div className="border-t pt-4 space-y-4">
						<h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
							Advanced Filters
						</h4>

						{/* Date Range */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<Label
									htmlFor="startDate"
									className="font-mono text-xs uppercase tracking-wider"
								>
									Start Date
								</Label>
								<Input
									id="startDate"
									type="date"
									value={startDate}
									onChange={(e) => {
										setStartDate(e.target.value);
										// Auto-apply advanced filters when date changes
										setTimeout(handleAdvancedFilterChange, 100);
									}}
									className="mt-1 text-base sm:text-sm"
									disabled={loading}
								/>
							</div>
							<div>
								<Label
									htmlFor="endDate"
									className="font-mono text-xs uppercase tracking-wider"
								>
									End Date
								</Label>
								<Input
									id="endDate"
									type="date"
									value={endDate}
									onChange={(e) => {
										setEndDate(e.target.value);
										// Auto-apply advanced filters when date changes
										setTimeout(handleAdvancedFilterChange, 100);
									}}
									className="mt-1 text-base sm:text-sm"
									disabled={loading}
								/>
							</div>
						</div>

						{/* Amount Range */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<Label
									htmlFor="minAmount"
									className="font-mono text-xs uppercase tracking-wider"
								>
									Min Amount ($)
								</Label>
								<Input
									id="minAmount"
									type="number"
									step="0.01"
									placeholder="0.00"
									value={minAmount}
									onChange={(e) => {
										setMinAmount(e.target.value);
										// Auto-apply advanced filters when amount changes
										setTimeout(handleAdvancedFilterChange, 100);
									}}
									className="mt-1 text-base sm:text-sm"
									disabled={loading}
								/>
							</div>
							<div>
								<Label
									htmlFor="maxAmount"
									className="font-mono text-xs uppercase tracking-wider"
								>
									Max Amount ($)
								</Label>
								<Input
									id="maxAmount"
									type="number"
									step="0.01"
									placeholder="0.00"
									value={maxAmount}
									onChange={(e) => {
										setMaxAmount(e.target.value);
										// Auto-apply advanced filters when amount changes
										setTimeout(handleAdvancedFilterChange, 100);
									}}
									className="mt-1 text-base sm:text-sm"
									disabled={loading}
								/>
							</div>
						</div>

						{/* Quick Date Presets */}
						<div>
							<Label className="font-mono text-xs uppercase tracking-wider mb-2 block">
								Quick Date Ranges
							</Label>
							<div className="flex flex-wrap gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										const today = new Date();
										const lastWeek = new Date(
											today.getTime() - 7 * 24 * 60 * 60 * 1000,
										);
										setStartDate(lastWeek.toISOString().split("T")[0]);
										setEndDate(today.toISOString().split("T")[0]);
										setTimeout(handleAdvancedFilterChange, 100);
									}}
									className="text-xs font-mono"
									disabled={loading}
								>
									Last 7 Days
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										const today = new Date();
										const lastMonth = new Date(
											today.getTime() - 30 * 24 * 60 * 60 * 1000,
										);
										setStartDate(lastMonth.toISOString().split("T")[0]);
										setEndDate(today.toISOString().split("T")[0]);
										setTimeout(handleAdvancedFilterChange, 100);
									}}
									className="text-xs font-mono"
									disabled={loading}
								>
									Last 30 Days
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										const today = new Date();
										const thisMonth = new Date(
											today.getFullYear(),
											today.getMonth(),
											1,
										);
										setStartDate(thisMonth.toISOString().split("T")[0]);
										setEndDate(today.toISOString().split("T")[0]);
										setTimeout(handleAdvancedFilterChange, 100);
									}}
									className="text-xs font-mono"
									disabled={loading}
								>
									This Month
								</Button>
							</div>
						</div>
					</div>
				)}

				{/* Filter Actions */}
				<div className="flex flex-wrap gap-2 pt-2">
					<Button
						variant="outline"
						size="sm"
						onClick={clearAllFilters}
						disabled={activeFiltersCount === 0 || loading}
						className="text-sm font-mono"
					>
						🗑️ Clear All Filters
					</Button>

					{/* Filter Summary */}
					{activeFiltersCount > 0 && (
						<div className="flex flex-wrap gap-1">
							{filters.category && (
								<Badge variant="outline" className="text-xs">
									Category:{" "}
									{categories.find((c) => c.id === filters.category)?.name}
								</Badge>
							)}
							{filters.account && (
								<Badge variant="outline" className="text-xs">
									Account:{" "}
									{accounts.find((a) => a.id === filters.account)?.name}
								</Badge>
							)}
							{filters.type && (
								<Badge variant="outline" className="text-xs">
									Type: {filters.type}
								</Badge>
							)}
							{searchTerm && (
								<Badge variant="outline" className="text-xs">
									Search: "{searchTerm}"
								</Badge>
							)}
							{(startDate || endDate) && (
								<Badge variant="outline" className="text-xs">
									Date Range
								</Badge>
							)}
							{(minAmount || maxAmount) && (
								<Badge variant="outline" className="text-xs">
									Amount Range
								</Badge>
							)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
