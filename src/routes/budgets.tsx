import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/budgets')({component: Budgets,})

function Budgets() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600">Set and track your spending limits</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center text-gray-500 py-12">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Budget Management</h3>
            <p className="text-gray-600 mb-4">This feature is coming soon!</p>
            <p className="text-sm text-gray-500">
              You'll be able to create, edit, and monitor your budgets here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}