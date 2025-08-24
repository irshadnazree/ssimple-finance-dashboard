import type React from 'react';
import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-current border-t-transparent',
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <span className="text-sm text-muted-foreground">{text}</span>
      )}
    </div>
  );
}

export function LoadingOverlay({ children, loading, text }: {
  children: React.ReactNode;
  loading: boolean;
  text?: string;
}) {
  if (!loading) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <LoadingSpinner size="lg" text={text} />
      </div>
    </div>
  );
}

export function LoadingCard({ text = 'Loading...', className }: {
  text?: string;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center justify-center p-8 border border-border rounded-lg bg-card',
      className
    )}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}