import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { TransactionSummary } from '../components/transactions/TransactionSummary';
import { TransactionHistoryTable } from '../components/transactions/TransactionHistoryTable';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { ExportImportDialog } from '../components/transactions/ExportImportDialog';
import { TransactionOperationsToolbar } from '../components/transactions/TransactionOperationsToolbar';
import { TransactionFilters as TransactionFiltersComponent } from '../components/transactions/TransactionFilters';
import { TransactionStatistics } from '../components/transactions/TransactionStatistics';
import { TransactionsLayout, TransactionsSection, TransactionsToolbar, TransactionsContentGrid } from '../components/layout';
import { transactionManager, type TransactionFilters, type TransactionSummary as TransactionSummaryType } from '../lib/transactions/transactionManager';
import { DatabaseService } from '../lib/database/db';
import { DatabaseInitService } from '../lib/database/init';
import type { Transaction, Account, Category } from '../types/finance';
import { useToast } from '../lib/hooks/useToast';

export const Route = createFileRoute('/transactions')({component: Transactions,})

function Transactions() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummaryType | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showExportImport, setShowExportImport] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Real-time status update functionality
  const updateTransactionStatus = useCallback(async (id: string, status: Transaction['status'], errorMessage?: string) => {
    try {
      const updatedTransaction = await transactionManager.updateTransactionStatus(id, status, errorMessage);
      if (updatedTransaction) {
        // Update the transaction in the local state
        setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));
        setFilteredTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));
        toast({
          variant: 'success',
          title: 'Status Updated',
          description: `Transaction status updated to ${status}.`,
        });
      }
    } catch (err) {
      console.error('Failed to update transaction status:', err);
      const errorMsg = 'Failed to update transaction status';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err instanceof Error ? err.message : errorMsg,
      });
    }
  }, [toast]);

  // Retry failed transaction
  const retryFailedTransaction = useCallback(async (id: string) => {
    try {
      const retryResult = await transactionManager.retryFailedTransaction(id);
      if (retryResult) {
        // Update the transaction in the local state
        setTransactions(prev => prev.map(t => t.id === id ? retryResult : t));
        setFilteredTransactions(prev => prev.map(t => t.id === id ? retryResult : t));
        toast({
          variant: 'success',
          title: 'Transaction Retried',
          description: 'Transaction has been queued for retry.',
        });
      }
    } catch (err) {
      console.error('Failed to retry transaction:', err);
      const errorMsg = 'Failed to retry transaction';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Retry Failed',
        description: err instanceof Error ? err.message : errorMsg,
      });
    }
  }, [toast]);

  // Auto-refresh pending transactions
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const pendingTransactions = await transactionManager.getPendingTransactions();
        if (pendingTransactions.length > 0) {
          // Process pending transactions
          for (const transaction of pendingTransactions) {
            await transactionManager.processTransaction(transaction);
          }
          // Reload data to get updated statuses
          loadData();
        }
      } catch (err) {
        console.error('Error processing pending transactions:', err);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const applyFiltersAndSearch = useCallback(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(transaction =>
        transaction.description.toLowerCase().includes(term) ||
        transaction.category?.toLowerCase().includes(term) ||
        transaction.account?.toLowerCase().includes(term)
      );
    }

    // Apply filters
     if (filters.category) {
       filtered = filtered.filter(t => t.category === filters.category);
     }
     if (filters.account) {
       filtered = filtered.filter(t => t.account === filters.account);
     }
     if (filters.type) {
       filtered = filtered.filter(t => t.type === filters.type);
     }
     if (filters.startDate) {
        const startDate = filters.startDate;
        filtered = filtered.filter(t => new Date(t.date) >= startDate);
      }
      if (filters.endDate) {
        const endDate = filters.endDate;
        filtered = filtered.filter(t => new Date(t.date) <= endDate);
      }
      if (filters.minAmount !== undefined) {
        const minAmount = filters.minAmount;
        filtered = filtered.filter(t => t.amount >= minAmount);
      }
      if (filters.maxAmount !== undefined) {
        const maxAmount = filters.maxAmount;
        filtered = filtered.filter(t => t.amount <= maxAmount);
      }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        default:
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });

    setFilteredTransactions(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, searchTerm, filters, sortBy, sortOrder]);

  // Apply filters and search
  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure database is initialized with default data
      await DatabaseInitService.initialize();
      
      const [transactionsData, accountsData, categoriesData] = await Promise.all([
        transactionManager.getTransactions(),
        DatabaseService.getAccounts(),
        DatabaseService.getCategories()
      ]);
      
      setTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      
      const summaryData = await transactionManager.getTransactionSummary();
      setSummary(summaryData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Loading Error',
        description: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await transactionManager.deleteTransaction(id);
      await loadData(); // Reload data after deletion
      toast({
        variant: 'success',
        title: 'Transaction Deleted',
        description: 'Transaction has been successfully deleted.',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: errorMsg,
      });
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleFormSubmit = async (transactionData: Partial<Transaction>) => {
    try {
      if (editingTransaction) {
        await transactionManager.updateTransaction(editingTransaction.id, transactionData);
      } else {
        await transactionManager.createTransaction(transactionData as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>);
      }
      setShowForm(false);
      setEditingTransaction(null);
      await loadData(); // Reload data after form submission
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to save transaction');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  // Bulk operations handlers
  const handleBulkDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => transactionManager.deleteTransaction(id)));
      await loadData();
      setSelectedTransactions([]);
      toast({
        variant: 'success',
        title: 'Bulk Delete Successful',
        description: `${ids.length} transactions deleted.`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete transactions';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Bulk Delete Failed',
        description: errorMsg,
      });
    }
  };

  const handleBulkStatusUpdate = async (ids: string[], status: Transaction['status']) => {
    try {
      await Promise.all(ids.map(id => transactionManager.updateTransactionStatus(id, status)));
      await loadData();
      setSelectedTransactions([]);
      toast({
        variant: 'success',
        title: 'Bulk Status Update Successful',
        description: `${ids.length} transactions updated to ${status}.`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update transaction status';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Bulk Update Failed',
        description: errorMsg,
      });
    }
  };

  const handleBulkCategoryUpdate = async (ids: string[], categoryId: string) => {
    try {
      await Promise.all(ids.map(id => transactionManager.updateTransaction(id, { category: categoryId })));
      await loadData();
      setSelectedTransactions([]);
      toast({
        variant: 'success',
        title: 'Bulk Category Update Successful',
        description: `${ids.length} transactions updated.`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update transaction categories';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Bulk Update Failed',
        description: errorMsg,
      });
    }
  };

  const handleExportSelected = (transactions: Transaction[]) => {
    const csvContent = [
      'Date,Description,Amount,Type,Category,Account,Status',
      ...transactions.map(t => 
        `${t.date},"${t.description}",${t.amount},${t.type},${t.category || ''},${t.account || ''},${t.status}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      variant: 'success',
      title: 'Export Successful',
      description: `${transactions.length} transactions exported.`,
    });
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground font-mono text-sm uppercase tracking-wider">Loading transactions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TransactionsLayout>
      <TransactionsSection>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono uppercase">Transactions</h1>
            <p className="text-muted-foreground font-mono text-xs sm:text-sm uppercase tracking-wider">Manage your income and expenses</p>
          </div>
          <TransactionsToolbar>
            <Button 
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto font-mono text-sm sm:text-base"
              disabled={loading}
            >
              💰 Add Transaction
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowExportImport(true)}
              className="w-full sm:w-auto font-mono text-sm sm:text-base"
              disabled={loading}
            >
              📊 Export/Import
            </Button>
          </TransactionsToolbar>
        </div>
      </TransactionsSection>

      <TransactionsSection>
        {/* Error Alert */}
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transaction Summary */}
        {summary && <TransactionSummary summary={summary} loading={loading} />}
         {!summary && loading && <TransactionSummary summary={{ totalIncome: 0, totalExpenses: 0, netAmount: 0, transactionCount: 0, averageTransaction: 0, categoryBreakdown: {}, accountBreakdown: {} }} loading={true} />}
      </TransactionsSection>

      <TransactionsSection>
        {/* Transaction Operations Toolbar */}
        <TransactionOperationsToolbar
          selectedTransactions={selectedTransactions}
          onBulkDelete={handleBulkDelete}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onBulkCategoryUpdate={handleBulkCategoryUpdate}
          onExportSelected={handleExportSelected}
          onAddTransaction={() => setShowForm(true)}
          onExportImport={() => setShowExportImport(true)}
          categories={categories}
          loading={loading}
        />
      </TransactionsSection>

      <TransactionsContentGrid>
        {/* Transaction Statistics */}
        <TransactionStatistics
          transactions={filteredTransactions}
          loading={loading}
        />

        {/* Transaction Filters */}
         <TransactionFiltersComponent
           filters={filters}
           onFiltersChange={setFilters}
           searchTerm={searchTerm}
           onSearchChange={setSearchTerm}
           accounts={accounts}
           categories={categories}
           loading={loading}
         />
      </TransactionsContentGrid>

      <TransactionsSection>
        {/* Transaction History Table */}
        <TransactionHistoryTable
           transactions={filteredTransactions}
           loading={loading}
           onEdit={handleEditTransaction}
           onDelete={handleDeleteTransaction}
           onUpdateStatus={updateTransactionStatus}
           onRetryTransaction={retryFailedTransaction}
           sortBy={sortBy}
           sortOrder={sortOrder}
           onSort={(field) => {
             if (field === sortBy) {
               setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
             } else {
               setSortBy(field);
               setSortOrder('desc');
             }
           }}
           currentPage={currentPage}
           itemsPerPage={itemsPerPage}
           onPageChange={setCurrentPage}
         />
      </TransactionsSection>

        {/* Transaction Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-2 sm:p-4">
            <div className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mt-2 sm:mt-0">
              <TransactionForm
                transaction={editingTransaction}
                accounts={accounts}
                categories={categories}
                onSubmit={handleFormSubmit}
                onCancel={handleFormCancel}
                loading={loading}
              />
            </div>
          </div>
        )}

      {/* Export/Import Dialog */}
      <ExportImportDialog
        isOpen={showExportImport}
        onClose={() => setShowExportImport(false)}
        onImportComplete={loadData}
        currentFilters={filters}
      />
    </TransactionsLayout>
  );
}