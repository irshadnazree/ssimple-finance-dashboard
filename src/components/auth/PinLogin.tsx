import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import type { AuthResult } from "../../types/auth";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";

interface PinLoginProps {
	onResult: (result: AuthResult) => void;
	onBack: () => void;
}

/**
 * PIN Login Component
 * Handles PIN authentication for existing users
 */
export function PinLogin({ onResult, onBack }: PinLoginProps) {
	const { authenticate } = useAuthStore();
	const [pin, setPin] = useState("");
	const [showPin, setShowPin] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [attempts, setAttempts] = useState(0);

	const handlePinChange = (value: string) => {
		// Only allow digits and limit to 6 characters
		const numericValue = value.replace(/\D/g, "").slice(0, 6);
		setPin(numericValue);
		setError(null);
	};

	const handleSubmit = async () => {
		if (pin.length !== 6) {
			setError("Please enter your complete 6-digit PIN");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const result = await authenticate("pin", { pin });

			if (result.success) {
				onResult(result);
			} else {
				setAttempts((prev) => prev + 1);
				setPin("");

				// Handle specific error cases
				if (result.error?.code === "INVALID_PIN") {
					const remainingAttempts = result.error.remainingAttempts;
					if (remainingAttempts !== undefined && remainingAttempts > 0) {
						setError(`Incorrect PIN. ${remainingAttempts} attempts remaining.`);
					} else {
						setError("Incorrect PIN. Please try again.");
					}
				} else if (result.error?.code === "TOO_MANY_ATTEMPTS") {
					setError("Too many failed attempts. Please try again later.");
				} else if (result.error?.code === "ACCOUNT_LOCKED") {
					const lockoutTime = result.error.lockoutTime;
					if (lockoutTime) {
						const minutes = Math.ceil((lockoutTime - Date.now()) / (1000 * 60));
						setError(`Account locked. Try again in ${minutes} minutes.`);
					} else {
						setError("Account is temporarily locked. Please try again later.");
					}
				} else {
					setError(
						result.error?.message || "Authentication failed. Please try again.",
					);
				}
			}
		} catch (err) {
			console.error("PIN authentication error:", err);
			setError("Authentication failed. Please try again.");
			setPin("");
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleSubmit();
		}
	};

	const isComplete = pin.length === 6;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center space-x-3">
					<Button variant="ghost" size="sm" onClick={onBack} className="p-2">
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<CardTitle className="flex items-center space-x-2">
							<Lock className="h-5 w-5 text-primary" />
							<span>Enter PIN</span>
						</CardTitle>
						<CardDescription>
							Enter your 6-digit PIN to access your financial dashboard
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Error Alert */}
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{/* PIN Input */}
				<div className="space-y-4">
					<div className="relative">
						<Input
							type={showPin ? "text" : "password"}
							value={pin}
							onChange={(e) => handlePinChange(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Enter your PIN"
							className="text-center text-2xl tracking-widest font-mono pr-12"
							maxLength={6}
							autoFocus
							disabled={isLoading}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2"
							onClick={() => setShowPin(!showPin)}
						>
							{showPin ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</Button>
					</div>

					{/* PIN Progress Indicator */}
					<div className="flex justify-center space-x-2">
						{[0, 1, 2, 3, 4, 5].map((index) => (
							<div
								key={`pin-indicator-${index}`}
								className={cn(
									"w-3 h-3 rounded-full border-2 transition-all duration-200",
									index < pin.length
										? "bg-primary border-primary"
										: "border-muted-foreground/30",
								)}
							/>
						))}
					</div>
				</div>

				{/* Attempt Counter */}
				{attempts > 0 && (
					<div className="text-center text-sm text-muted-foreground">
						Failed attempts: {attempts}
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex space-x-3">
					<Button
						variant="outline"
						onClick={onBack}
						className="flex-1"
						disabled={isLoading}
					>
						Back
					</Button>
					<Button
						onClick={handleSubmit}
						className="flex-1"
						disabled={!isComplete || isLoading}
					>
						{isLoading ? (
							<div className="flex items-center space-x-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
								<span>Authenticating...</span>
							</div>
						) : (
							"Sign In"
						)}
					</Button>
				</div>

				{/* Help Text */}
				<div className="text-center text-sm text-muted-foreground">
					<p>Forgot your PIN? Contact support for assistance.</p>
				</div>
			</CardContent>
		</Card>
	);
}

export default PinLogin;
