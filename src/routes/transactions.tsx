import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const Route = createFileRoute('/transactions')({component: Transactions,})

function Transactions() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Manage your income and expenses</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-12">
              <div className="text-4xl mb-4">💳</div>
              <p className="mb-2">This feature is coming soon!</p>
              <p className="text-sm">
                You'll be able to manage and categorize your transactions here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}