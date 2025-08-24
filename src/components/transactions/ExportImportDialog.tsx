import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { LoadingSpinner } from '../ui/loading-spinner';
import { transactionManager, type TransactionFilters } from '../../lib/transactions/transactionManager';
import { useToast } from '../../lib/hooks/useToast';

interface ExportImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  currentFilters?: TransactionFilters;
}

type ExportFormat = 'json' | 'csv' | 'external-json';
type ImportFormat = 'json' | 'csv' | 'external-json';

interface ImportResult {
  success: boolean;
  fileName: string;
  recordsProcessed: number;
  errorMessage?: string;
}

export function ExportImportDialog({ 
  isOpen, 
  onClose, 
  onImportComplete,
  currentFilters 
}: ExportImportDialogProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [importFormat, setImportFormat] = useState<ImportFormat>('json');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let data: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'external-json') {
        data = await transactionManager.exportTransactionsExternal(currentFilters);
        filename = `transactions-external-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        data = await transactionManager.exportTransactions(currentFilters, exportFormat);
        filename = `transactions-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        mimeType = exportFormat === 'json' ? 'application/json' : 'text/csv';
      }

      // Create and download file
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Transactions exported to ${filename}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Export Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to import',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileContent = await selectedFile.text();
      const result = await transactionManager.importTransactions(fileContent, importFormat);

      const importResult: ImportResult = {
        success: result.successful.length > 0,
        fileName: selectedFile.name,
        recordsProcessed: result.successful.length,
        errorMessage: result.failed.length > 0 ? `${result.failed.length} records failed to import` : undefined,
      };

      setImportResult(importResult);

      if (result.successful.length > 0) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${result.successful.length} transactions`,
        });
        onImportComplete?.();
      }

      if (result.failed.length > 0) {
        toast({
          title: 'Partial Import',
          description: `${result.failed.length} transactions failed to import`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const importResult: ImportResult = {
        success: false,
        fileName: selectedFile.name,
        recordsProcessed: 0,
        errorMessage,
      };
      setImportResult(importResult);

      toast({
        title: 'Import Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportResult(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-sm border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono uppercase tracking-wider">
              Data Export & Import
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              ✕
            </Button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-muted/50 p-1 rounded-lg">
            <Button
              variant={activeTab === 'export' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('export')}
              className="flex-1 font-mono text-xs"
            >
              📤 Export
            </Button>
            <Button
              variant={activeTab === 'import' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('import')}
              className="flex-1 font-mono text-xs"
            >
              📥 Import
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-sm uppercase tracking-wider">
                  Export Format
                </Label>
                <Select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                >
                  <option value="json">JSON (Internal Format)</option>
                  <option value="csv">CSV (Spreadsheet)</option>
                  <option value="external-json">JSON (External Format)</option>
                </Select>
              </div>

              {currentFilters && Object.keys(currentFilters).length > 0 && (
                <Alert>
                  <AlertDescription className="font-mono text-xs">
                    Export will include current filters: {Object.entries(currentFilters)
                      .filter(([_, value]) => value !== undefined && value !== '')
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                  Format Information
                </div>
                <div className="text-sm space-y-1">
                  {exportFormat === 'json' && (
                    <p>Internal JSON format with all transaction fields and metadata.</p>
                  )}
                  {exportFormat === 'csv' && (
                    <p>CSV format compatible with spreadsheet applications like Excel.</p>
                  )}
                  {exportFormat === 'external-json' && (
                    <p>External JSON format compatible with other financial applications.</p>
                  )}
                </div>
              </div>

              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full font-mono"
              >
                {isExporting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Exporting...
                  </>
                ) : (
                  '📤 Export Transactions'
                )}
              </Button>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono text-sm uppercase tracking-wider">
                  Import Format
                </Label>
                <Select
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value as ImportFormat)}
                >
                  <option value="json">JSON (Internal Format)</option>
                  <option value="csv">CSV (Spreadsheet)</option>
                  <option value="external-json">JSON (External Format)</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-mono text-sm uppercase tracking-wider">
                  Select File
                </Label>
                <Input
                  type="file"
                  accept=".json,.csv"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="font-mono"
                />
              </div>

              {selectedFile && (
                <div className="bg-card/40 backdrop-blur-sm p-4 rounded-lg">
                  <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    Selected File
                  </div>
                  <div className="font-mono text-sm">
                    <div>{selectedFile.name}</div>
                    <div className="text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
              )}

              {importResult && (
                <Alert variant={importResult.success ? 'default' : 'destructive'}>
                  <AlertDescription className="font-mono text-sm">
                    {importResult.success
                      ? `✅ Successfully imported ${importResult.recordsProcessed} transactions from ${importResult.fileName}`
                      : `❌ Failed to import ${importResult.fileName}: ${importResult.errorMessage}`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                <div className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                  Import Guidelines
                </div>
                <div className="text-sm space-y-1">
                  <p>• Duplicate transactions will be skipped automatically</p>
                  <p>• Invalid data will be reported and skipped</p>
                  <p>• Large files may take some time to process</p>
                  <p>• Always backup your data before importing</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || isImporting}
                  className="flex-1 font-mono"
                >
                  {isImporting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Importing...
                    </>
                  ) : (
                    '📥 Import Transactions'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetImport}
                  disabled={isImporting}
                  className="font-mono"
                >
                  Reset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}