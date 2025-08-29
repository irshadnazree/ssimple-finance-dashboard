import {
	AlertTriangle,
	Eye,
	EyeOff,
	Fingerprint,
	Key,
	Lock,
	Settings,
	Shield,
	Smartphone,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import { biometricAuthService } from "../../lib/auth/biometricAuthService";
import { useToast } from "../../lib/hooks/useToast";
import { useAuthStore } from "../../stores/authStore";
import type { AuthState, BiometricCapabilities } from "../../types/auth";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

interface SecurityData {
	twoFactorEnabled: boolean;
	loginNotifications: boolean;
	sessionTimeout: number;
	passwordLastChanged: string;
}

interface AuthenticationData {
	pinEnabled: boolean;
	biometricEnabled: boolean;
	autoLockEnabled: boolean;
	lastAuthActivity: string;
}

export function SecuritySettings() {
	const { initialize, getAuthState, updateConfig } = useAuthStore();
	const [securityData, setSecurityData] = useState<SecurityData>({
		twoFactorEnabled: false,
		loginNotifications: true,
		sessionTimeout: 30,
		passwordLastChanged: "2024-01-15",
	});

	const [authData, setAuthData] = useState<AuthenticationData>({
		pinEnabled: false,
		biometricEnabled: false,
		autoLockEnabled: true,
		lastAuthActivity: new Date().toISOString(),
	});

	const [authState, setAuthState] = useState<AuthState | null>(null);
	const [biometricCapabilities, setBiometricCapabilities] =
		useState<BiometricCapabilities | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const currentPasswordId = useId();
	const newPasswordId = useId();
	const confirmPasswordId = useId();
	const sessionTimeoutId = useId();
	const [passwords, setPasswords] = useState({
		current: "",
		new: "",
		confirm: "",
	});

	const { toast } = useToast();

	// Load authentication state on component mount
	useEffect(() => {
		const loadAuthState = async () => {
			try {
				setIsLoading(true);
				await initialize();
				const state = await getAuthState();
				setAuthState(state);

				// Update auth data based on current state
				setAuthData((prev) => ({
					...prev,
					pinEnabled: state.config.pinEnabled,
					biometricEnabled: state.config.biometricEnabled,
					autoLockEnabled: state.config.autoLockEnabled,
				}));

				// Get biometric capabilities
				const capabilities = await biometricAuthService.getCapabilities();
				setBiometricCapabilities(capabilities);
			} catch (error) {
				console.error("Failed to load auth state:", error);
				toast({
					title: "Error",
					description: "Failed to load authentication settings",
					variant: "destructive",
				});
			} finally {
				setIsLoading(false);
			}
		};

		loadAuthState();
	}, [initialize, getAuthState, toast]);

	const handleSecurityUpdate = (
		field: keyof SecurityData,
		value: boolean | number,
	) => {
		setSecurityData((prev) => ({ ...prev, [field]: value }));
		toast({
			title: "Security Setting Updated",
			description: `${field} has been updated successfully.`,
		});
	};

	const handlePasswordChange = (e: React.FormEvent) => {
		e.preventDefault();
		if (passwords.new !== passwords.confirm) {
			toast({
				title: "Password Mismatch",
				description: "New password and confirmation do not match.",
				variant: "destructive",
			});
			return;
		}

		// Here you would typically validate and save the new password
		console.log("Changing password...");
		toast({
			title: "Password Changed",
			description: "Your password has been updated successfully.",
			variant: "success",
		});

		// Reset form
		setPasswords({ current: "", new: "", confirm: "" });
	};

	const handleAuthUpdate = async (
		field: keyof AuthenticationData,
		value: boolean | number,
	) => {
		try {
			setIsLoading(true);

			// Update local state
			setAuthData((prev) => ({ ...prev, [field]: value }));

			// Update auth service configuration
			if (authState) {
				await updateConfig({
					[field]: value,
				});
			}

			toast({
				title: "Authentication Setting Updated",
				description: `${field} has been updated successfully.`,
			});
		} catch (error) {
			console.error("Failed to update auth setting:", error);
			toast({
				title: "Error",
				description: "Failed to update authentication setting",
				variant: "destructive",
			});
			// Revert local state on error
			setAuthData((prev) => ({ ...prev, [field]: !value }));
		} finally {
			setIsLoading(false);
		}
	};

	const handleResetAuth = async (method: "pin" | "biometric") => {
		try {
			setIsLoading(true);

			// This would typically show a confirmation dialog first
			if (method === "pin") {
				// Reset PIN authentication
				await updateConfig({ pinEnabled: false });
				setAuthData((prev) => ({ ...prev, pinEnabled: false }));
			} else {
				// Reset biometric authentication
				await updateConfig({ biometricEnabled: false });
				setAuthData((prev) => ({ ...prev, biometricEnabled: false }));
			}

			toast({
				title: "Authentication Reset",
				description: `${method} authentication has been disabled.`,
			});
		} catch (error) {
			console.error("Failed to reset auth:", error);
			toast({
				title: "Error",
				description: "Failed to reset authentication method",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const getBiometricTypeLabel = () => {
		if (!biometricCapabilities?.available) return "Biometric";
		const types = biometricCapabilities.supportedTypes;
		if (types.includes("face")) return "Face ID";
		if (types.includes("fingerprint")) return "Fingerprint";
		if (types.includes("voice")) return "Voice Recognition";
		return "Biometric";
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="flex items-center gap-2 text-xl font-mono font-bold tracking-wider uppercase mb-2">
					<Shield className="h-5 w-5" />
					Security Settings
				</h2>
				<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
					Manage your account security and authentication
				</p>
			</div>

			{/* Password Change */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Key className="h-4 w-4" />
						Change Password
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handlePasswordChange} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor={currentPasswordId}>Current Password</Label>
							<div className="relative">
								<Input
									id={currentPasswordId}
									type={showCurrentPassword ? "text" : "password"}
									value={passwords.current}
									onChange={(e) =>
										setPasswords((prev) => ({
											...prev,
											current: e.target.value,
										}))
									}
									placeholder="Enter current password"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
									onClick={() => setShowCurrentPassword(!showCurrentPassword)}
								>
									{showCurrentPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor={newPasswordId}>New Password</Label>
							<div className="relative">
								<Input
									id={newPasswordId}
									type={showNewPassword ? "text" : "password"}
									value={passwords.new}
									onChange={(e) =>
										setPasswords((prev) => ({ ...prev, new: e.target.value }))
									}
									placeholder="Enter new password"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
									onClick={() => setShowNewPassword(!showNewPassword)}
								>
									{showNewPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor={confirmPasswordId}>Confirm New Password</Label>
							<div className="relative">
								<Input
									id={confirmPasswordId}
									type={showConfirmPassword ? "text" : "password"}
									value={passwords.confirm}
									onChange={(e) =>
										setPasswords((prev) => ({
											...prev,
											confirm: e.target.value,
										}))
									}
									placeholder="Confirm new password"
									required
								/>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="absolute right-2 top-1/2 -translate-y-1/2 h-auto p-1"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								>
									{showConfirmPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>

						<Button type="submit" className="w-full">
							Update Password
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Two-Factor Authentication */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Smartphone className="h-4 w-4" />
						Two-Factor Authentication
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Enable 2FA</h4>
							<p className="text-sm text-muted-foreground">
								Add an extra layer of security to your account
							</p>
						</div>
						<Switch
							checked={securityData.twoFactorEnabled}
							onCheckedChange={(checked) =>
								handleSecurityUpdate("twoFactorEnabled", checked)
							}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Login Notifications</h4>
							<p className="text-sm text-muted-foreground">
								Get notified when someone logs into your account
							</p>
						</div>
						<Switch
							checked={securityData.loginNotifications}
							onCheckedChange={(checked) =>
								handleSecurityUpdate("loginNotifications", checked)
							}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor={sessionTimeoutId}>Session Timeout (minutes)</Label>
						<Input
							id={sessionTimeoutId}
							type="number"
							min="5"
							max="120"
							value={securityData.sessionTimeout}
							onChange={(e) =>
								handleSecurityUpdate(
									"sessionTimeout",
									Number.parseInt(e.target.value, 10),
								)
							}
							className="w-32"
						/>
						<p className="text-xs text-muted-foreground">
							Automatic logout after inactivity
						</p>
					</div>

					<div className="pt-4 border-t">
						<p className="text-sm text-muted-foreground">
							Password last changed:{" "}
							{new Date(securityData.passwordLastChanged).toLocaleDateString()}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Authentication Methods */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lock className="h-4 w-4" />
						Authentication Methods
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					{isLoading && (
						<Alert>
							<Settings className="h-4 w-4" />
							<AlertDescription>
								Loading authentication settings...
							</AlertDescription>
						</Alert>
					)}

					{/* PIN Authentication */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<Lock className="h-4 w-4 text-primary" />
								</div>
								<div>
									<h4 className="font-medium">PIN Authentication</h4>
									<p className="text-sm text-muted-foreground">
										Secure 6-digit PIN for quick access
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Badge variant={authData.pinEnabled ? "default" : "secondary"}>
									{authData.pinEnabled ? "Enabled" : "Disabled"}
								</Badge>
								<Switch
									checked={authData.pinEnabled}
									onCheckedChange={(checked) =>
										handleAuthUpdate("pinEnabled", checked)
									}
									disabled={isLoading}
								/>
							</div>
						</div>

						{authData.pinEnabled && (
							<div className="ml-11 space-y-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleResetAuth("pin")}
									disabled={isLoading}
								>
									Change PIN
								</Button>
								<p className="text-xs text-muted-foreground">
									Last used:{" "}
									{new Date(authData.lastAuthActivity).toLocaleDateString()}
								</p>
							</div>
						)}
					</div>

					{/* Biometric Authentication */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<Fingerprint className="h-4 w-4 text-primary" />
								</div>
								<div>
									<h4 className="font-medium">
										{getBiometricTypeLabel()} Authentication
									</h4>
									<p className="text-sm text-muted-foreground">
										{biometricCapabilities?.available
											? "Use your biometric data for secure access"
											: "Not available on this device"}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Badge
									variant={
										!biometricCapabilities?.available
											? "outline"
											: authData.biometricEnabled
												? "default"
												: "secondary"
									}
								>
									{!biometricCapabilities?.available
										? "Unavailable"
										: authData.biometricEnabled
											? "Enabled"
											: "Disabled"}
								</Badge>
								<Switch
									checked={authData.biometricEnabled}
									onCheckedChange={(checked) =>
										handleAuthUpdate("biometricEnabled", checked)
									}
									disabled={isLoading || !biometricCapabilities?.available}
								/>
							</div>
						</div>

						{authData.biometricEnabled && biometricCapabilities?.available && (
							<div className="ml-11 space-y-2">
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="text-xs">
										{biometricCapabilities.supportedTypes.join(", ")}
									</Badge>
									<Badge variant="outline" className="text-xs">
										{biometricCapabilities.platform}
									</Badge>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleResetAuth("biometric")}
									disabled={isLoading}
								>
									Reset Biometric
								</Button>
							</div>
						)}
					</div>

					{/* Auto-Lock Settings */}
					<div className="space-y-4 pt-4 border-t">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="font-medium">Auto-Lock</h4>
								<p className="text-sm text-muted-foreground">
									Automatically lock the app when inactive
								</p>
							</div>
							<Switch
								checked={authData.autoLockEnabled}
								onCheckedChange={(checked) =>
									handleAuthUpdate("autoLockEnabled", checked)
								}
								disabled={isLoading}
							/>
						</div>

						{/* Security Notice */}
						{!authData.pinEnabled && !authData.biometricEnabled && (
							<Alert>
								<AlertTriangle className="h-4 w-4" />
								<AlertDescription>
									No authentication methods are currently enabled. Your
									financial data may be at risk.
								</AlertDescription>
							</Alert>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
