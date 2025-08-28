import { format } from "date-fns";
import type {
	AccountPerformanceReport,
	CashFlowReport,
	CategoryBreakdownReport,
	ExportFormat,
	FinancialSummaryReport,
	Transaction,
	TransactionAnalysisReport,
} from "../../types/finance";

export interface ExportOptions {
	format: ExportFormat;
	filename?: string;
	includeCharts?: boolean;
	dateRange?: {
		start: Date;
		end: Date;
	};
}

export class ExportService {
	/**
	 * Export financial summary report
	 */
	async exportFinancialSummary(
		report: FinancialSummaryReport,
		options: ExportOptions,
	): Promise<void> {
		const filename =
			options.filename ||
			`financial-summary-${format(new Date(), "yyyy-MM-dd")}`;

		switch (options.format) {
			case "csv":
				await this.exportFinancialSummaryCSV(report, filename);
				break;
			case "excel":
				await this.exportFinancialSummaryExcel(report, filename);
				break;
			case "pdf":
				await this.exportFinancialSummaryPDF(report, filename, options);
				break;
			default:
				throw new Error(`Unsupported export format: ${options.format}`);
		}
	}

	/**
	 * Export transaction analysis report
	 */
	async exportTransactionAnalysis(
		report: TransactionAnalysisReport,
		options: ExportOptions,
	): Promise<void> {
		const filename =
			options.filename ||
			`transaction-analysis-${format(new Date(), "yyyy-MM-dd")}`;

		switch (options.format) {
			case "csv":
				await this.exportTransactionAnalysisCSV(report, filename);
				break;
			case "excel":
				await this.exportTransactionAnalysisExcel(report, filename);
				break;
			case "pdf":
				await this.exportTransactionAnalysisPDF(report, filename, options);
				break;
			default:
				throw new Error(`Unsupported export format: ${options.format}`);
		}
	}

	/**
	 * Export category breakdown report
	 */
	async exportCategoryBreakdown(
		report: CategoryBreakdownReport,
		options: ExportOptions,
	): Promise<void> {
		const filename =
			options.filename ||
			`category-breakdown-${format(new Date(), "yyyy-MM-dd")}`;

		switch (options.format) {
			case "csv":
				await this.exportCategoryBreakdownCSV(report, filename);
				break;
			case "excel":
				await this.exportCategoryBreakdownExcel(report, filename);
				break;
			case "pdf":
				await this.exportCategoryBreakdownPDF(report, filename, options);
				break;
			default:
				throw new Error(`Unsupported export format: ${options.format}`);
		}
	}

	/**
	 * Export raw transactions data
	 */
	async exportTransactions(
		transactions: Transaction[],
		options: ExportOptions,
	): Promise<void> {
		const filename =
			options.filename || `transactions-${format(new Date(), "yyyy-MM-dd")}`;

		switch (options.format) {
			case "csv":
				await this.exportTransactionsCSV(transactions, filename);
				break;
			case "excel":
				await this.exportTransactionsExcel(transactions, filename);
				break;
			case "pdf":
				await this.exportTransactionsPDF(transactions, filename, options);
				break;
			default:
				throw new Error(`Unsupported export format: ${options.format}`);
		}
	}

	// CSV Export Methods
	private async exportFinancialSummaryCSV(
		report: FinancialSummaryReport,
		filename: string,
	): Promise<void> {
		const csvContent = [
			["Metric", "Value"],
			["Total Income", report.summary.totalIncome.toString()],
			["Total Expenses", report.summary.totalExpenses.toString()],
			["Net Income", report.summary.netIncome.toString()],
			["Cash Flow", report.summary.cashFlow.toString()],
			["Total Balance", report.summary.totalBalance.toString()],
			[
				"Average Daily Spending",
				report.summary.averageDailySpending.toString(),
			],
			[
				"Largest Expense",
				`${report.summary.largestExpense.description}: $${report.summary.largestExpense.amount}`,
			],
			[
				"Largest Income",
				`${report.summary.largestIncome.description}: $${report.summary.largestIncome.amount}`,
			],
		];

		if (report.periodComparison) {
			csvContent.push(
				["", ""],
				["Period Comparison", ""],
				[
					"Previous Income",
					report.periodComparison.previousPeriod.income.toString(),
				],
				[
					"Previous Expenses",
					report.periodComparison.previousPeriod.expenses.toString(),
				],
				[
					"Previous Net Income",
					report.periodComparison.previousPeriod.netIncome.toString(),
				],
				[
					"Income Change %",
					`${report.periodComparison.changePercentage.income.toFixed(2)}%`,
				],
				[
					"Expenses Change %",
					`${report.periodComparison.changePercentage.expenses.toFixed(2)}%`,
				],
				[
					"Net Income Change %",
					`${report.periodComparison.changePercentage.netIncome.toFixed(2)}%`,
				],
			);
		}

		this.downloadCSV(csvContent, filename);
	}

	private async exportTransactionAnalysisCSV(
		report: TransactionAnalysisReport,
		filename: string,
	): Promise<void> {
		const csvContent = [
			["Transaction Statistics", ""],
			[
				"Total Transactions",
				report.transactionStats.totalTransactions.toString(),
			],
			[
				"Average Amount",
				report.transactionStats.averageTransactionAmount.toString(),
			],
			[
				"Median Amount",
				report.transactionStats.medianTransactionAmount.toString(),
			],
			[
				"Daily Frequency",
				report.transactionStats.transactionFrequency.daily.toString(),
			],
			[
				"Weekly Frequency",
				report.transactionStats.transactionFrequency.weekly.toString(),
			],
			[
				"Monthly Frequency",
				report.transactionStats.transactionFrequency.monthly.toString(),
			],
			["", ""],
			["Largest Expenses", ""],
			["Date", "Description", "Amount", "Category"],
			...report.topTransactions.largestExpenses.map((transaction) => [
				format(new Date(transaction.date), "yyyy-MM-dd"),
				transaction.description,
				transaction.amount.toString(),
				transaction.category,
			]),
			["", ""],
			["Largest Incomes", ""],
			["Date", "Description", "Amount", "Category"],
			...report.topTransactions.largestIncomes.map((transaction) => [
				format(new Date(transaction.date), "yyyy-MM-dd"),
				transaction.description,
				transaction.amount.toString(),
				transaction.category,
			]),
		];

		this.downloadCSV(csvContent, filename);
	}

	private async exportCategoryBreakdownCSV(
		report: CategoryBreakdownReport,
		filename: string,
	): Promise<void> {
		const csvContent = [
			["Income Categories", ""],
			[
				"Category",
				"Amount",
				"Percentage",
				"Transaction Count",
				"Average Amount",
			],
			...report.incomeCategories.map((category) => [
				category.category,
				category.amount.toString(),
				`${category.percentage.toFixed(2)}%`,
				category.transactionCount.toString(),
				category.averageAmount.toString(),
			]),
			["", ""],
			["Expense Categories", ""],
			[
				"Category",
				"Amount",
				"Percentage",
				"Transaction Count",
				"Average Amount",
			],
			...report.expenseCategories.map((category) => [
				category.category,
				category.amount.toString(),
				`${category.percentage.toFixed(2)}%`,
				category.transactionCount.toString(),
				category.averageAmount.toString(),
			]),
		];

		this.downloadCSV(csvContent, filename);
	}

	private async exportTransactionsCSV(
		transactions: Transaction[],
		filename: string,
	): Promise<void> {
		const csvContent = [
			["Date", "Description", "Amount", "Type", "Category", "Account", "Tags"],
			...transactions.map((transaction) => [
				format(new Date(transaction.date), "yyyy-MM-dd"),
				transaction.description,
				transaction.amount.toString(),
				transaction.type,
				transaction.category,
				transaction.account,
				transaction.tags?.join(", ") || "",
			]),
		];

		this.downloadCSV(csvContent, filename);
	}

	// Excel Export Methods (simplified - would need a library like xlsx for full implementation)
	private async exportFinancialSummaryExcel(
		report: FinancialSummaryReport,
		filename: string,
	): Promise<void> {
		// For now, export as CSV with .xlsx extension
		// In a real implementation, you'd use a library like 'xlsx' or 'exceljs'
		await this.exportFinancialSummaryCSV(report, filename);
		console.warn("Excel export not fully implemented. Exported as CSV format.");
	}

	private async exportTransactionAnalysisExcel(
		report: TransactionAnalysisReport,
		filename: string,
	): Promise<void> {
		await this.exportTransactionAnalysisCSV(report, filename);
		console.warn("Excel export not fully implemented. Exported as CSV format.");
	}

	private async exportCategoryBreakdownExcel(
		report: CategoryBreakdownReport,
		filename: string,
	): Promise<void> {
		await this.exportCategoryBreakdownCSV(report, filename);
		console.warn("Excel export not fully implemented. Exported as CSV format.");
	}

	private async exportTransactionsExcel(
		transactions: Transaction[],
		filename: string,
	): Promise<void> {
		await this.exportTransactionsCSV(transactions, filename);
		console.warn("Excel export not fully implemented. Exported as CSV format.");
	}

	// PDF Export Methods (simplified - would need a library like jsPDF for full implementation)
	private async exportFinancialSummaryPDF(
		report: FinancialSummaryReport,
		filename: string,
		options: ExportOptions,
	): Promise<void> {
		const content = this.generateFinancialSummaryHTML(report, options);
		this.downloadHTML(content, filename);
		console.warn("PDF export not fully implemented. Exported as HTML format.");
	}

	private async exportTransactionAnalysisPDF(
		report: TransactionAnalysisReport,
		filename: string,
		options: ExportOptions,
	): Promise<void> {
		const content = this.generateTransactionAnalysisHTML(report, options);
		this.downloadHTML(content, filename);
		console.warn("PDF export not fully implemented. Exported as HTML format.");
	}

	private async exportCategoryBreakdownPDF(
		report: CategoryBreakdownReport,
		filename: string,
		options: ExportOptions,
	): Promise<void> {
		const content = this.generateCategoryBreakdownHTML(report, options);
		this.downloadHTML(content, filename);
		console.warn("PDF export not fully implemented. Exported as HTML format.");
	}

	private async exportTransactionsPDF(
		transactions: Transaction[],
		filename: string,
		options: ExportOptions,
	): Promise<void> {
		const content = this.generateTransactionsHTML(transactions, options);
		this.downloadHTML(content, filename);
		console.warn("PDF export not fully implemented. Exported as HTML format.");
	}

	// HTML Generation Methods for PDF
	private generateFinancialSummaryHTML(
		report: FinancialSummaryReport,
		options: ExportOptions,
	): string {
		const dateRange = options.dateRange
			? `${format(options.dateRange.start, "MMM dd, yyyy")} - ${format(options.dateRange.end, "MMM dd, yyyy")}`
			: "All Time";

		return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Summary Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric { padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .metric-label { font-weight: bold; color: #666; }
          .metric-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Financial Summary Report</h1>
          <p>Period: ${dateRange}</p>
          <p>Generated on: ${format(new Date(), "MMM dd, yyyy HH:mm")}</p>
        </div>
        
        <div class="summary">
          <div class="metric">
            <div class="metric-label">Total Income</div>
            <div class="metric-value">$${report.summary.totalIncome.toLocaleString()}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Expenses</div>
            <div class="metric-value">$${report.summary.totalExpenses.toLocaleString()}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Net Income</div>
            <div class="metric-value">$${report.summary.netIncome.toLocaleString()}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Cash Flow</div>
            <div class="metric-value">$${report.summary.cashFlow.toLocaleString()}</div>
          </div>
        </div>
        
        <h2>Key Transactions</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Largest Expense</td>
              <td>${report.summary.largestExpense.description}</td>
              <td>$${report.summary.largestExpense.amount.toLocaleString()}</td>
              <td>${format(new Date(report.summary.largestExpense.date), "MMM dd, yyyy")}</td>
            </tr>
            <tr>
              <td>Largest Income</td>
              <td>${report.summary.largestIncome.description}</td>
              <td>$${report.summary.largestIncome.amount.toLocaleString()}</td>
              <td>${format(new Date(report.summary.largestIncome.date), "MMM dd, yyyy")}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
	}

	private generateTransactionAnalysisHTML(
		report: TransactionAnalysisReport,
		options: ExportOptions,
	): string {
		const dateRange = options.dateRange
			? `${format(options.dateRange.start, "MMM dd, yyyy")} - ${format(options.dateRange.end, "MMM dd, yyyy")}`
			: "All Time";

		return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transaction Analysis Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          .income { color: green; }
          .expense { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Transaction Analysis Report</h1>
          <p>Period: ${dateRange}</p>
          <p>Generated on: ${format(new Date(), "MMM dd, yyyy HH:mm")}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Category</th>
              <th>Account</th>
            </tr>
          </thead>
          <tbody>
            ${report.topTransactions.largestExpenses
							.concat(report.topTransactions.largestIncomes)
							.map(
								(transaction) => `
              <tr>
                <td>${format(new Date(transaction.date), "MMM dd, yyyy")}</td>
                <td>${transaction.description}</td>
                <td class="${transaction.type}">$${transaction.amount.toLocaleString()}</td>
                <td>${transaction.type}</td>
                <td>${transaction.category}</td>
                <td>${transaction.account}</td>
              </tr>
            `,
							)
							.join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
	}

	private generateCategoryBreakdownHTML(
		report: CategoryBreakdownReport,
		options: ExportOptions,
	): string {
		const dateRange = options.dateRange
			? `${format(options.dateRange.start, "MMM dd, yyyy")} - ${format(options.dateRange.end, "MMM dd, yyyy")}`
			: "All Time";

		return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Category Breakdown Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Category Breakdown Report</h1>
          <p>Period: ${dateRange}</p>
          <p>Generated on: ${format(new Date(), "MMM dd, yyyy HH:mm")}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Amount</th>
              <th>Percentage</th>
              <th>Transaction Count</th>
            </tr>
          </thead>
          <tbody>
            ${report.incomeCategories
							.concat(report.expenseCategories)
							.map(
								(category) => `
              <tr>
                <td>${category.category}</td>
                <td>$${category.amount.toLocaleString()}</td>
                <td>${category.percentage.toFixed(2)}%</td>
                <td>${category.transactionCount}</td>
              </tr>
            `,
							)
							.join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
	}

	private generateTransactionsHTML(
		transactions: Transaction[],
		options: ExportOptions,
	): string {
		const dateRange = options.dateRange
			? `${format(options.dateRange.start, "MMM dd, yyyy")} - ${format(options.dateRange.end, "MMM dd, yyyy")}`
			: "All Time";

		return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Transactions Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; }
          .income { color: green; }
          .expense { color: red; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Transactions Report</h1>
          <p>Period: ${dateRange}</p>
          <p>Generated on: ${format(new Date(), "MMM dd, yyyy HH:mm")}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Type</th>
              <th>Category</th>
              <th>Account</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
							.map(
								(transaction) => `
              <tr>
                <td>${format(new Date(transaction.date), "MMM dd, yyyy")}</td>
                <td>${transaction.description}</td>
                <td class="${transaction.type}">$${transaction.amount.toLocaleString()}</td>
                <td>${transaction.type}</td>
                <td>${transaction.category}</td>
                <td>${transaction.account}</td>
                <td>${transaction.tags?.join(", ") || ""}</td>
              </tr>
            `,
							)
							.join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
	}

	// Utility Methods
	private downloadCSV(data: string[][], filename: string): void {
		const csvContent = data
			.map((row) =>
				row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(","),
			)
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		this.downloadBlob(blob, `${filename}.csv`);
	}

	private downloadHTML(content: string, filename: string): void {
		const blob = new Blob([content], { type: "text/html;charset=utf-8;" });
		this.downloadBlob(blob, `${filename}.html`);
	}

	private downloadBlob(blob: Blob, filename: string): void {
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);

		link.setAttribute("href", url);
		link.setAttribute("download", filename);
		link.style.visibility = "hidden";

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	}
}

// Export singleton instance
export const exportService = new ExportService();
