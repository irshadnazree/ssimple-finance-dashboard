import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	Eye,
	EyeOff,
	Lock,
} from "lucide-react";
import { useState } from "react";
import { pinAuthService } from "../../lib/auth/pinAuthService";
import { cn } from "../../lib/utils";
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

interface PinSetupProps {
	onResult: (result: AuthResult) => void;
	onBack: () => void;
}

/**
 * PIN Setup Component
 * Handles the creation of a new 6-digit PIN for authentication
 */
export function PinSetup({ onResult, onBack }: PinSetupProps) {
	const [pin, setPin] = useState("");
	const [confirmPin, setConfirmPin] = useState("");
	const [showPin, setShowPin] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState<"create" | "confirm">("create");

	const handlePinChange = (value: string) => {
		// Only allow digits and limit to 6 characters
		const numericValue = value.replace(/\D/g, "").slice(0, 6);

		if (step === "create") {
			setPin(numericValue);
		} else {
			setConfirmPin(numericValue);
		}

		setError(null);
	};

	const handleCreatePin = () => {
		if (pin.length !== 6) {
			setError("PIN must be exactly 6 digits");
			return;
		}

		// Validate PIN format
		const validation = pinAuthService.validatePinFormat(pin);
		if (!validation.isValid) {
			setError(validation.error || "Invalid PIN format");
			return;
		}

		setStep("confirm");
		setError(null);
	};

	const handleConfirmPin = async () => {
		if (confirmPin.length !== 6) {
			setError("Please enter the complete PIN");
			return;
		}

		if (pin !== confirmPin) {
			setError("PINs do not match. Please try again.");
			setConfirmPin("");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const result = await pinAuthService.setup(pin);
			onResult(result);
		} catch (err) {
			console.error("PIN setup error:", err);
			setError("Failed to set up PIN. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleBack = () => {
		if (step === "confirm") {
			setStep("create");
			setConfirmPin("");
			setError(null);
		} else {
			onBack();
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			if (step === "create") {
				handleCreatePin();
			} else {
				handleConfirmPin();
			}
		}
	};

	const currentPin = step === "create" ? pin : confirmPin;
	const isComplete = currentPin.length === 6;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center space-x-3">
					<Button
						variant="ghost"
						size="sm"
						onClick={handleBack}
						className="p-2"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<CardTitle className="flex items-center space-x-2">
							<Lock className="h-5 w-5 text-primary" />
							<span>{step === "create" ? "Create PIN" : "Confirm PIN"}</span>
						</CardTitle>
						<CardDescription>
							{step === "create"
								? "Create a secure 6-digit PIN to protect your financial data"
								: "Re-enter your PIN to confirm"}
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
							value={currentPin}
							onChange={(e) => handlePinChange(e.target.value)}
							onKeyPress={handleKeyPress}
							placeholder="Enter 6-digit PIN"
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

					{/* PIN Strength Indicator */}
					<div className="flex justify-center space-x-2">
						{Array.from({ length: 6 }, (_, i) => (
							<div
								key={`pin-dot-${i}`}
								className={cn(
									"w-3 h-3 rounded-full border-2 transition-all duration-200",
									i < currentPin.length
										? "bg-primary border-primary"
										: "border-muted-foreground/30",
								)}
							/>
						))}
					</div>
				</div>

				{/* Security Tips */}
				{step === "create" && (
					<div className="space-y-3">
						<h4 className="text-sm font-medium">PIN Security Tips:</h4>
						<div className="space-y-2 text-sm text-muted-foreground">
							<div className="flex items-start space-x-2">
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
								<span>Avoid using sequential numbers (123456)</span>
							</div>
							<div className="flex items-start space-x-2">
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
								<span>Don't use repeated digits (111111)</span>
							</div>
							<div className="flex items-start space-x-2">
								<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
								<span>
									Choose a PIN that's meaningful to you but hard to guess
								</span>
							</div>
						</div>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex space-x-3">
					<Button
						variant="outline"
						onClick={handleBack}
						className="flex-1"
						disabled={isLoading}
					>
						{step === "create" ? "Cancel" : "Back"}
					</Button>
					<Button
						onClick={step === "create" ? handleCreatePin : handleConfirmPin}
						className="flex-1"
						disabled={!isComplete || isLoading}
					>
						{isLoading ? (
							<div className="flex items-center space-x-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
								<span>Setting up...</span>
							</div>
						) : step === "create" ? (
							"Continue"
						) : (
							"Create PIN"
						)}
					</Button>
				</div>

				{/* Progress Indicator */}
				<div className="flex justify-center space-x-2">
					<div
						className={cn(
							"w-2 h-2 rounded-full transition-all duration-200",
							step === "create" ? "bg-primary" : "bg-primary/50",
						)}
					/>
					<div
						className={cn(
							"w-2 h-2 rounded-full transition-all duration-200",
							step === "confirm" ? "bg-primary" : "bg-muted-foreground/30",
						)}
					/>
				</div>
			</CardContent>
		</Card>
	);
}

export default PinSetup;
