import { useState } from 'react';
import { transactionManager } from '../lib/transactions/transactionManager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

interface ImportResult {
  type: 'transaction';
  successful: number;
  failed: number;
  total: number;
  errors?: string[];
}

export default function ImportDataDemo() {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setSelectedFile(file);
    } else {
      alert('Please select a valid JSON file');
    }
  };

  const importSampleData = async () => {
    setIsImporting(true);
    try {
      // Import sample transaction data
      const sampleTransactions = [
        {
          "Date": "2024-01-15T00:00:00.000Z",
          "Account": "Demo Account",
          "Category": "Groceries",
          "Subcategory": "Food",
          "Note": "Sample grocery transaction",
          "MYR": 150.50,
          "Income/Expense": "Expense",
          "Description": "Demo supermarket purchase",
          "Amount": 150.50,
          "Currency": "MYR",
          "Account_2": 1
        },
        {
          "Date": "2024-01-16T00:00:00.000Z",
          "Account": "Demo Account",
          "Category": "Salary",
          "Subcategory": null,
          "Note": "Monthly salary",
          "MYR": 5000.00,
          "Income/Expense": "Income",
          "Description": "Demo salary payment",
          "Amount": 5000.00,
          "Currency": "MYR",
          "Account_2": 1
        }
      ];
      
      const importResult = await transactionManager.importTransactions(
        JSON.stringify(sampleTransactions),
        'external-json'
      );
      
      const result: ImportResult = {
        type: 'transaction',
        successful: importResult.summary.successful,
        failed: importResult.summary.failed,
        total: importResult.summary.total,
        errors: importResult.failed.map((f: { error: string }) => f.error)
      };
      
      setImportResults(prev => [result, ...prev]);
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const importFromFile = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await selectedFile.text();
      
      const importResult = await transactionManager.importTransactions(
        fileContent,
        'external-json'
      );
      
      const result: ImportResult = {
        type: 'transaction',
        successful: importResult.summary.successful,
        failed: importResult.summary.failed,
        total: importResult.summary.total,
        errors: importResult.failed.map((f: { error: string }) => f.error)
      };
      
      setImportResults(prev => [result, ...prev]);
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>JSON Import Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Sample Data Import</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Import pre-configured sample data to test the functionality.
              </p>
              <Button
                onClick={importSampleData}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? 'Importing...' : 'Import Sample Transactions'}
              </Button>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">File Upload</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your own JSON file. Use the sample file (sample-finance-data.json) as reference.
              </p>
              
              <div className="space-y-4">
                <div>
                  <input
                    id="file-input"
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
                
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </div>
                )}
                
                <Button
                  onClick={importFromFile}
                  disabled={!selectedFile || isImporting}
                  className="w-full"
                >
                  {isImporting ? 'Importing...' : 'Import from File'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {importResults.map((result, index) => (
                <Alert key={`${result.type}-${index}-${result.total}`}>
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium capitalize">
                          {result.type} Import
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.successful} successful, {result.failed} failed out of {result.total} total
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          ✓ {result.successful}
                        </Badge>
                        {result.failed > 0 && (
                          <Badge variant="destructive">
                            ✗ {result.failed}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="mt-2 text-sm text-destructive">
                        <div className="font-medium">Errors:</div>
                        <ul className="list-disc list-inside">
                          {result.errors.slice(0, 3).map((error, errorIndex) => (
                            <li key={`error-${errorIndex}-${error.slice(0, 20)}`}>{error}</li>
                          ))}
                          {result.errors.length > 3 && (
                            <li>... and {result.errors.length - 3} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Data Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              <strong>sample-finance-data.json</strong> - Contains sample transaction data
            </p>
            <p className="text-muted-foreground">
              These files demonstrate the expected JSON structure for importing financial data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}