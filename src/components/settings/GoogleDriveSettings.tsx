import { useEffect, useState } from "react";
import type { SyncResult } from "../../lib/sync/googleDrive";
import {
	getGoogleDriveSync,
	initializeGoogleDriveSync,
} from "../../lib/sync/googleDrive";
import { useTransactionStore } from "../../stores/transactionStore";
import type { SyncStatus } from "../../types/finance";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Select } from "../ui/select";
import { Switch } from "../ui/switch";

interface FileUploadResult {
	success: boolean;
	fileName: string;
	recordsProcessed: number;
	errorMessage?: string;
}

interface SyncStats {
	totalSyncs: number;
	lastSyncDate: Date | null;
	successfulSyncs: number;
	failedSyncs: number;
	conflictsResolved: number;
}

export default function GoogleDriveSettings() {
	const { importTransactions } = useTransactionStore();
	const [isConnected, setIsConnected] = useState(false);
	const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
	const [isSyncing, setIsSyncing] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(
		null,
	);
	const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
	const [autoSync, setAutoSync] = useState(false);
	const [syncFrequency, setSyncFrequency] = useState("daily");
	const [fileTypeFilter, setFileTypeFilter] = useState("all");
	const [conflictResolution, setConflictResolution] = useState("merge");
	const [syncStats, setSyncStats] = useState<SyncStats>({
		totalSyncs: 0,
		lastSyncDate: null,
		successfulSyncs: 0,
		failedSyncs: 0,
		conflictsResolved: 0,
	});
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	// Initialize Google Drive sync
	useEffect(() => {
		const config = {
			clientId: process.env.GOOGLE_CLIENT_ID || "demo-client-id",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "demo-secret",
			redirectUri: `${window.location.origin}/settings`,
			scopes: ["https://www.googleapis.com/auth/drive.file"],
		};
		initializeGoogleDriveSync(config);
		checkConnectionStatus();
		loadSyncStats();
	}, []);

	// Load sync status periodically
	useEffect(() => {
		const interval = setInterval(async () => {
			if (isConnected) {
				await loadSyncStatus();
			}
		}, 30000); // Check every 30 seconds

		return () => clearInterval(interval);
	}, [isConnected]);

	const checkConnectionStatus = async () => {
		try {
			const driveSync = getGoogleDriveSync();
			if (driveSync) {
				const connected = driveSync.isSignedIn();
				setIsConnected(connected);
				if (connected) {
					await loadSyncStatus();
				}
			}
		} catch (err) {
			console.error("Error checking connection status:", err);
		}
	};

	const loadSyncStatus = async () => {
		try {
			const driveSync = getGoogleDriveSync();
			if (driveSync) {
				const status = await driveSync.getSyncStatus();
				setSyncStatus(status);
				setAutoSync(status.autoSync);
			}
		} catch (err) {
			console.error("Error loading sync status:", err);
		}
	};

	const loadSyncStats = () => {
		// Load from localStorage or API
		const stored = localStorage.getItem("sync_stats");
		if (stored) {
			const stats = JSON.parse(stored);
			setSyncStats({
				...stats,
				lastSyncDate: stats.lastSyncDate ? new Date(stats.lastSyncDate) : null,
			});
		}
	};

	const updateSyncStats = (result: SyncResult) => {
		const newStats = {
			...syncStats,
			totalSyncs: syncStats.totalSyncs + 1,
			lastSyncDate: new Date(),
			successfulSyncs: result.success
				? syncStats.successfulSyncs + 1
				: syncStats.successfulSyncs,
			failedSyncs: result.success
				? syncStats.failedSyncs
				: syncStats.failedSyncs + 1,
			conflictsResolved:
				syncStats.conflictsResolved + (result.conflicts?.length || 0),
		};
		setSyncStats(newStats);
		localStorage.setItem("sync_stats", JSON.stringify(newStats));
	};

	const connectToGoogleDrive = async () => {
		try {
			const driveSync = getGoogleDriveSync();
			if (driveSync) {
				const authUrl = driveSync.getAuthUrl();
				window.location.href = authUrl;
			}
		} catch (err) {
			setError("Failed to connect to Google Drive");
		}
	};

	const disconnectFromGoogleDrive = async () => {
		try {
			const driveSync = getGoogleDriveSync();
			if (driveSync) {
				await driveSync.signOut();
				setIsConnected(false);
				setSyncStatus(null);
				setSuccess("Disconnected from Google Drive");
			}
		} catch (err) {
			setError("Failed to disconnect from Google Drive");
		}
	};

	const handleFileUpload = async () => {
		if (!selectedFile) return;

		setUploadProgress(0);
		setUploadResult(null);
		setError(null);

		try {
			const fileContent = await selectedFile.text();
			setUploadProgress(25);

			let data: Record<string, unknown>[] | Record<string, unknown>;
			if (selectedFile.name.endsWith(".json")) {
				data = JSON.parse(fileContent);
			} else if (selectedFile.name.endsWith(".csv")) {
				// Simple CSV parsing - in production, use a proper CSV parser
				const lines = fileContent.split("\n");
				const headers = lines[0].split(",");
				data = lines.slice(1).map((line) => {
					const values = line.split(",");
					return headers.reduce(
						(obj: Record<string, string>, header, index) => {
							obj[header.trim()] = values[index]?.trim() || "";
							return obj;
						},
						{},
					);
				});
			} else {
				throw new Error("Unsupported file format");
			}

			setUploadProgress(50);

			// Process the data using transaction store
			const result = await importTransactions(JSON.stringify(data), "json");
			setUploadProgress(100);

			setUploadResult({
				success: true,
				fileName: selectedFile.name,
				recordsProcessed: Array.isArray(data) ? data.length : 1,
			});
			setSuccess(
				`Successfully imported ${Array.isArray(data) ? data.length : 1} records`,
			);
		} catch (err) {
			setUploadProgress(0);
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
			setUploadResult({
				success: false,
				fileName: selectedFile.name,
				recordsProcessed: 0,
				errorMessage: errorMessage,
			});
			setError(`Failed to import file: ${errorMessage}`);
		}
	};

	const handleSync = async () => {
		if (!isConnected) return;

		setIsSyncing(true);
		setError(null);
		setSuccess(null);
		setSyncResult(null);

		try {
			const driveSync = getGoogleDriveSync();
			if (driveSync) {
				const result = await driveSync.syncData(
					conflictResolution as "merge" | "overwrite_local" | "overwrite_cloud",
				);
				setSyncResult(result);
				updateSyncStats(result);

				if (result.success) {
					setSuccess("Synchronization completed successfully");
				} else if (result.conflicts && result.conflicts.length > 0) {
					setError(
						`Synchronization completed with ${result.conflicts.length} conflicts`,
					);
				} else {
					setError(result.error || "Synchronization failed");
				}
			}
		} catch (err) {
			setError(
				`Synchronization failed: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		} finally {
			setIsSyncing(false);
		}
	};

	const handleAutoSyncToggle = async (enabled: boolean) => {
		try {
			const driveSync = getGoogleDriveSync();
			if (driveSync) {
				await driveSync.setAutoSync(enabled);
				setAutoSync(enabled);
				setSuccess(`Auto-sync ${enabled ? "enabled" : "disabled"}`);
			}
		} catch (err) {
			setError("Failed to update auto-sync setting");
		}
	};

	const clearSyncHistory = () => {
		localStorage.removeItem("sync_stats");
		localStorage.removeItem("last_sync_date");
		localStorage.removeItem("sync_conflicts");
		setSyncStats({
			totalSyncs: 0,
			lastSyncDate: null,
			successfulSyncs: 0,
			failedSyncs: 0,
			conflictsResolved: 0,
		});
		setSuccess("Sync history cleared");
	};

	const formatDate = (date: Date | null) => {
		if (!date) return "Never";
		return new Intl.DateTimeFormat("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	};

	return (
		<div className="space-y-8">
			{/* Status Messages */}
			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}
			{success && (
				<Alert>
					<AlertDescription className="text-green-600">
						{success}
					</AlertDescription>
				</Alert>
			)}

			{/* Connection Status */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<span>Google Drive Connection</span>
							<Badge variant={isConnected ? "default" : "outline"}>
								{isConnected ? "Connected" : "Disconnected"}
							</Badge>
						</CardTitle>
						{isConnected ? (
							<Button variant="outline" onClick={disconnectFromGoogleDrive}>
								Disconnect
							</Button>
						) : (
							<Button onClick={connectToGoogleDrive}>
								Connect to Google Drive
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="bg-card/40 backdrop-blur-sm p-4">
								<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
									Status
								</div>
								<div className="text-lg font-mono font-bold">
									{syncStatus?.isOnline ? "Online" : "Offline"}
								</div>
							</div>
							<div className="bg-card/40 backdrop-blur-sm p-4">
								<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
									Last Sync
								</div>
								<div className="text-lg font-mono font-bold">
									{formatDate(syncStatus?.lastSync ?? null)}
								</div>
							</div>
							<div className="bg-card/40 backdrop-blur-sm p-4">
								<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
									Conflicts
								</div>
								<div className="text-lg font-mono font-bold">
									{syncStatus?.conflictCount || 0}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* File Upload Interface */}
			<Card>
				<CardHeader>
					<CardTitle>Import Data from Files</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="file-upload">Select File</Label>
							<Input
								id="file-upload"
								type="file"
								accept=".json,.csv,.xlsx"
								onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
								className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
							/>
							<div className="text-sm text-muted-foreground font-mono">
								Supported formats: JSON, CSV, Excel (.xlsx)
							</div>
						</div>

						{selectedFile && (
							<div className="bg-card/40 backdrop-blur-sm p-4">
								<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-2">
									Selected File
								</div>
								<div className="font-mono">{selectedFile.name}</div>
								<div className="text-sm text-muted-foreground font-mono">
									{(selectedFile.size / 1024).toFixed(2)} KB
								</div>
							</div>
						)}

						{uploadProgress > 0 && uploadProgress < 100 && (
							<div className="space-y-2">
								<div className="flex justify-between text-sm font-mono">
									<span>Uploading...</span>
									<span>{uploadProgress}%</span>
								</div>
								<Progress value={uploadProgress} />
							</div>
						)}

						{uploadResult && (
							<Alert variant={uploadResult.success ? "default" : "destructive"}>
								<AlertDescription>
									{uploadResult.success
										? `Successfully processed ${uploadResult.recordsProcessed} records from ${uploadResult.fileName}`
										: `Failed to process ${uploadResult.fileName}: ${uploadResult.errorMessage}`}
								</AlertDescription>
							</Alert>
						)}

						<Button
							onClick={handleFileUpload}
							disabled={!selectedFile || uploadProgress > 0}
							className="w-full"
						>
							{uploadProgress > 0 ? "Processing..." : "Import File"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Synchronization Controls */}
			<Card>
				<CardHeader>
					<CardTitle>Synchronization Settings</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-6">
						{/* Auto Sync Toggle */}
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<Label>Automatic Synchronization</Label>
								<div className="text-sm text-muted-foreground font-mono">
									Automatically sync data with Google Drive
								</div>
							</div>
							<Switch
								checked={autoSync}
								onCheckedChange={handleAutoSyncToggle}
								disabled={!isConnected}
							/>
						</div>

						{/* Sync Frequency */}
						<div className="space-y-2">
							<Label htmlFor="sync-frequency">Sync Frequency</Label>
							<Select
								id="sync-frequency"
								value={syncFrequency}
								onChange={(e) => setSyncFrequency(e.target.value)}
								disabled={!autoSync || !isConnected}
							>
								<option value="hourly">Every Hour</option>
								<option value="daily">Daily</option>
								<option value="weekly">Weekly</option>
								<option value="monthly">Monthly</option>
							</Select>
						</div>

						{/* File Type Filter */}
						<div className="space-y-2">
							<Label htmlFor="file-type-filter">File Type Filter</Label>
							<Select
								id="file-type-filter"
								value={fileTypeFilter}
								onChange={(e) => setFileTypeFilter(e.target.value)}
							>
								<option value="all">All Files</option>
								<option value="json">JSON Only</option>
								<option value="csv">CSV Only</option>
								<option value="excel">Excel Only</option>
							</Select>
						</div>

						{/* Conflict Resolution */}
						<div className="space-y-2">
							<Label htmlFor="conflict-resolution">Conflict Resolution</Label>
							<Select
								id="conflict-resolution"
								value={conflictResolution}
								onChange={(e) => setConflictResolution(e.target.value)}
							>
								<option value="merge">Merge Changes</option>
								<option value="overwrite_local">Cloud Overwrites Local</option>
								<option value="overwrite_cloud">Local Overwrites Cloud</option>
							</Select>
							<div className="text-sm text-muted-foreground font-mono">
								How to handle conflicts when data differs between local and
								cloud
							</div>
						</div>

						{/* Manual Sync Button */}
						<Button
							onClick={handleSync}
							disabled={!isConnected || isSyncing}
							className="w-full"
						>
							{isSyncing ? "Syncing..." : "Sync Now"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Sync Statistics */}
			<Card>
				<CardHeader>
					<CardTitle>Sync Statistics</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="bg-card/40 backdrop-blur-sm p-4">
							<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
								Total Syncs
							</div>
							<div className="text-2xl font-mono font-bold">
								{syncStats.totalSyncs}
							</div>
						</div>
						<div className="bg-card/40 backdrop-blur-sm p-4">
							<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
								Successful
							</div>
							<div className="text-2xl font-mono font-bold text-green-600">
								{syncStats.successfulSyncs}
							</div>
						</div>
						<div className="bg-card/40 backdrop-blur-sm p-4">
							<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
								Failed
							</div>
							<div className="text-2xl font-mono font-bold text-red-600">
								{syncStats.failedSyncs}
							</div>
						</div>
						<div className="bg-card/40 backdrop-blur-sm p-4">
							<div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
								Conflicts Resolved
							</div>
							<div className="text-2xl font-mono font-bold text-yellow-600">
								{syncStats.conflictsResolved}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Data Management */}
			<Card>
				<CardHeader>
					<CardTitle>Data Management</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<Button
								variant="outline"
								onClick={clearSyncHistory}
								className="h-auto p-4 flex flex-col items-center gap-2"
							>
								<div className="text-lg">🗑️</div>
								<div className="font-mono font-medium uppercase tracking-wide">
									Clear Sync History
								</div>
								<div className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-center">
									Remove all sync statistics and history
								</div>
							</Button>

							<Button
								variant="outline"
								onClick={() => window.location.reload()}
								className="h-auto p-4 flex flex-col items-center gap-2"
							>
								<div className="text-lg">🔄</div>
								<div className="font-mono font-medium uppercase tracking-wide">
									Refresh Status
								</div>
								<div className="text-xs font-mono text-muted-foreground uppercase tracking-wider text-center">
									Reload sync status and connection
								</div>
							</Button>
						</div>

						{syncResult?.conflicts && syncResult.conflicts.length > 0 && (
							<Alert variant="destructive">
								<AlertDescription>
									<div className="space-y-2">
										<div className="font-medium">
											{syncResult.conflicts.length} conflicts detected during
											sync
										</div>
										<div className="text-sm">
											Conflicts occur when the same data has been modified both
											locally and in the cloud. Please review and resolve these
											conflicts manually.
										</div>
									</div>
								</AlertDescription>
							</Alert>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
