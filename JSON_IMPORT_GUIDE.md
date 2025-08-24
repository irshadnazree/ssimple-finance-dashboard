# JSON Import Guide for Finance Data

This finance dashboard application has comprehensive support for importing financial data from JSON files. The system supports importing **transactions** from JSON format.

## Available Import Methods

### Transaction Import

The application supports importing transactions in multiple formats:

- **Standard JSON format** - Internal application format
- **External JSON format** - Compatible with external finance tools
- **CSV format** - Comma-separated values

#### External JSON Format (Recommended)

The external JSON format is designed to be compatible with common finance export formats. Here's the structure:

```json
[
  {
    "Date": "2024-01-15T00:00:00.000Z",
    "Account": "Main Checking",
    "Category": "Groceries",
    "Subcategory": "Food",
    "Note": "Weekly grocery shopping",
    "MYR": 150.50,
    "Income/Expense": "Expense",
    "Description": "Supermarket purchase",
    "Amount": 150.50,
    "Currency": "MYR",
    "Account_2": 150.50
  }
]
```

**Field Descriptions:**
- `Date`: ISO 8601 date string
- `Account`: Account name
- `Category`: Transaction category
- `Subcategory`: Optional subcategory
- `Note`: Optional note/memo
- `MYR`: Amount in Malaysian Ringgit
- `Income/Expense`: Either "Income" or "Expense"
- `Description`: Transaction description
- `Amount`: Transaction amount
- `Currency`: Currency code (e.g., "MYR", "USD")
- `Account_2`: Secondary account reference

## How to Import Data

### Using the Transaction Manager

```typescript
import { transactionManager } from './lib/transactions/transactionManager';
import fs from 'fs';

// Import transactions from external JSON format
async function importTransactionsFromFile(filePath: string) {
  const jsonData = fs.readFileSync(filePath, 'utf-8');
  const result = await transactionManager.importTransactions(jsonData, 'external-json');
  
  console.log(`Successfully imported: ${result.summary.successful}`);
  console.log(`Failed imports: ${result.summary.failed}`);
  
  return result;
}

// Import from standard JSON format
async function importStandardTransactions(filePath: string) {
  const jsonData = fs.readFileSync(filePath, 'utf-8');
  const result = await transactionManager.importTransactions(jsonData, 'json');
  
  return result;
}
```

## Sample Data Files

This repository includes sample data files you can use for testing:

1. **`sample-finance-data.json`** - Contains sample transaction data in external JSON format

### Testing the Import

You can test the import functionality with the provided sample files:

```typescript
// Import sample transactions
const transactionResult = await importTransactionsFromFile('./sample-finance-data.json');
```

## Data Validation

The import system includes comprehensive validation:

### Transaction Validation
- Date format validation
- Amount validation (must be positive numbers)
- Category validation
- Currency validation
- Account validation

## Error Handling

The import function returns detailed results:

```typescript
interface BulkTransactionResult {
  successful: Transaction[];
  failed: Array<{ transaction: Partial<Transaction>; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}
```

Failed imports include specific error messages to help you fix data issues.

## Export Functionality

The system also supports exporting data back to JSON:

```typescript
// Export transactions in external format
const exportedTransactions = await transactionManager.exportTransactionsExternal();
```

## Data Transformation

The application includes utilities for transforming between different data formats:

- `DataTransformUtils.fromExternalFormat()` - Convert external to internal format
- `DataTransformUtils.toExternalFormat()` - Convert internal to external format
- `DataTransformUtils.processImportData()` - Validate and sanitize import data

## Security Considerations

- All imported data is validated before processing
- The system includes encryption utilities for sensitive data
- Import operations are logged for audit purposes
- Invalid data is rejected with detailed error messages

## Best Practices

1. **Backup existing data** before importing large datasets
2. **Test with small datasets** first to verify format compatibility
3. **Review failed imports** to fix data quality issues
4. **Use the external JSON format** for maximum compatibility
5. **Validate dates** are in ISO 8601 format
6. **Ensure amounts** are positive numbers
7. **Check category names** match your existing categories

## Troubleshooting

### Common Issues

1. **Date Format Errors**: Ensure dates are in ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
2. **Invalid Amounts**: Amounts must be positive numbers
3. **Missing Required Fields**: Check that all required fields are present
4. **Category Mismatches**: Ensure categories exist in your system
5. **JSON Syntax Errors**: Validate JSON syntax before importing

### Getting Help

If you encounter issues:
1. Check the error messages in the import result
2. Validate your JSON syntax
3. Compare your data format with the sample files
4. Review the validation rules in the code

The import system is designed to be robust and provide clear feedback on any issues encountered during the import process.