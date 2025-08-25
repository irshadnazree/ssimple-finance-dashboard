import { ChevronDown, Filter, Search, X } from "lucide-react";
import { useState } from "react";
import type {
	Account,
	Category,
	ReportFilters,
	TransactionType,
} from "../../types/finance";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ReportFiltersComponentProps {
	filters: ReportFilters;
	onFiltersChange: (filters: ReportFilters) => void;
	availableAccounts: Account[];
	availableCategories: Category[];
	className?: string;
}

export function ReportFiltersComponent({
	filters,
	onFiltersChange,
	availableAccounts,
	availableCategories,
	className,
}: ReportFiltersComponentProps) {
	const [showFilters, setShowFilters] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	const updateFilter = (
		key: keyof ReportFilters,
		value: ReportFilters[keyof ReportFilters],
	) => {
		onFiltersChange({
			...filters,
			[key]: value,
		});
	};

	const addAccountFilter = (accountId: string) => {
		const currentAccounts = filters.accounts || [];
		if (!currentAccounts.includes(accountId)) {
			updateFilter("accounts", [...currentAccounts, accountId]);
		}
	};

	const removeAccountFilter = (accountId: string) => {
		const currentAccounts = filters.accounts || [];
		updateFilter(
			"accounts",
			currentAccounts.filter((id: string) => id !== accountId),
		);
	};

	const addCategoryFilter = (categoryId: string) => {
		const currentCategories = filters.categories || [];
		if (!currentCategories.includes(categoryId)) {
			updateFilter("categories", [...currentCategories, categoryId]);
		}
	};

	const removeCategoryFilter = (categoryId: string) => {
		const currentCategories = filters.categories || [];
		updateFilter(
			"categories",
			currentCategories.filter((id: string) => id !== categoryId),
		);
	};

	const clearAllFilters = () => {
		onFiltersChange({
			dateRange: filters.dateRange, // Keep the date range
			accounts: [],
			categories: [],
			transactionTypes: [],
			amountRange: undefined,
			tags: [],
			status: undefined,
		});
		setSearchTerm("");
	};

	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		// Note: searchTerm is not part of ReportFilters, handling locally
	};

	const getActiveFiltersCount = () => {
		let count = 0;
		if (filters.accounts?.length) count += filters.accounts.length;
		if (filters.categories?.length) count += filters.categories.length;
		if (filters.transactionTypes?.length)
			count += filters.transactionTypes.length;
		if (filters.amountRange?.min !== undefined) count++;
		if (filters.amountRange?.max !== undefined) count++;
		if (searchTerm) count++;
		if (filters.status?.length) count++;
		if (filters.tags?.length) count += filters.tags.length;
		return count;
	};

	const activeFiltersCount = getActiveFiltersCount();

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Filter Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Button
						variant="outline"
						onClick={() => setShowFilters(!showFilters)}
						className="font-mono text-sm"
					>
						<Filter className="h-4 w-4 mr-2" />
						Filters
						{activeFiltersCount > 0 && (
							<Badge variant="secondary" className="ml-2 font-mono text-xs">
								{activeFiltersCount}
							</Badge>
						)}
						<ChevronDown
							className={`h-4 w-4 ml-2 transition-transform ${
								showFilters ? "rotate-180" : ""
							}`}
						/>
					</Button>

					{activeFiltersCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							onClick={clearAllFilters}
							className="font-mono text-xs text-muted-foreground hover:text-foreground"
						>
							Clear All
						</Button>
					)}
				</div>

				{/* Search */}
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Search transactions..."
						value={searchTerm}
						onChange={(e) => handleSearchChange(e.target.value)}
						className="pl-10 font-mono text-sm"
					/>
				</div>
			</div>

			{/* Active Filters Display */}
			{activeFiltersCount > 0 && (
				<div className="flex flex-wrap gap-2">
					{filters.accounts?.map((accountId) => {
						const account = availableAccounts.find((a) => a.id === accountId);
						return account ? (
							<Badge
								key={accountId}
								variant="secondary"
								className="font-mono text-xs"
							>
								Account: {account.name}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeAccountFilter(accountId)}
									className="h-auto p-0 ml-1 hover:bg-transparent"
								>
									<X className="h-3 w-3" />
								</Button>
							</Badge>
						) : null;
					})}

					{filters.categories?.map((categoryId) => {
						const category = availableCategories.find(
							(c) => c.id === categoryId,
						);
						return category ? (
							<Badge
								key={categoryId}
								variant="secondary"
								className="font-mono text-xs"
							>
								Category: {category.name}
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeCategoryFilter(categoryId)}
									className="h-auto p-0 ml-1 hover:bg-transparent"
								>
									<X className="h-3 w-3" />
								</Button>
							</Badge>
						) : null;
					})}

					{filters.transactionTypes?.map((type) => (
						<Badge key={type} variant="secondary" className="font-mono text-xs">
							Type: {type}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const currentTypes = filters.transactionTypes || [];
									updateFilter(
										"transactionTypes",
										currentTypes.filter((t) => t !== type),
									);
								}}
								className="h-auto p-0 ml-1 hover:bg-transparent"
							>
								<X className="h-3 w-3" />
							</Button>
						</Badge>
					))}

					{(filters.amountRange?.min !== undefined ||
						filters.amountRange?.max !== undefined) && (
						<Badge variant="secondary" className="font-mono text-xs">
							Amount:{" "}
							{filters.amountRange?.min !== undefined
								? `$${filters.amountRange.min}`
								: "$0"}{" "}
							-{" "}
							{filters.amountRange?.max !== undefined
								? `$${filters.amountRange.max}`
								: "∞"}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									updateFilter("amountRange", undefined);
								}}
								className="h-auto p-0 ml-1 hover:bg-transparent"
							>
								<X className="h-3 w-3" />
							</Button>
						</Badge>
					)}
				</div>
			)}

			{/* Filter Panel */}
			{showFilters && (
				<Card className="bg-card/50 backdrop-blur-sm border-border/50">
					<CardHeader className="pb-4">
						<CardTitle className="text-sm font-mono uppercase tracking-wider">
							Advanced Filters
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Account Selection */}
						<div className="space-y-3">
							<Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
								Accounts
							</Label>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
								{availableAccounts.map((account) => {
									const isSelected =
										filters.accounts?.includes(account.id) || false;
									return (
										<Button
											key={account.id}
											variant={isSelected ? "default" : "outline"}
											size="sm"
											onClick={() => {
												isSelected
													? removeAccountFilter(account.id)
													: addAccountFilter(account.id);
											}}
											className="justify-start font-mono text-xs h-8"
										>
											{account.name}
										</Button>
									);
								})}
							</div>
						</div>

						{/* Category Selection */}
						<div className="space-y-3">
							<Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
								Categories
							</Label>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-2">
								{availableCategories.map((category) => {
									const isSelected =
										filters.categories?.includes(category.id) || false;
									return (
										<Button
											key={category.id}
											variant={isSelected ? "default" : "outline"}
											size="sm"
											onClick={() => {
												isSelected
													? removeCategoryFilter(category.id)
													: addCategoryFilter(category.id);
											}}
											className="justify-start font-mono text-xs h-8"
										>
											{category.name}
										</Button>
									);
								})}
							</div>
						</div>

						{/* Transaction Type */}
						<div className="space-y-3">
							<Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
								Transaction Type
							</Label>
							<div className="flex gap-2">
								{(["income", "expense", "transfer"] as TransactionType[]).map(
									(type) => {
										const isSelected =
											filters.transactionTypes?.includes(type) || false;
										return (
											<Button
												key={type}
												variant={isSelected ? "default" : "outline"}
												size="sm"
												onClick={() => {
													const currentTypes = filters.transactionTypes || [];
													if (isSelected) {
														updateFilter(
															"transactionTypes",
															currentTypes.filter((t) => t !== type),
														);
													} else {
														updateFilter("transactionTypes", [
															...currentTypes,
															type,
														]);
													}
												}}
												className="font-mono text-xs capitalize"
											>
												{type}
											</Button>
										);
									},
								)}
							</div>
						</div>

						{/* Amount Range */}
						<div className="space-y-3">
							<Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
								Amount Range
							</Label>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-2">
									<Label className="text-xs font-mono">Min Amount</Label>
									<Input
										type="number"
										placeholder="0.00"
										value={filters.amountRange?.min || ""}
										onChange={(e) => {
											const value = e.target.value
												? Number(e.target.value)
												: undefined;
											updateFilter("amountRange", {
												...filters.amountRange,
												min: value,
											});
										}}
										className="font-mono text-xs"
									/>
								</div>
								<div className="space-y-2">
									<Label className="text-xs font-mono">Max Amount</Label>
									<Input
										type="number"
										placeholder="No limit"
										value={filters.amountRange?.max || ""}
										onChange={(e) => {
											const value = e.target.value
												? Number(e.target.value)
												: undefined;
											updateFilter("amountRange", {
												...filters.amountRange,
												max: value,
											});
										}}
										className="font-mono text-xs"
									/>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Sorting component
export function ReportSorting({
	sortBy,
	sortOrder,
	onSortChange,
	availableFields,
	className,
}: {
	sortBy: string;
	sortOrder: "asc" | "desc";
	onSortChange: (sortBy: string, sortOrder: "asc" | "desc") => void;
	availableFields: { value: string; label: string }[];
	className?: string;
}) {
	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">
				Sort by:
			</Label>
			<select
				value={sortBy}
				onChange={(e) => onSortChange(e.target.value, sortOrder)}
				className="px-3 py-1 border border-border rounded-md bg-background text-foreground font-mono text-xs"
			>
				{availableFields.map((field) => (
					<option key={field.value} value={field.value}>
						{field.label}
					</option>
				))}
			</select>
			<Button
				variant="outline"
				size="sm"
				onClick={() =>
					onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc")
				}
				className="font-mono text-xs"
			>
				{sortOrder === "asc" ? "↑" : "↓"}
			</Button>
		</div>
	);
}
