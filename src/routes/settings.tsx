import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	SettingsContent,
	SettingsGrid,
	SettingsLayout,
	SettingsSection,
} from "../components/layout";
import GoogleDriveSettings from "../components/settings/GoogleDriveSettings";
import { NotificationSettings } from "../components/settings/NotificationSettings";
import { ProfileSettings } from "../components/settings/ProfileSettings";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { SettingsNavigation } from "../components/settings/SettingsNavigation";

export const Route = createFileRoute("/settings")({
	component: Settings,
});

function Settings() {
	const [activeSection, setActiveSection] = useState("profile");

	const renderSettingsContent = () => {
		switch (activeSection) {
			case "profile":
				return <ProfileSettings />;
			case "security":
				return <SecuritySettings />;
			case "notifications":
				return <NotificationSettings />;
			case "data":
				return <GoogleDriveSettings />;
			case "appearance":
				return (
					<div className="space-y-6">
						<div>
							<h2 className="text-xl font-mono font-bold tracking-wider uppercase mb-2">
								Appearance Settings
							</h2>
							<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
								Customize the look and feel of your dashboard
							</p>
						</div>
						<div className="p-8 text-center text-muted-foreground">
							<p>Appearance settings coming soon...</p>
						</div>
					</div>
				);
			case "export":
				return (
					<div className="space-y-6">
						<div>
							<h2 className="text-xl font-mono font-bold tracking-wider uppercase mb-2">
								Export & Import
							</h2>
							<p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
								Manage your data export and import options
							</p>
						</div>
						<div className="p-8 text-center text-muted-foreground">
							<p>Export & Import functionality coming soon...</p>
						</div>
					</div>
				);
			default:
				return <ProfileSettings />;
		}
	};

	return (
		<SettingsLayout>
			<SettingsSection>
				<h1 className="text-3xl font-bold tracking-tight">Settings</h1>
				<p className="text-muted-foreground mt-2">
					Manage your application preferences and configurations.
				</p>
			</SettingsSection>

			<SettingsGrid
				navigation={
					<SettingsNavigation
						activeSection={activeSection}
						onSectionChange={setActiveSection}
					/>
				}
				content={<SettingsContent>{renderSettingsContent()}</SettingsContent>}
			/>
		</SettingsLayout>
	);
}
