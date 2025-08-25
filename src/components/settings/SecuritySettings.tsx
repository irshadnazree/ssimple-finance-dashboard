import { Shield, Key, Smartphone, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useToast } from "../../lib/hooks/useToast";

interface SecurityData {
	twoFactorEnabled: boolean;
	loginNotifications: boolean;
	sessionTimeout: number;
	passwordLastChanged: string;
}

export function SecuritySettings() {
	const [securityData, setSecurityData] = useState<SecurityData>({
		twoFactorEnabled: false,
		loginNotifications: true,
		sessionTimeout: 30,
		passwordLastChanged: "2024-01-15",
	});

	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [passwords, setPasswords] = useState({
		current: "",
		new: "",
		confirm: "",
	});

	const { toast } = useToast();

	const handleSecurityUpdate = (field: keyof SecurityData, value: boolean | number) => {
		setSecurityData(prev => ({ ...prev, [field]: value }));
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
		console.log('Changing password...');
		toast({
			title: "Password Changed",
			description: "Your password has been updated successfully.",
			variant: "success",
		});

		// Reset form
		setPasswords({ current: "", new: "", confirm: "" });
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
							<Label htmlFor="current-password">Current Password</Label>
							<div className="relative">
								<Input
									id="current-password"
									type={showCurrentPassword ? "text" : "password"}
									value={passwords.current}
									onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
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
									{showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="new-password">New Password</Label>
							<div className="relative">
								<Input
									id="new-password"
									type={showNewPassword ? "text" : "password"}
									value={passwords.new}
									onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
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
									{showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								</Button>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm New Password</Label>
							<div className="relative">
								<Input
									id="confirm-password"
									type={showConfirmPassword ? "text" : "password"}
									value={passwords.confirm}
									onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
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
									{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
							onCheckedChange={(checked) => handleSecurityUpdate('twoFactorEnabled', checked)}
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
							onCheckedChange={(checked) => handleSecurityUpdate('loginNotifications', checked)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
						<Input
							id="session-timeout"
							type="number"
							min="5"
							max="120"
							value={securityData.sessionTimeout}
							onChange={(e) => handleSecurityUpdate('sessionTimeout', Number.parseInt(e.target.value))}
							className="w-32"
						/>
						<p className="text-xs text-muted-foreground">
							Automatic logout after inactivity
						</p>
					</div>

					<div className="pt-4 border-t">
						<p className="text-sm text-muted-foreground">
							Password last changed: {new Date(securityData.passwordLastChanged).toLocaleDateString()}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}