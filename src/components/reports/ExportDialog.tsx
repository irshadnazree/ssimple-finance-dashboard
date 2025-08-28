import { format } from "date-fns";
import { Download, File, FileSpreadsheet, FileText } from "lucide-react";
import { useId, useState } from "react";
import {
    type ExportOptions,
    exportService,
} from "../../lib/reports/exportService";
import type {
    AccountPerformanceReport,
    CashFlowReport,
    CategoryBreakdownReport,
    ExportFormat,
    FinancialSummaryReport,
    ReportType,
    Transaction,
    TransactionAnalysisReport,
} from "../../types/finance";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ExportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	reportType: ReportType;
	reportData:
		| FinancialSummaryReport
		| TransactionAnalysisReport
		| CategoryBreakdownReport
		| AccountPerformanceReport
		| CashFlowReport
		| null;
	transactions?: Transaction[];
	dateRange?: {
		start: Date;
		end: Date;
	};
}

const formatIcons: Record<ExportFormat, React.ReactNode> = {
	pdf: <FileText className="h-4 w-4" />,
	csv: <File className="h-4 w-4" />,
	excel: <FileSpreadsheet className="h-4 w-4" />,
	json: <File className="h-4 w-4" />,
};

const formatLabels: Record<ExportFormat, string> = {
	pdf: "PDF Document",
	csv: "CSV Spreadsheet",
	excel: "Excel Workbook",
	json: "JSON Data",
};

const formatDescriptions: Record<ExportFormat, string> = {
	pdf: "Formatted report with charts and styling",
	csv: "Raw data in comma-separated format",
	excel: "Structured spreadsheet with multiple sheets",
	json: "Machine-readable data format",
};

export function ExportDialog({
	isOpen,
	onClose,
	reportType,
	reportData,
	transactions,
	dateRange,
}: ExportDialogProps) {
	const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("pdf");
	const [customFilename, setCustomFilename] = useState("");
	const filenameInputId = useId();
	const [includeCharts, setIncludeCharts] = useState(true);
	const [isExporting, setIsExporting] = useState(false);

	if (!isOpen) return null;

	const handleExport = async () => {
		if (!reportData) return;

		setIsExporting(true);
		try {
			const options: ExportOptions = {
				format: selectedFormat,
				filename: customFilename || generateDefaultFilename(),
				includeCharts,
				dateRange,
			};

			switch (reportType) {
				case "financial-summary":
					await exportService.exportFinancialSummary(
						reportData as FinancialSummaryReport,
						options,
					);
					break;
				case "transaction-analysis":
					await exportService.exportTransactionAnalysis(
						reportData as TransactionAnalysisReport,
						options,
					);
					break;
				case "category-breakdown":
					await exportService.exportCategoryBreakdown(
						reportData as CategoryBreakdownReport,
						options,
					);
					break;
				default:
					if (transactions) {
						await exportService.exportTransactions(transactions, options);
					}
					break;
			}

			onClose();
		} catch (error) {
			console.error("Export failed:", error);
			// You could add a toast notification here
		} finally {
			setIsExporting(false);
		}
	};

	const generateDefaultFilename = (): string => {
		const dateStr = format(new Date(), "yyyy-MM-dd");
		const reportTypeStr = reportType.replace("-", "_");
		return `${reportTypeStr}_${dateStr}`;
	};

	const getReportTitle = (): string => {
		switch (reportType) {
			case "financial-summary":
				return "Financial Summary Report";
			case "transaction-analysis":
				return "Transaction Analysis Report";
			case "category-breakdown":
				return "Category Breakdown Report";
			case "account-performance":
				return "Account Performance Report";
			case "cash-flow":
				return "Cash Flow Report";
			default:
				return "Financial Report";
		}
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<Card className="w-full max-w-md mx-4">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Download className="h-5 w-5" />
						Export Report
					</CardTitle>
					<p className="text-sm text-muted-foreground">{getReportTitle()}</p>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Format Selection */}
					<div className="space-y-3">
						<div className="text-sm font-medium">Export Format</div>
						<div className="grid grid-cols-2 gap-2">
							{(Object.keys(formatLabels) as ExportFormat[]).map((format) => (
								<button
									key={format}
									type="button"
									onClick={() => setSelectedFormat(format)}
									className={`p-3 rounded-lg border text-left transition-colors ${
										selectedFormat === format
											? "border-primary bg-primary/10 text-primary"
											: "border-border hover:border-primary/50"
									}`}
								>
									<div className="flex items-center gap-2 mb-1">
										{formatIcons[format]}
										<span className="font-medium text-sm">
											{formatLabels[format]}
										</span>
									</div>
									<p className="text-xs text-muted-foreground">
										{formatDescriptions[format]}
									</p>
								</button>
							))}
						</div>
					</div>

					{/* Custom Filename */}
					<div className="space-y-2">
						<label htmlFor={filenameInputId} className="text-sm font-medium">
							Filename (optional)
						</label>
						<input
							id={filenameInputId}
							type="text"
							value={customFilename}
							onChange={(e) => setCustomFilename(e.target.value)}
							placeholder={generateDefaultFilename()}
							className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
						/>
						<p className="text-xs text-muted-foreground">
							File extension will be added automatically
						</p>
					</div>

					{/* Options */}
					{selectedFormat === "pdf" && (
						<div className="space-y-2">
							<label className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={includeCharts}
									onChange={(e) => setIncludeCharts(e.target.checked)}
									className="rounded border-border"
								/>
								<span className="text-sm">
									Include charts and visualizations
								</span>
							</label>
						</div>
					)}

					{/* Date Range Info */}
					{dateRange && (
						<div className="p-3 bg-muted rounded-lg">
							<p className="text-sm font-medium mb-1">Report Period</p>
							<p className="text-sm text-muted-foreground">
								{format(dateRange.start, "MMM dd, yyyy")} -{" "}
								{format(dateRange.end, "MMM dd, yyyy")}
							</p>
						</div>
					)}

					{/* Action Buttons */}
					<div className="flex gap-2 pt-4">
						<Button
							variant="outline"
							onClick={onClose}
							className="flex-1"
							disabled={isExporting}
						>
							Cancel
						</Button>
						<Button
							onClick={handleExport}
							className="flex-1"
							disabled={isExporting || !reportData}
						>
							{isExporting ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
									Exporting...
								</>
							) : (
								<>
									<Download className="h-4 w-4 mr-2" />
									Export
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default ExportDialog;
