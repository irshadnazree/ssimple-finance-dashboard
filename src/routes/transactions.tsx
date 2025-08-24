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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

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

  const applyFiltersAndSearch = useCallback(async () => {
    try {
      // Build comprehensive filters
       const advancedFilters: TransactionFilters = {
         ...filters,
         startDate: startDate ? new Date(startDate) : undefined,
         endDate: endDate ? new Date(endDate) : undefined,
         minAmount: minAmount ? Number.parseFloat(minAmount) : undefined,
         maxAmount: maxAmount ? Number.parseFloat(maxAmount) : undefined,
         description: searchTerm || undefined
       };
       
       const filtered = await transactionManager.getTransactions(advancedFilters);
      
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to filter transactions');
    }
  }, [filters, searchTerm, sortBy, sortOrder, startDate, endDate, minAmount, maxAmount]);

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-mono uppercase">Transactions</h1>
              <p className="text-muted-foreground font-mono text-xs sm:text-sm uppercase tracking-wider">Manage your income and expenses</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
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
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transaction Summary */}
        {summary && <TransactionSummary summary={summary} loading={loading} />}
         {!summary && loading && <TransactionSummary summary={{ totalIncome: 0, totalExpenses: 0, netAmount: 0, transactionCount: 0, averageTransaction: 0, categoryBreakdown: {}, accountBreakdown: {} }} loading={true} />}

        {/* Filters and Search */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono uppercase tracking-wider text-sm sm:text-base">Filters & Search</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-xs sm:text-sm font-mono"
              >
                {showAdvancedFilters ? '🔼 Hide Advanced' : '🔽 Show Advanced'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search - Full width on mobile */}
            <div className="w-full">
              <Label htmlFor="search" className="font-mono text-xs uppercase tracking-wider">Search</Label>
              <Input
                id="search"
                placeholder="Search by description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 text-base sm:text-sm"
              />
            </div>
            
            {/* Basic Filter dropdowns - responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category" className="font-mono text-xs uppercase tracking-wider">Category</Label>
                <Select
                  id="category"
                  value={filters.category || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
                  className="mt-1 text-base sm:text-sm"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </Select>
              </div>
              
              <div>
                <Label htmlFor="account" className="font-mono text-xs uppercase tracking-wider">Account</Label>
                <Select
                  id="account"
                  value={filters.account || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, account: e.target.value || undefined }))}
                  className="mt-1 text-base sm:text-sm"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </Select>
              </div>
              
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="type" className="font-mono text-xs uppercase tracking-wider">Type</Label>
                <Select
                  id="type"
                  value={filters.type || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as Transaction['type'] || undefined }))}
                  className="mt-1 text-base sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                </Select>
              </div>
            </div>
            
            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Advanced Filters</h4>
                
                {/* Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate" className="font-mono text-xs uppercase tracking-wider">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1 text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="font-mono text-xs uppercase tracking-wider">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1 text-base sm:text-sm"
                    />
                  </div>
                </div>
                
                {/* Amount Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minAmount" className="font-mono text-xs uppercase tracking-wider">Min Amount ($)</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="mt-1 text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAmount" className="font-mono text-xs uppercase tracking-wider">Max Amount ($)</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="mt-1 text-base sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({});
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                  setMinAmount('');
                  setMaxAmount('');
                }}
                className="text-sm"
              >
                Clear All Filters
              </Button>
              {(startDate || endDate || minAmount || maxAmount || searchTerm || filters.category || filters.account || filters.type) && (
                <Badge variant="secondary" className="text-xs font-mono">
                  {[startDate && 'Date Range', minAmount && 'Min Amount', maxAmount && 'Max Amount', searchTerm && 'Search', filters.category && 'Category', filters.account && 'Account', filters.type && 'Type'].filter(Boolean).length} active filter{[startDate && 'Date Range', minAmount && 'Min Amount', maxAmount && 'Max Amount', searchTerm && 'Search', filters.category && 'Category', filters.account && 'Account', filters.type && 'Type'].filter(Boolean).length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}