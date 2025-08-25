import type { ReactNode } from 'react';
import { RouteLayout, RouteHeader, RouteContent, RouteSection } from './RouteLayout';

interface SettingsLayoutProps {
  children: ReactNode;
  headerActions?: ReactNode;
}

/**
 * Specialized layout for the settings route
 * Provides the specific structure for settings management
 */
export function SettingsLayout({ children, headerActions }: SettingsLayoutProps) {
  return (
    <RouteLayout>
      <RouteHeader
        title="Settings"
        description="Manage your account preferences and application settings"
        actions={headerActions}
      />
      <RouteContent>
        {children}
      </RouteContent>
    </RouteLayout>
  );
}

interface SettingsSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Settings-specific section wrapper
 * Provides consistent spacing for settings sections
 */
export function SettingsSection({ children, className }: SettingsSectionProps) {
  return (
    <RouteSection className={className}>
      {children}
    </RouteSection>
  );
}

interface SettingsGridProps {
  navigation: ReactNode;
  content: ReactNode;
  className?: string;
}

/**
 * Two-column grid layout for settings navigation and content
 * Provides responsive layout with sidebar navigation and main content area
 */
export function SettingsGrid({ navigation, content, className }: SettingsGridProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-4 gap-8 ${className || ''}`}>
      <div className="lg:col-span-1">
        {navigation}
      </div>
      <div className="lg:col-span-3">
        {content}
      </div>
    </div>
  );
}

interface SettingsContentProps {
  children: ReactNode;
  className?: string;
}

/**
 * Content wrapper for settings panels
 * Provides consistent styling for settings content areas
 */
export function SettingsContent({ children, className }: SettingsContentProps) {
  return (
    <div className={`space-y-6 ${className || ''}`}>
      {children}
    </div>
  );
}