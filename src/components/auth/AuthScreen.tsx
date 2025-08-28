import {
	AlertCircle,
	CheckCircle,
	Fingerprint,
	Lock,
	Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { biometricAuthService } from "../../lib/auth/biometricAuthService";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../stores/authStore";
import type {
	AuthMethod,
	AuthResult,
	AuthState,
	BiometricCapabilities,
} from "../../types/auth";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { BiometricLogin } from "./BiometricLogin";
import { BiometricSetup } from "./BiometricSetup";

interface AuthScreenProps {
	onAuthSuccess: (result: AuthResult) => void;
	className?: string;
}

type AuthFlow =
	| "selection"
	| "pin-setup"
	| "pin-login"
	| "biometric-setup"
	| "biometric-login";

/**
 * Main authentication screen component
 * Handles the authentication flow for both PIN and biometric methods
 */
export function AuthScreen({ onAuthSuccess, className }: AuthScreenProps) {
	const { authState, initialize, getAuthState } = useAuthStore();
	const [currentFlow, setCurrentFlow] = useState<AuthFlow>("selection");
	const [_selectedMethod, setSelectedMethod] = useState<AuthMethod | null>(
		null,
	);
	const [biometricCapabilities, setBiometricCapabilities] =
		useState<BiometricCapabilities | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const initializeAuth = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Initialize authentication services
			await initialize();

			// Get current auth state
			const state = getAuthState();

			// Check biometric capabilities
			const capabilities = await biometricAuthService.getCapabilities();
			setBiometricCapabilities(capabilities);

			// Determine initial flow based on setup status
			const isSetup = isAuthSetup(state);
			if (isSetup) {
				// User has already set up authentication, show login options
				setCurrentFlow("selection");
			} else {
				// First time setup
				setCurrentFlow("selection");
			}
		} catch (err) {
			console.error("Auth initialization error:", err);
			setError("Failed to initialize authentication system");
		} finally {
			setIsLoading(false);
		}
	}, [
		initialize,
		getAuthState,
		setBiometricCapabilities,
		setCurrentFlow,
		isAuthSetup,
	]);

	useEffect(() => {
		initializeAuth();
	}, [initializeAuth]);

	const handleMethodSelection = (method: AuthMethod) => {
		setSelectedMethod(method);
		setError(null);

		if (authState && isAuthSetup(authState)) {
			// User is logging in
			if (method === "pin") {
				setCurrentFlow("pin-login");
			} else {
				setCurrentFlow("biometric-login");
			}
		} else {
			// User is setting up authentication
			if (method === "pin") {
				setCurrentFlow("pin-setup");
			} else {
				setCurrentFlow("biometric-setup");
			}
		}
	};

	const handleAuthResult = (result: AuthResult) => {
		if (result.success) {
			onAuthSuccess(result);
		} else {
			setError(result.error?.message || "Authentication failed");
			// Return to selection screen on error
			setCurrentFlow("selection");
			setSelectedMethod(null);
		}
	};

	const handleBack = () => {
		setCurrentFlow("selection");
		setSelectedMethod(null);
		setError(null);
	};

	if (isLoading) {
		return (
			<div
				className={cn(
					"flex items-center justify-center min-h-screen",
					className,
				)}
			>
				<Card className="w-full max-w-md">
					<CardContent className="flex items-center justify-center p-8">
						<div className="flex items-center space-x-3">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
							<span className="text-sm text-muted-foreground">
								Initializing authentication...
							</span>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex items-center justify-center min-h-screen bg-background",
				className,
			)}
		>
			<div className="w-full max-w-md space-y-4">
				{/* Header */}
				<div className="text-center space-y-2">
					<div className="flex items-center justify-center mb-4">
						<Shield className="h-12 w-12 text-primary" />
					</div>
					<h1 className="text-2xl font-bold tracking-tight">Secure Access</h1>
					<p className="text-sm text-muted-foreground">
						{authState && isAuthSetup(authState)
							? "Choose your authentication method"
							: "Set up your preferred authentication method"}
					</p>
				</div>

				{/* Error Alert */}
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{/* Main Content */}
				{currentFlow === "selection" && (
					<AuthMethodSelection
						biometricCapabilities={biometricCapabilities}
						isSetup={authState ? isAuthSetup(authState) : false}
						onMethodSelect={handleMethodSelection}
					/>
				)}

				{currentFlow === "pin-setup" && (
					<div className="text-center p-8">
						<p>PIN Setup Component - Coming Soon</p>
						<Button onClick={handleBack} className="mt-4">
							Back
						</Button>
					</div>
				)}

				{currentFlow === "pin-login" && (
					<div className="text-center p-8">
						<p>PIN Login Component - Coming Soon</p>
						<Button onClick={handleBack} className="mt-4">
							Back
						</Button>
					</div>
				)}

				{currentFlow === "biometric-setup" && (
					<BiometricSetup onResult={handleAuthResult} onBack={handleBack} />
				)}

				{currentFlow === "biometric-login" && (
					<BiometricLogin
						onResult={handleAuthResult}
						onBack={handleBack}
						onSwitchToPin={() => setCurrentFlow("pin-login")}
					/>
				)}
			</div>
		</div>
	);
}

interface AuthMethodSelectionProps {
	biometricCapabilities: BiometricCapabilities | null;
	isSetup: boolean;
	onMethodSelect: (method: AuthMethod) => void;
}

function AuthMethodSelection({
	biometricCapabilities,
	isSetup,
	onMethodSelect,
}: AuthMethodSelectionProps) {
	const isBiometricAvailable = biometricCapabilities?.available || false;
	const biometricType = biometricCapabilities?.supportedTypes?.[0];

	const getBiometricLabel = () => {
		if (!biometricType) return "Biometric Authentication";

		switch (biometricType) {
			case "fingerprint":
				return "Fingerprint";
			case "face":
				return "Face ID";
			case "voice":
				return "Voice Recognition";
			default:
				return "Biometric Authentication";
		}
	};

	const getBiometricDescription = () => {
		if (!biometricType) return "Use your device's biometric authentication";

		switch (biometricType) {
			case "fingerprint":
				return "Use your fingerprint to authenticate";
			case "face":
				return "Use Face ID to authenticate";
			case "voice":
				return "Use voice recognition to authenticate";
			default:
				return "Use your device's biometric authentication";
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-center">
					{isSetup ? "Sign In" : "Choose Authentication Method"}
				</CardTitle>
				<CardDescription className="text-center">
					{isSetup
						? "Select how you'd like to sign in"
						: "Select your preferred method to secure your financial data"}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* PIN Authentication Option */}
				<Button
					variant="outline"
					className="w-full h-auto p-6 flex flex-col items-center space-y-3 hover:bg-primary/5"
					onClick={() => onMethodSelect("pin")}
				>
					<Lock className="h-8 w-8 text-primary" />
					<div className="text-center">
						<div className="font-medium">6-Digit PIN</div>
						<div className="text-sm text-muted-foreground">
							{isSetup
								? "Enter your PIN to continue"
								: "Create a secure 6-digit PIN"}
						</div>
					</div>
					<Badge variant="secondary" className="text-xs">
						Always Available
					</Badge>
				</Button>

				{/* Biometric Authentication Option */}
				<Button
					variant="outline"
					className={cn(
						"w-full h-auto p-6 flex flex-col items-center space-y-3",
						isBiometricAvailable
							? "hover:bg-primary/5"
							: "opacity-50 cursor-not-allowed",
					)}
					onClick={() => isBiometricAvailable && onMethodSelect("biometric")}
					disabled={!isBiometricAvailable}
				>
					<Fingerprint className="h-8 w-8 text-primary" />
					<div className="text-center">
						<div className="font-medium">{getBiometricLabel()}</div>
						<div className="text-sm text-muted-foreground">
							{isBiometricAvailable
								? getBiometricDescription()
								: "Not available on this device"}
						</div>
					</div>
					<Badge
						variant={isBiometricAvailable ? "secondary" : "outline"}
						className="text-xs"
					>
						{isBiometricAvailable ? "Recommended" : "Unavailable"}
					</Badge>
				</Button>

				{/* Security Notice */}
				<div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg">
					<CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
					<div className="text-sm">
						<div className="font-medium mb-1">Your data is secure</div>
						<div className="text-muted-foreground">
							All authentication data is encrypted and stored locally on your
							device. We never have access to your credentials.
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/**
 * Helper function to determine if authentication is set up
 */
function isAuthSetup(authState: AuthState): boolean {
	return authState.config.pinEnabled || authState.config.biometricEnabled;
}

export default AuthScreen;
