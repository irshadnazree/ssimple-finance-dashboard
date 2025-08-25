import { Bell, Mail, Smartphone, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { useToast } from "../../lib/hooks/useToast";

interface NotificationData {
	emailNotifications: {
		transactionAlerts: boolean;
		budgetWarnings: boolean;
		weeklyReports: boolean;
		monthlyStatements: boolean;
		securityAlerts: boolean;
	};
	pushNotifications: {
		transactionAlerts: boolean;
		budgetWarnings: boolean;
		goalReminders: boolean;
		billReminders: boolean;
	};
	soundEnabled: boolean;
	quietHours: {
		enabled: boolean;
		startTime: string;
		endTime: string;
	};
}

export function NotificationSettings() {
	const [notificationData, setNotificationData] = useState<NotificationData>({
		emailNotifications: {
			transactionAlerts: true,
			budgetWarnings: true,
			weeklyReports: false,
			monthlyStatements: true,
			securityAlerts: true,
		},
		pushNotifications: {
			transactionAlerts: true,
			budgetWarnings: true,
			goalReminders: false,
			billReminders: true,
		},
		soundEnabled: true,
		quietHours: {
			enabled: false,
			startTime: "22:00",
			endTime: "08:00",
		},
	});

	const { toast } = useToast();

	const handleEmailNotificationChange = (key: keyof NotificationData['emailNotifications'], value: boolean) => {
		setNotificationData(prev => ({
			...prev,
			emailNotifications: {
				...prev.emailNotifications,
				[key]: value,
			},
		}));
		toast({
			title: "Email Notification Updated",
			description: `${key} setting has been updated.`,
		});
	};

	const handlePushNotificationChange = (key: keyof NotificationData['pushNotifications'], value: boolean) => {
		setNotificationData(prev => ({
			...prev,
			pushNotifications: {
				...prev.pushNotifications,
				[key]: value,
			},
		}));
		toast({
			title: "Push Notification Updated",
			description: `${key} setting has been updated.`,
		});
	};

	const handleQuietHoursChange = (field: 'enabled' | 'startTime' | 'endTime', value: boolean | string) => {
		setNotificationData(prev => ({
			...prev,
			quietHours: {
				...prev.quietHours,
				[field]: value,
			},
		}));
	};

	const testNotification = () => {
		toast({
			title: "Test Notification",
			description: "This is how your notifications will appear.",
			variant: "success",
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="flex items-center gap-2 text-xl font-mono font-bold tracking-wider uppercase mb-2">
					<Bell className="h-5 w-5" />
					Notification Settings
				</h2>
				<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
					Customize how and when you receive notifications
				</p>
			</div>

			{/* Email Notifications */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Mail className="h-4 w-4" />
						Email Notifications
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Transaction Alerts</h4>
							<p className="text-sm text-muted-foreground">
								Get notified when transactions are processed
							</p>
						</div>
						<Switch
							checked={notificationData.emailNotifications.transactionAlerts}
							onCheckedChange={(checked) => handleEmailNotificationChange('transactionAlerts', checked)}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Budget Warnings</h4>
							<p className="text-sm text-muted-foreground">
								Receive alerts when approaching budget limits
							</p>
						</div>
						<Switch
							checked={notificationData.emailNotifications.budgetWarnings}
							onCheckedChange={(checked) => handleEmailNotificationChange('budgetWarnings', checked)}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Weekly Reports</h4>
							<p className="text-sm text-muted-foreground">
								Receive weekly financial summaries
							</p>
						</div>
						<Switch
							checked={notificationData.emailNotifications.weeklyReports}
							onCheckedChange={(checked) => handleEmailNotificationChange('weeklyReports', checked)}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Monthly Statements</h4>
							<p className="text-sm text-muted-foreground">
								Receive monthly account statements
							</p>
						</div>
						<Switch
							checked={notificationData.emailNotifications.monthlyStatements}
							onCheckedChange={(checked) => handleEmailNotificationChange('monthlyStatements', checked)}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Security Alerts</h4>
							<p className="text-sm text-muted-foreground">
								Important security-related notifications
							</p>
						</div>
						<Switch
							checked={notificationData.emailNotifications.securityAlerts}
							onCheckedChange={(checked) => handleEmailNotificationChange('securityAlerts', checked)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Push Notifications */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Smartphone className="h-4 w-4" />
						Push Notifications
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Transaction Alerts</h4>
							<p className="text-sm text-muted-foreground">
								Instant notifications for transactions
							</p>
						</div>
						<Switch
							checked={notificationData.pushNotifications.transactionAlerts}
							onCheckedChange={(checked) => handlePushNotificationChange('transactionAlerts', checked)}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Budget Warnings</h4>
							<p className="text-sm text-muted-foreground">
								Push alerts for budget limits
							</p>
						</div>
						<Switch
							checked={notificationData.pushNotifications.budgetWarnings}
							onCheckedChange={(checked) => handlePushNotificationChange('budgetWarnings', checked)}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Goal Reminders</h4>
							<p className="text-sm text-muted-foreground">
								Reminders about financial goals
							</p>
						</div>
						<Switch
							checked={notificationData.pushNotifications.goalReminders}
							onCheckedChange={(checked) => handlePushNotificationChange('goalReminders', checked)}
						/>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Bill Reminders</h4>
							<p className="text-sm text-muted-foreground">
								Reminders for upcoming bills
							</p>
						</div>
						<Switch
							checked={notificationData.pushNotifications.billReminders}
							onCheckedChange={(checked) => handlePushNotificationChange('billReminders', checked)}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Sound & Quiet Hours */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Volume2 className="h-4 w-4" />
						Sound & Quiet Hours
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Sound Notifications</h4>
							<p className="text-sm text-muted-foreground">
								Play sound with notifications
							</p>
						</div>
						<Switch
							checked={notificationData.soundEnabled}
							onCheckedChange={(checked) => setNotificationData(prev => ({ ...prev, soundEnabled: checked }))}
						/>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<h4 className="font-medium">Quiet Hours</h4>
								<p className="text-sm text-muted-foreground">
									Silence notifications during specified hours
								</p>
							</div>
							<Switch
								checked={notificationData.quietHours.enabled}
								onCheckedChange={(checked) => handleQuietHoursChange('enabled', checked)}
							/>
						</div>

						{notificationData.quietHours.enabled && (
							<div className="grid grid-cols-2 gap-4 pl-4">
								<div className="space-y-2">
									<Label htmlFor="start-time">Start Time</Label>
									<input
										id="start-time"
										type="time"
										value={notificationData.quietHours.startTime}
										onChange={(e) => handleQuietHoursChange('startTime', e.target.value)}
										className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="end-time">End Time</Label>
									<input
										id="end-time"
										type="time"
										value={notificationData.quietHours.endTime}
										onChange={(e) => handleQuietHoursChange('endTime', e.target.value)}
										className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
									/>
								</div>
							</div>
						)}
					</div>

					<div className="pt-4 border-t">
						<Button onClick={testNotification} variant="outline" className="w-full">
							Test Notification
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}