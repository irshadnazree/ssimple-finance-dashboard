export enum LogLevel {
	DEBUG = 0,
	INFO = 1,
	WARN = 2,
	ERROR = 3,
	FATAL = 4,
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: string;
	data?: unknown;
	error?: Error;
}

export interface LoggerConfig {
	level: LogLevel;
	enableConsole: boolean;
	enableStorage: boolean;
	maxStorageEntries: number;
}

class Logger {
	private config: LoggerConfig;
	private logs: LogEntry[] = [];

	constructor(config: Partial<LoggerConfig> = {}) {
		this.config = {
			level: LogLevel.INFO,
			enableConsole: true,
			enableStorage: true,
			maxStorageEntries: 1000,
			...config,
		};
	}

	private shouldLog(level: LogLevel): boolean {
		return level >= this.config.level;
	}

	private createLogEntry(
		level: LogLevel,
		message: string,
		context?: string,
		data?: unknown,
		error?: Error,
	): LogEntry {
		return {
			timestamp: new Date().toISOString(),
			level,
			message,
			context,
			data,
			error,
		};
	}

	private formatMessage(entry: LogEntry): string {
		const levelName = LogLevel[entry.level];
		const context = entry.context ? `[${entry.context}]` : "";
		return `${entry.timestamp} ${levelName}${context}: ${entry.message}`;
	}

	public log(
		level: LogLevel,
		message: string,
		context?: string,
		data?: unknown,
		error?: Error,
	): void {
		if (!this.shouldLog(level)) return;

		const entry = this.createLogEntry(level, message, context, data, error);

		// Store log entry
		if (this.config.enableStorage) {
			this.logs.push(entry);
			if (this.logs.length > this.config.maxStorageEntries) {
				this.logs.shift();
			}
		}

		// Console output
		if (this.config.enableConsole) {
			const formattedMessage = this.formatMessage(entry);

			switch (level) {
				case LogLevel.DEBUG:
					console.debug(formattedMessage, data);
					break;
				case LogLevel.INFO:
					console.info(formattedMessage, data);
					break;
				case LogLevel.WARN:
					console.warn(formattedMessage, data);
					break;
				case LogLevel.ERROR:
				case LogLevel.FATAL:
					console.error(formattedMessage, error || data);
					break;
			}
		}
	}

	debug(message: string, context?: string, data?: unknown): void {
		this.log(LogLevel.DEBUG, message, context, data);
	}

	info(message: string, context?: string, data?: unknown): void {
		this.log(LogLevel.INFO, message, context, data);
	}

	warn(message: string, context?: string, data?: unknown): void {
		this.log(LogLevel.WARN, message, context, data);
	}

	error(message: string, context?: string, error?: Error | unknown): void {
		const errorObj = error instanceof Error ? error : undefined;
		const data = error instanceof Error ? undefined : error;
		this.log(LogLevel.ERROR, message, context, data, errorObj);
	}

	fatal(message: string, context?: string, error?: Error | unknown): void {
		const errorObj = error instanceof Error ? error : undefined;
		const data = error instanceof Error ? undefined : error;
		this.log(LogLevel.FATAL, message, context, data, errorObj);
	}

	// Utility methods
	getLogs(level?: LogLevel): LogEntry[] {
		if (level !== undefined) {
			return this.logs.filter((log) => log.level >= level);
		}
		return [...this.logs];
	}

	clearLogs(): void {
		this.logs = [];
	}

	setLevel(level: LogLevel): void {
		this.config.level = level;
	}

	getLevel(): LogLevel {
		return this.config.level;
	}

	// Export logs for debugging
	exportLogs(): string {
		return JSON.stringify(this.logs, null, 2);
	}
}

// Create default logger instance
export const logger = new Logger({
	level:
		process.env.NODE_ENV === "development" ? LogLevel.DEBUG : LogLevel.INFO,
	enableConsole: true,
	enableStorage: true,
});

// Export Logger class for custom instances
export { Logger };

// Convenience function for error logging with context
export function logError(
	error: Error | unknown,
	context: string,
	additionalData?: unknown,
): void {
	if (error instanceof Error) {
		logger.error(error.message, context, error);
	} else {
		logger.error("Unknown error occurred", context, { error, additionalData });
	}
}

// Performance logging utility
export function logPerformance(
	operation: string,
	duration: number,
	context?: string,
): void {
	logger.info(`Performance: ${operation} took ${duration}ms`, context, {
		duration,
	});
}

// Authentication logging utility
export function logAuthEvent(
	event: string,
	success: boolean,
	userId?: string,
	additionalData?: unknown,
): void {
	const level = success ? LogLevel.INFO : LogLevel.WARN;
	const message = `Auth: ${event} ${success ? "succeeded" : "failed"}`;
	const logData = { userId, success };
	if (additionalData && typeof additionalData === "object") {
		Object.assign(logData, additionalData);
	}
	logger.log(level, message, "AUTH", logData);
}
