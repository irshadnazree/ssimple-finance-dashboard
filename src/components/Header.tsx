import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">Simple Finance</h1>
          </div>
          
          <nav className="flex space-x-8">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              activeProps={{ className: "text-blue-600 bg-blue-50" }}
            >
              Dashboard
            </Link>
            
            <Link 
              to="/transactions" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              activeProps={{ className: "text-blue-600 bg-blue-50" }}
            >
              Transactions
            </Link>
            
            <Link 
              to="/budgets" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              activeProps={{ className: "text-blue-600 bg-blue-50" }}
            >
              Budgets
            </Link>
            
            <Link 
              to="/reports" 
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              activeProps={{ className: "text-blue-600 bg-blue-50" }}
            >
              Reports
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
