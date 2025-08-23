import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const Route = createFileRoute('/reports')({component: Reports,})

function Reports() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analyze your financial data</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Financial Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-muted-foreground py-12">
              <div className="text-4xl mb-4">📈</div>
              <p className="mb-2">This feature is coming soon!</p>
              <p className="text-sm">
                You'll be able to generate detailed financial reports and analytics here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}