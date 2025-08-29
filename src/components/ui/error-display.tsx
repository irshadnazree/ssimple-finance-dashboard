import { AlertTriangle, Info, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import type { UserFriendlyError } from "../../lib/utils/errorHandler";
import { Alert, AlertDescription } from "./alert";
import { Button } from "./button";
import { Card, CardContent } from "./card";

interface ErrorDisplayProps {
	error: UserFriendlyError;
	onRetry?: () => void;
	onDismiss?: () => void;
	className?: string;
	variant?: "alert" | "card" | "inline";
	showSuggestions?: boolean;
}

const ErrorIcon = () => <AlertTriangle className="h-4 w-4 text-red-500" />;

interface ActionButtonsProps {
	error: UserFriendlyError;
	onRetry?: () => void;
	onDismiss?: () => void;
	isRetrying: boolean;
	showDetails: boolean;
	onToggleDetails: () => void;
	onRetryClick: () => void;
}

const ActionButtons = ({
	error,
	onRetry,
	onDismiss,
	isRetrying,
	showDetails,
	onToggleDetails,
	onRetryClick,
}: ActionButtonsProps) => (
	<div className="flex gap-2 mt-3">
		{error.retryable && onRetry && (
			<Button
				variant="outline"
				size="sm"
				onClick={onRetryClick}
				disabled={isRetrying}
				className="h-8"
			>
				{isRetrying ? (
					<RefreshCw className="h-3 w-3 mr-1 animate-spin" />
				) : (
					<RefreshCw className="h-3 w-3 mr-1" />
				)}
				{isRetrying ? "Retrying..." : "Try Again"}
			</Button>
		)}

		{error.suggestions && error.suggestions.length > 0 && (
			<Button
				variant="ghost"
				size="sm"
				onClick={onToggleDetails}
				className="h-8"
			>
				<Info className="h-3 w-3 mr-1" />
				{showDetails ? "Hide" : "Show"} Help
			</Button>
		)}

		{onDismiss && (
			<Button
				variant="ghost"
				size="sm"
				onClick={onDismiss}
				className="h-8 ml-auto"
			>
				<X className="h-3 w-3" />
			</Button>
		)}
	</div>
);

interface SuggestionsListProps {
	error: UserFriendlyError;
	showSuggestions: boolean;
}

const SuggestionsList = ({ error, showSuggestions }: SuggestionsListProps) => {
	if (
		!showSuggestions ||
		!error.suggestions ||
		error.suggestions.length === 0
	) {
		return null;
	}

	return (
		<div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
			<h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
				Suggestions:
			</h4>
			<ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
				{error.suggestions.map((suggestion) => (
					<li key={suggestion} className="flex items-start">
						<span className="inline-block w-1 h-1 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0" />
						{suggestion}
					</li>
				))}
			</ul>
		</div>
	);
};

export function ErrorDisplay({
	error,
	onRetry,
	onDismiss,
	className = "",
	variant = "alert",
	showSuggestions = true,
}: ErrorDisplayProps) {
	const [isRetrying, setIsRetrying] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

	const handleRetry = async () => {
		if (!onRetry) return;

		setIsRetrying(true);
		try {
			await onRetry();
		} catch (retryError) {
			console.error("Retry failed:", retryError);
		} finally {
			setIsRetrying(false);
		}
	};

	const toggleDetails = () => setShowDetails(!showDetails);

	if (variant === "card") {
		return (
			<Card className={`border-red-200 dark:border-red-800 ${className}`}>
				<CardContent className="pt-6">
					<div className="flex items-start space-x-3">
						<ErrorIcon />
						<div className="flex-1 min-w-0">
							<h3 className="text-sm font-medium text-red-900 dark:text-red-100">
								{error.title}
							</h3>
							<p className="text-sm text-red-800 dark:text-red-200 mt-1">
								{error.message}
							</p>

							{showDetails && (
								<SuggestionsList
									error={error}
									showSuggestions={showSuggestions}
								/>
							)}
							<ActionButtons
								error={error}
								onRetry={onRetry}
								onDismiss={onDismiss}
								isRetrying={isRetrying}
								showDetails={showDetails}
								onToggleDetails={toggleDetails}
								onRetryClick={handleRetry}
							/>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (variant === "inline") {
		return (
			<div className={`flex items-start space-x-2 text-sm ${className}`}>
				<ErrorIcon />
				<div className="flex-1">
					<span className="font-medium text-red-900 dark:text-red-100">
						{error.title}:
					</span>
					<span className="text-red-800 dark:text-red-200 ml-1">
						{error.message}
					</span>

					{error.retryable && onRetry && (
						<Button
							variant="link"
							size="sm"
							onClick={handleRetry}
							disabled={isRetrying}
							className="h-auto p-0 ml-2 text-red-600 hover:text-red-800"
						>
							{isRetrying ? "Retrying..." : "Try again"}
						</Button>
					)}
				</div>
			</div>
		);
	}

	// Default: alert variant
	return (
		<Alert
			className={`border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 ${className}`}
		>
			<ErrorIcon />
			<div className="flex-1">
				<h4 className="text-sm font-medium text-red-900 dark:text-red-100">
					{error.title}
				</h4>
				<AlertDescription className="text-red-800 dark:text-red-200">
					{error.message}
				</AlertDescription>

				{showDetails && (
					<SuggestionsList error={error} showSuggestions={showSuggestions} />
				)}
				<ActionButtons
					error={error}
					onRetry={onRetry}
					onDismiss={onDismiss}
					isRetrying={isRetrying}
					showDetails={showDetails}
					onToggleDetails={toggleDetails}
					onRetryClick={handleRetry}
				/>
			</div>
		</Alert>
	);
}



// Hook for managing error state with enhanced error handling
export function useErrorState() {
	const [error, setError] = useState<UserFriendlyError | null>(null);
	const [isRetrying, setIsRetrying] = useState(false);

	const clearError = () => setError(null);

	const handleError = (err: UserFriendlyError) => {
		setError(err);
		setIsRetrying(false);
	};

	const retry = async (retryFn: () => Promise<void>) => {
		if (!error?.retryable) return;

		setIsRetrying(true);
		try {
			await retryFn();
			clearError();
		} catch (retryError) {
			console.error("Retry failed:", retryError);
			// Keep the original error, don't replace it
		} finally {
			setIsRetrying(false);
		}
	};

	return {
		error,
		isRetrying,
		setError: handleError,
		clearError,
		retry,
	};
}
