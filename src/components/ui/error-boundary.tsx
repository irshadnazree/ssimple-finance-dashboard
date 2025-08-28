import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
	public state: State = {
		hasError: false,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
		this.props.onError?.(error, errorInfo);
	}

	private handleReset = () => {
		this.setState({ hasError: false, error: undefined });
	};

	private handleReload = () => {
		window.location.reload();
	};

	public render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<div className="min-h-screen flex items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle className="text-red-600 dark:text-red-400">
								Something went wrong
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Alert variant="destructive">
								<AlertTitle>Error Details</AlertTitle>
								<AlertDescription className="mt-2">
									{this.state.error?.message || "An unexpected error occurred"}
								</AlertDescription>
							</Alert>

							<div className="flex flex-col sm:flex-row gap-2">
								<Button
									onClick={this.handleReset}
									variant="outline"
									className="flex-1"
								>
									Try Again
								</Button>
								<Button onClick={this.handleReload} className="flex-1">
									Reload Page
								</Button>
							</div>

							{process.env.NODE_ENV === "development" && (
								<details className="mt-4">
									<summary className="cursor-pointer text-sm text-muted-foreground">
										Error Stack (Development)
									</summary>
									<pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
										{this.state.error?.stack}
									</pre>
								</details>
							)}
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
