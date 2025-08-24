import { createFileRoute } from '@tanstack/react-router';
import GoogleDriveSettings from '../components/settings/GoogleDriveSettings';

export const Route = createFileRoute('/settings')({
	component: Settings,
});

function Settings() {
	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="mb-8">
					<h1 className="text-2xl font-bold tracking-tight font-mono uppercase">
						Settings
					</h1>
					<p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">
						Manage your Google Drive synchronization and data preferences
					</p>
					<div className="h-px bg-gradient-to-r from-primary via-primary/50 to-transparent mt-4" />
				</div>

				<GoogleDriveSettings />
			</div>
		</div>
	);
}