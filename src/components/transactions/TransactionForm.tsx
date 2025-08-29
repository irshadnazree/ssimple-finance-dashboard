import { useEffect, useState } from "react";
import { ValidationUtils } from "../../lib/calculations/finance";
import { useToast } from "../../lib/hooks/useToast";
import { ErrorHandler } from "../../lib/utils/errorHandler";
import { useTransactionStore } from "../../stores/transactionStore";
import type {
	Account,
	Category,
	Transaction,
	ValidationError,
} from "../../types/finance";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Select } from "../ui/select";

interface TransactionFormProps {
	transaction?: Transaction | null;
	accounts: Account[];
	categories: Category[];
	onSubmit: (transaction: Partial<Transaction>) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
}

export function TransactionForm({
	transaction,
	accounts,
	categories,
	onSubmit,
	onCancel,
	loading = false,
}: TransactionFormProps) {
	const { toast } = useToast();
	const { suggestCategory } = useTransactionStore();
	const [formData, setFormData] = useState<Partial<Transaction>>({
		amount: 0,
		type: "expense",
		description: "",
		category: "",
		account: "",
		date: new Date(),
		note: "",
	});

	const [errors, setErrors] = useState<ValidationError[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [suggestedCategory, setSuggestedCategory] = useState<string | null>(
		null,
	);

	// Initialize form data when transaction prop changes
	useEffect(() => {
		if (transaction) {
			setFormData({
				...transaction,
				date: new Date(transaction.date),
			});
		} else {
			setFormData({
				amount: 0,
				type: "expense",
				description: "",
				category: "",
				account: "",
				date: new Date(),
				note: "",
			});
		}
		setErrors([]);
		setSuggestedCategory(null);
	}, [transaction]);

	// Auto-suggest category based on description
	useEffect(() => {
		const handleCategorySuggestion = async () => {
			if (
				formData.description &&
				formData.description.length > 3 &&
				!formData.category
			) {
				try {
					const suggested = await suggestCategory(
						formData.description,
						formData.amount || 0,
					);
					setSuggestedCategory(suggested);
				} catch (error) {
					const userError = ErrorHandler.handleError(error, {
						component: "TransactionForm",
						action: "categorySuggestion",
					});
					console.warn("Failed to suggest category:", userError.message);
				}
			} else {
				setSuggestedCategory(null);
			}
		};

		const timeoutId = setTimeout(handleCategorySuggestion, 500);
		return () => clearTimeout(timeoutId);
	}, [
		formData.description,
		formData.amount,
		formData.category,
		suggestCategory,
	]);

	const handleInputChange = (
		field: keyof Transaction,
		value: string | number | Date,
	) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		// Clear field-specific errors when user starts typing
		if (errors.length > 0) {
			setErrors((prev) => prev.filter((error) => error.field !== field));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate form data
		const validationErrors = ValidationUtils.validateTransaction(
			formData as Transaction,
		);

		if (validationErrors.length > 0) {
			setErrors(validationErrors);
			toast({
				variant: "destructive",
				title: "Validation Error",
				description: `Please fix ${validationErrors.length} error${
					validationErrors.length > 1 ? "s" : ""
				} before submitting.`,
			});
			return;
		}

		setIsSubmitting(true);
		setErrors([]);

		try {
			await onSubmit(formData);
			setErrors([]);
			toast({
				title: "Success",
				description: `Transaction ${
					transaction ? "updated" : "created"
				} successfully.`,
			});
		} catch (error) {
			const userError = ErrorHandler.handleError(error, {
				component: "TransactionForm",
				action: transaction ? "update" : "create",
			});

			setErrors([
				{
					field: "general",
					message: userError.message,
					code: "SUBMIT_ERROR",
				},
			]);

			toast({
				variant: "destructive",
				title: userError.title,
				description: userError.message,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const applySuggestedCategory = () => {
		if (suggestedCategory) {
			handleInputChange("category", suggestedCategory);
			setSuggestedCategory(null);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
		}).format(amount);
	};

	const getFieldError = (field: string) => {
		return errors.find((error) => error.field === field);
	};

	const hasGeneralError = errors.some((error) => error.field === "general");

	return (
		<Card className="bg-card/60 backdrop-blur-sm border-border/50">
			<CardHeader>
				<CardTitle className="font-mono uppercase tracking-wider">
					{transaction ? "Edit Transaction" : "Add New Transaction"}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{hasGeneralError && (
					<Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
						<AlertDescription className="text-red-800 dark:text-red-200">
							{errors.find((e) => e.field === "general")?.message}
						</AlertDescription>
					</Alert>
				)}

				<form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
					{/* Transaction Type */}
					<div className="space-y-2">
						<Label
							htmlFor="type"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Transaction Type
						</Label>
						<div className="flex flex-col sm:flex-row gap-2">
							<Button
								type="button"
								variant={formData.type === "income" ? "default" : "outline"}
								onClick={() => handleInputChange("type", "income")}
								className="flex-1 font-mono text-sm sm:text-base"
								disabled={loading || isSubmitting}
							>
								💰 Income
							</Button>
							<Button
								type="button"
								variant={formData.type === "expense" ? "default" : "outline"}
								onClick={() => handleInputChange("type", "expense")}
								className="flex-1 font-mono text-sm sm:text-base"
								disabled={loading || isSubmitting}
							>
								💸 Expense
							</Button>
						</div>
					</div>

					{/* Amount */}
					<div className="space-y-2">
						<Label
							htmlFor="amount"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Amount *
						</Label>
						<div className="relative">
							<Input
								id="amount"
								type="number"
								step="0.01"
								min="0"
								value={formData.amount || ""}
								onChange={(e) =>
									handleInputChange(
										"amount",
										Number.parseFloat(e.target.value) || 0,
									)
								}
								className={`font-mono text-base sm:text-sm ${
									getFieldError("amount") ? "border-red-500" : ""
								}`}
								placeholder="0.00"
								disabled={loading || isSubmitting}
							/>
							{(formData.amount ?? 0) > 0 && (
								<div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono hidden sm:block">
									{formatCurrency(formData.amount ?? 0)}
								</div>
							)}
						</div>
						{(formData.amount ?? 0) > 0 && (
							<div className="text-sm text-muted-foreground font-mono sm:hidden">
								{formatCurrency(formData.amount ?? 0)}
							</div>
						)}
						{getFieldError("amount") && (
							<p className="text-xs text-red-600 dark:text-red-400 font-mono">
								{getFieldError("amount")?.message}
							</p>
						)}
					</div>

					{/* Description */}
					<div className="space-y-2">
						<Label
							htmlFor="description"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Description *
						</Label>
						<Input
							id="description"
							type="text"
							value={formData.description || ""}
							onChange={(e) => handleInputChange("description", e.target.value)}
							className={`text-base sm:text-sm ${
								getFieldError("description") ? "border-red-500" : ""
							}`}
							placeholder="Enter transaction description"
							disabled={loading || isSubmitting}
						/>
						{getFieldError("description") && (
							<p className="text-xs text-red-600 dark:text-red-400 font-mono">
								{getFieldError("description")?.message}
							</p>
						)}
					</div>

					{/* Category with suggestion */}
					<div className="space-y-2">
						<Label
							htmlFor="category"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Category *
						</Label>
						<Select
							id="category"
							value={formData.category || ""}
							onChange={(e) => handleInputChange("category", e.target.value)}
							className={`text-base sm:text-sm ${
								getFieldError("category") ? "border-red-500" : ""
							}`}
							disabled={loading || isSubmitting}
						>
							<option value="">Select a category</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</Select>

						{suggestedCategory && (
							<div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
								<span className="text-xs text-blue-800 dark:text-blue-200 font-mono">
									Suggested category:
								</span>
								<Badge
									variant="outline"
									className="text-xs cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
									onClick={applySuggestedCategory}
								>
									{categories.find((c) => c.id === suggestedCategory)?.name ||
										"Unknown"}
								</Badge>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={applySuggestedCategory}
									className="text-xs h-6 px-2"
								>
									Apply
								</Button>
							</div>
						)}

						{getFieldError("category") && (
							<p className="text-xs text-red-600 dark:text-red-400 font-mono">
								{getFieldError("category")?.message}
							</p>
						)}
					</div>

					{/* Account */}
					<div className="space-y-2">
						<Label
							htmlFor="account"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Account *
						</Label>
						<Select
							id="account"
							value={formData.account || ""}
							onChange={(e) => handleInputChange("account", e.target.value)}
							className={`text-base sm:text-sm ${
								getFieldError("account") ? "border-red-500" : ""
							}`}
							disabled={loading || isSubmitting}
						>
							<option value="">Select an account</option>
							{accounts.map((account) => (
								<option key={account.id} value={account.id}>
									{account.name} ({formatCurrency(account.balance)})
								</option>
							))}
						</Select>
						{getFieldError("account") && (
							<p className="text-xs text-red-600 dark:text-red-400 font-mono">
								{getFieldError("account")?.message}
							</p>
						)}
					</div>

					{/* Date */}
					<div className="space-y-2">
						<Label
							htmlFor="date"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Date *
						</Label>
						<Input
							id="date"
							type="date"
							value={
								formData.date ? formData.date.toISOString().split("T")[0] : ""
							}
							onChange={(e) =>
								handleInputChange("date", new Date(e.target.value))
							}
							className={`font-mono text-base sm:text-sm ${
								getFieldError("date") ? "border-red-500" : ""
							}`}
							disabled={loading || isSubmitting}
						/>
						{getFieldError("date") && (
							<p className="text-xs text-red-600 dark:text-red-400 font-mono">
								{getFieldError("date")?.message}
							</p>
						)}
					</div>

					{/* Note (Optional) */}
					<div className="space-y-2">
						<Label
							htmlFor="note"
							className="font-mono text-xs uppercase tracking-wider"
						>
							Note (Optional)
						</Label>
						<Input
							id="note"
							type="text"
							value={formData.note || ""}
							onChange={(e) => handleInputChange("note", e.target.value)}
							placeholder="Add a note (optional)"
							className="text-base sm:text-sm"
							disabled={loading || isSubmitting}
						/>
					</div>

					{/* Form Actions */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-border/50">
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={loading || isSubmitting}
							className="font-mono text-sm sm:text-base order-2 sm:order-1"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={loading || isSubmitting}
							className="font-mono text-sm sm:text-base order-1 sm:order-2"
						>
							{isSubmitting ? (
								<>
									<LoadingSpinner size="sm" className="mr-2" />
									{transaction ? "Updating..." : "Adding..."}
								</>
							) : transaction ? (
								"✏️ Update Transaction"
							) : (
								"💾 Add Transaction"
							)}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
