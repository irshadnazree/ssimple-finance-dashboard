import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	Fingerprint,
	Info,
	Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { biometricAuthService } from "../../lib/auth/biometricAuthService";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import type { AuthResult, BiometricCapabilities } from "../../types/auth";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";

interface BiometricSetupProps {
	onResult: (result: AuthResult) => void;
	onBack: () => void;
}

type SetupStep = "check" | "consent" | "setup" | "complete";

/**
 * Biometric Setup Component
 * Handles the setup of biometric authentication
 */
export function BiometricSetup({ onResult, onBack }: BiometricSetupProps) {
	const { setupAuth } = useAuthStore();
	const [step, setStep] = useState<SetupStep>("check");
	const [capabilities, setCapabilities] =
		useState<BiometricCapabilities | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		checkBiometricCapabilities();
	}, []);

	const checkBiometricCapabilities = async () => {
		try {
			setIsLoading(true);
			setError(null);

			const caps = await biometricAuthService.getCapabilities();
			setCapabilities(caps);

			if (!caps.available) {
				setError("Biometric authentication is not available on this device");
				return;
			}

			if (!caps.enrolled) {
				setError(
					"No biometric credentials are enrolled on this device. Please set up biometric authentication in your system settings first.",
				);
				return;
			}

			setStep("consent");
		} catch (err) {
			console.error("Biometric capability check error:", err);
			setError("Failed to check biometric capabilities");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSetup = async () => {
		if (!capabilities?.available) {
			setError("Biometric authentication is not available");
			return;
		}

		try {
			setIsLoading(true);
			setError(null);
			setStep("setup");

			const result = await setupAuth("biometric", { biometricConsent: true });

			if (result.success) {
				setStep("complete");
				// Give user a moment to see the success message
				setTimeout(() => {
					onResult(result);
				}, 1500);
			} else {
				setError(result.error?.message || "Biometric setup failed");
				setStep("consent");
			}
		} catch (err) {
			console.error("Biometric setup error:", err);
			setError("Failed to set up biometric authentication");
			setStep("consent");
		} finally {
			setIsLoading(false);
		}
	};

	const getBiometricTypeLabel = () => {
		if (!capabilities?.supportedTypes?.length) return "Biometric";

		const type = capabilities.supportedTypes[0];
		switch (type) {
			case "fingerprint":
				return "Fingerprint";
			case "face":
				return "Face ID";
			case "voice":
				return "Voice Recognition";
			default:
				return "Biometric";
		}
	};

	const getBiometricIcon = () => {
		if (!capabilities?.supportedTypes?.length) return Fingerprint;

		const type = capabilities.supportedTypes[0];
		switch (type) {
			case "fingerprint":
				return Fingerprint;
			case "face":
				return Shield; // You might want to use a face icon here
			case "voice":
				return Shield; // You might want to use a microphone icon here
			default:
				return Fingerprint;
		}
	};

	const BiometricIcon = getBiometricIcon();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center space-x-3">
					<Button
						variant="ghost"
						size="sm"
						onClick={onBack}
						className="p-2"
						disabled={isLoading && step === "setup"}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<CardTitle className="flex items-center space-x-2">
							<BiometricIcon className="h-5 w-5 text-primary" />
							<span>Setup {getBiometricTypeLabel()}</span>
						</CardTitle>
						<CardDescription>
							{step === "check" && "Checking biometric capabilities..."}
							{step === "consent" &&
								`Set up ${getBiometricTypeLabel().toLowerCase()} authentication for secure access`}
							{step === "setup" && "Setting up biometric authentication..."}
							{step === "complete" &&
								"Biometric authentication setup complete!"}
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

				{/* Loading State */}
				{step === "check" && isLoading && (
					<div className="flex items-center justify-center p-8">
						<div className="flex items-center space-x-3">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
							<span className="text-sm text-muted-foreground">
								Checking device capabilities...
							</span>
						</div>
					</div>
				)}

				{/* Consent Step */}
				{step === "consent" && capabilities && (
					<div className="space-y-6">
						{/* Biometric Info */}
						<div className="text-center space-y-4">
							<div className="flex justify-center">
								<div className="p-4 bg-primary/10 rounded-full">
									<BiometricIcon className="h-12 w-12 text-primary" />
								</div>
							</div>
							<div>
								<h3 className="text-lg font-medium">
									{getBiometricTypeLabel()} Authentication
								</h3>
								<p className="text-sm text-muted-foreground mt-2">
									Use your {getBiometricTypeLabel().toLowerCase()} to quickly
									and securely access your financial dashboard.
								</p>
							</div>
						</div>

						{/* Benefits */}
						<div className="space-y-3">
							<h4 className="text-sm font-medium">Benefits:</h4>
							<div className="space-y-2 text-sm text-muted-foreground">
								<div className="flex items-start space-x-2">
									<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
									<span>Faster authentication than PIN</span>
								</div>
								<div className="flex items-start space-x-2">
									<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
									<span>More secure than traditional passwords</span>
								</div>
								<div className="flex items-start space-x-2">
									<CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
									<span>No need to remember complex credentials</span>
								</div>
							</div>
						</div>

						{/* Privacy Notice */}
						<Alert>
							<Info className="h-4 w-4" />
							<AlertDescription>
								Your biometric data is processed locally on your device and
								never transmitted or stored on our servers.
							</AlertDescription>
						</Alert>
					</div>
				)}

				{/* Setup Step */}
				{step === "setup" && (
					<div className="text-center space-y-4 p-8">
						<div className="flex justify-center">
							<div className="p-4 bg-primary/10 rounded-full animate-pulse">
								<BiometricIcon className="h-12 w-12 text-primary" />
							</div>
						</div>
						<div>
							<h3 className="text-lg font-medium">
								Setting up {getBiometricTypeLabel()}...
							</h3>
							<p className="text-sm text-muted-foreground mt-2">
								Please follow the prompts from your device to complete the
								setup.
							</p>
						</div>
					</div>
				)}

				{/* Complete Step */}
				{step === "complete" && (
					<div className="text-center space-y-4 p-8">
						<div className="flex justify-center">
							<div className="p-4 bg-green-100 rounded-full">
								<CheckCircle className="h-12 w-12 text-green-600" />
							</div>
						</div>
						<div>
							<h3 className="text-lg font-medium text-green-600">
								Setup Complete!
							</h3>
							<p className="text-sm text-muted-foreground mt-2">
								{getBiometricTypeLabel()} authentication has been successfully
								configured.
							</p>
						</div>
					</div>
				)}

				{/* Action Buttons */}
				{step === "consent" && (
					<div className="flex space-x-3">
						<Button
							variant="outline"
							onClick={onBack}
							className="flex-1"
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSetup}
							className="flex-1"
							disabled={isLoading || !capabilities?.available}
						>
							Setup {getBiometricTypeLabel()}
						</Button>
					</div>
				)}

				{step === "setup" && (
					<div className="flex justify-center">
						<Button variant="outline" onClick={onBack} disabled={isLoading}>
							Cancel Setup
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default BiometricSetup;
