import type { ReactNode } from 'react';
import { RouteLayout, RouteHeader, RouteContent, RouteSection } from './RouteLayout';

interface DashboardLayoutProps {
  children: ReactNode;
  headerActions?: ReactNode;
}

/**
 * Specialized layout for the dashboard route
 * Provides the specific structure and spacing for dashboard components
 */
export function DashboardLayout({ children, headerActions }: DashboardLayoutProps) {
  return (
    <RouteLayout>
      <RouteHeader
        title="Financial Dashboard"
        description="Overview of your financial health and recent activity"
        actions={headerActions}
      />
      <RouteContent>
        {children}
      </RouteContent>
    </RouteLayout>
  );
}

interface DashboardSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Dashboard-specific section wrapper
 * Provides consistent spacing for dashboard sections
 */
export function DashboardSection({ children, className }: DashboardSectionProps) {
  return (
    <RouteSection className={className}>
      {children}
    </RouteSection>
  );
}

interface DashboardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

/**
 * Grid layout for dashboard components
 * Provides responsive grid layout for dashboard cards and widgets
 */
export function DashboardGrid({ children, columns = 2, className }: DashboardGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-6 ${className || ''}`}>
      {children}
    </div>
  );
}