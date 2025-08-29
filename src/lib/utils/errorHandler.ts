import type { ValidationError } from "../../types/finance";
import { logger } from "./logger";

export interface ErrorContext {
	component?: string;
	action?: string;
	userId?: string;
	additionalData?: Record<string, unknown>;
}

export interface UserFriendlyError {
	title: string;
	message: string;
	actionable?: boolean;
	retryable?: boolean;
	suggestions?: string[];
}

export class ErrorHandler {
	private static readonly ERROR_MESSAGES = {
		// Network errors
		NETWORK_ERROR: {
			title: "Connection Problem",
			message:
				"Unable to connect to the server. Please check your internet connection.",
			retryable: true,
			suggestions: [
				"Check your internet connection",
				"Try again in a few moments",
			],
		},
		TIMEOUT_ERROR: {
			title: "Request Timeout",
			message: "The request took too long to complete. Please try again.",
			retryable: true,
			suggestions: [
				"Try again with a smaller data set",
				"Check your internet speed",
			],
		},

		// Authentication errors
		AUTH_FAILED: {
			title: "Authentication Failed",
			message: "Invalid credentials. Please check your login information.",
			actionable: true,
			suggestions: [
				"Verify your username and password",
				"Reset your password if needed",
			],
		},
		SESSION_EXPIRED: {
			title: "Session Expired",
			message: "Your session has expired. Please log in again.",
			actionable: true,
			suggestions: ["Log in again to continue"],
		},
		BIOMETRIC_UNAVAILABLE: {
			title: "Biometric Authentication Unavailable",
			message: "Biometric authentication is not available on this device.",
			suggestions: ["Use PIN or password authentication instead"],
		},
		PIN_INVALID: {
			title: "Invalid PIN",
			message: "The PIN you entered is incorrect.",
			actionable: true,
			suggestions: [
				"Double-check your PIN",
				"Use biometric authentication if available",
			],
		},

		// Data validation errors
		VALIDATION_ERROR: {
			title: "Invalid Data",
			message: "Please check the information you entered and try again.",
			actionable: true,
		},
		AMOUNT_INVALID: {
			title: "Invalid Amount",
			message: "Please enter a valid amount greater than zero.",
			actionable: true,
			suggestions: [
				"Enter a positive number",
				"Use decimal format (e.g., 10.50)",
			],
		},
		DATE_INVALID: {
			title: "Invalid Date",
			message: "Please select a valid date.",
			actionable: true,
			suggestions: [
				"Choose a date that is not in the future",
				"Use the date picker",
			],
		},
		CATEGORY_REQUIRED: {
			title: "Category Required",
			message: "Please select a category for this transaction.",
			actionable: true,
			suggestions: [
				"Choose from the dropdown list",
				"Create a new category if needed",
			],
		},
		ACCOUNT_REQUIRED: {
			title: "Account Required",
			message: "Please select an account for this transaction.",
			actionable: true,
			suggestions: ["Choose from your available accounts"],
		},

		// File operations
		FILE_TOO_LARGE: {
			title: "File Too Large",
			message: "The selected file is too large to process.",
			actionable: true,
			suggestions: [
				"Choose a smaller file",
				"Split large files into smaller chunks",
			],
		},
		FILE_FORMAT_INVALID: {
			title: "Invalid File Format",
			message: "The file format is not supported.",
			actionable: true,
			suggestions: ["Use CSV or JSON format", "Check the file extension"],
		},
		IMPORT_FAILED: {
			title: "Import Failed",
			message: "Unable to import the selected file.",
			retryable: true,
			suggestions: [
				"Check the file format",
				"Verify the data structure",
				"Try a smaller file",
			],
		},
		EXPORT_FAILED: {
			title: "Export Failed",
			message: "Unable to export your data.",
			retryable: true,
			suggestions: [
				"Try again",
				"Choose a different format",
				"Check available storage space",
			],
		},

		// Database errors
		DATA_NOT_FOUND: {
			title: "Data Not Found",
			message: "The requested information could not be found.",
			suggestions: ["Refresh the page", "Check if the item was deleted"],
		},
		SAVE_FAILED: {
			title: "Save Failed",
			message: "Unable to save your changes.",
			retryable: true,
			suggestions: ["Try again", "Check your internet connection"],
		},
		DELETE_FAILED: {
			title: "Delete Failed",
			message: "Unable to delete the selected item.",
			retryable: true,
			suggestions: ["Try again", "Refresh the page"],
		},

		// Sync errors
		SYNC_FAILED: {
			title: "Sync Failed",
			message: "Unable to synchronize your data.",
			retryable: true,
			suggestions: [
				"Check your internet connection",
				"Try manual sync",
				"Contact support if the problem persists",
			],
		},
		CONFLICT_DETECTED: {
			title: "Data Conflict",
			message:
				"Conflicting changes detected. Please resolve conflicts manually.",
			actionable: true,
			suggestions: [
				"Review conflicting changes",
				"Choose which version to keep",
			],
		},

		// Generic fallbacks
		UNKNOWN_ERROR: {
			title: "Unexpected Error",
			message: "An unexpected error occurred. Please try again.",
			retryable: true,
			suggestions: [
				"Try again",
				"Refresh the page",
				"Contact support if the problem persists",
			],
		},
	};

	/**
	 * Handles errors and returns user-friendly error information
	 */
	static handleError(
		error: unknown,
		context?: ErrorContext,
	): UserFriendlyError {
		// Log the error for debugging
		logger.error(
			"Error occurred",
			context?.component || "Unknown",
			error instanceof Error ? error : new Error(String(error)),
		);

		// Determine error type and return appropriate user-friendly message
		const errorCode = ErrorHandler.determineErrorCode(error);
		const baseError =
			ErrorHandler.ERROR_MESSAGES[errorCode] ||
			ErrorHandler.ERROR_MESSAGES.UNKNOWN_ERROR;

		return {
			...baseError,
			message: ErrorHandler.enhanceErrorMessage(
				error,
				baseError.message,
				context,
			),
		};
	}

	/**
	 * Handles validation errors specifically
	 */
	static handleValidationErrors(
		errors: ValidationError[],
		context?: ErrorContext,
	): UserFriendlyError {
		logger.warn("Validation errors occurred", context?.component || "Unknown", {
			errors,
			context,
		});

		if (errors.length === 1) {
			const error = errors[0];
			const specificError = ErrorHandler.getValidationErrorMessage(error);
			if (specificError) {
				return specificError;
			}
		}

		const fieldNames = errors
			.map((e) => ErrorHandler.formatFieldName(e.field))
			.join(", ");

		return {
			title: "Validation Error",
			message: `Please check the following fields: ${fieldNames}`,
			actionable: true,
			suggestions: [
				"Review the highlighted fields",
				"Ensure all required information is provided",
			],
		};
	}

	/**
	 * Creates a user-friendly error for network issues
	 */
	static handleNetworkError(
		error: unknown,
		context?: ErrorContext,
	): UserFriendlyError {
		logger.error(
			"Network error occurred",
			context?.component || "Unknown",
			error instanceof Error ? error : new Error(String(error)),
		);

		if (ErrorHandler.isTimeoutError(error)) {
			return ErrorHandler.ERROR_MESSAGES.TIMEOUT_ERROR;
		}

		return ErrorHandler.ERROR_MESSAGES.NETWORK_ERROR;
	}

	/**
	 * Creates a user-friendly error for authentication issues
	 */
	static handleAuthError(
		error: unknown,
		method?: string,
		context?: ErrorContext,
	): UserFriendlyError {
		logger.error(
			"Authentication error occurred",
			context?.component || "Auth",
			error instanceof Error ? error : new Error(String(error)),
		);

		if (method === "biometric") {
			return ErrorHandler.ERROR_MESSAGES.BIOMETRIC_UNAVAILABLE;
		}

		if (method === "pin") {
			return ErrorHandler.ERROR_MESSAGES.PIN_INVALID;
		}

		if (ErrorHandler.isSessionExpiredError(error)) {
			return ErrorHandler.ERROR_MESSAGES.SESSION_EXPIRED;
		}

		return ErrorHandler.ERROR_MESSAGES.AUTH_FAILED;
	}

	/**
	 * Determines the error code based on the error object
	 */
	private static determineErrorCode(
		error: unknown,
	): keyof typeof ErrorHandler.ERROR_MESSAGES {
		if (error instanceof Error) {
			const message = error.message.toLowerCase();

			// Network errors
			if (message.includes("network") || message.includes("fetch")) {
				return "NETWORK_ERROR";
			}
			if (message.includes("timeout")) {
				return "TIMEOUT_ERROR";
			}

			// Authentication errors
			if (message.includes("auth") || message.includes("unauthorized")) {
				return "AUTH_FAILED";
			}
			if (message.includes("session") || message.includes("expired")) {
				return "SESSION_EXPIRED";
			}

			// Validation errors
			if (message.includes("validation") || message.includes("invalid")) {
				return "VALIDATION_ERROR";
			}
			if (message.includes("amount") && message.includes("greater than 0")) {
				return "AMOUNT_INVALID";
			}
			if (message.includes("category") && message.includes("required")) {
				return "CATEGORY_REQUIRED";
			}
			if (message.includes("account") && message.includes("required")) {
				return "ACCOUNT_REQUIRED";
			}

			// File errors
			if (message.includes("file") && message.includes("large")) {
				return "FILE_TOO_LARGE";
			}
			if (message.includes("format") || message.includes("unsupported")) {
				return "FILE_FORMAT_INVALID";
			}

			// Database errors
			if (message.includes("not found")) {
				return "DATA_NOT_FOUND";
			}
			if (message.includes("save") || message.includes("update")) {
				return "SAVE_FAILED";
			}
			if (message.includes("delete")) {
				return "DELETE_FAILED";
			}

			// Sync errors
			if (message.includes("sync")) {
				return "SYNC_FAILED";
			}
			if (message.includes("conflict")) {
				return "CONFLICT_DETECTED";
			}
		}

		return "UNKNOWN_ERROR";
	}

	/**
	 * Gets specific validation error message
	 */
	private static getValidationErrorMessage(
		error: ValidationError,
	): UserFriendlyError | null {
		switch (error.code) {
			case "AMOUNT_INVALID":
				return ErrorHandler.ERROR_MESSAGES.AMOUNT_INVALID;
			case "DATE_INVALID":
				return ErrorHandler.ERROR_MESSAGES.DATE_INVALID;
			case "CATEGORY_REQUIRED":
				return ErrorHandler.ERROR_MESSAGES.CATEGORY_REQUIRED;
			case "ACCOUNT_REQUIRED":
				return ErrorHandler.ERROR_MESSAGES.ACCOUNT_REQUIRED;
			default:
				return null;
		}
	}

	/**
	 * Enhances error message with context
	 */
	private static enhanceErrorMessage(
		_error: unknown,
		baseMessage: string,
		context?: ErrorContext,
	): string {
		if (context?.action) {
			return `${baseMessage} (Action: ${context.action})`;
		}
		return baseMessage;
	}

	/**
	 * Formats field name for user display
	 */
	private static formatFieldName(field: string): string {
		return field
			.replace(/([A-Z])/g, " $1")
			.replace(/^./, (str) => str.toUpperCase())
			.trim();
	}

	/**
	 * Checks if error is a timeout error
	 */
	private static isTimeoutError(error: unknown): boolean {
		if (error instanceof Error) {
			return (
				error.message.toLowerCase().includes("timeout") ||
				error.name === "TimeoutError"
			);
		}
		return false;
	}

	/**
	 * Checks if error is a session expired error
	 */
	private static isSessionExpiredError(error: unknown): boolean {
		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return message.includes("session") && message.includes("expired");
		}
		return false;
	}

	/**
	 * Creates a retry function for retryable errors
	 */
	static createRetryHandler(
		originalFunction: () => Promise<void>,
		maxRetries: number = 3,
		delay: number = 1000,
	) {
		return async (): Promise<void> => {
			let lastError: unknown;

			for (let attempt = 1; attempt <= maxRetries; attempt++) {
				try {
					await originalFunction();
					return; // Success
				} catch (error) {
					lastError = error;

					if (attempt < maxRetries) {
						// Wait before retrying
						await new Promise((resolve) =>
							setTimeout(resolve, delay * attempt),
						);
					}
				}
			}

			// All retries failed
			throw lastError;
		};
	}
}
