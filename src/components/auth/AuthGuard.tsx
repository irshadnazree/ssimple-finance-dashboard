import { useEffect, useState } from 'react';
import { Navigate, useLocation } from '@tanstack/react-router';
import { Card, CardContent } from '../ui/card';
import { Loader2 } from 'lucide-react';
import type { AuthState, AuthSession } from '../../types/auth';
import { useAuthStore } from '../../stores/authStore';
import { AuthScreen } from './AuthScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * Authentication Guard Component
 * Protects routes by requiring authentication before allowing access
 */
export function AuthGuard({ 
  children, 
  fallback, 
  requireAuth = true 
}: AuthGuardProps) {
  const { authState, getAuthState, addEventListener, removeEventListener } = useAuthStore();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth state changes
    addEventListener('login', () => {
      checkAuthStatus();
    });
    
    addEventListener('logout', () => {
      setSession(null);
      if (requireAuth) {
        setShowAuthScreen(true);
      }
    });

    return () => {
      removeEventListener('login', () => {
        checkAuthStatus();
      });
      removeEventListener('logout', () => {
        setSession(null);
        if (requireAuth) {
          setShowAuthScreen(true);
        }
      });
    };
  }, [requireAuth, addEventListener, removeEventListener]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Get current auth state
      const currentState = getAuthState();
      
      // Check if there's an active session from auth state
      const currentSession = currentState.session;
      setSession(currentSession);
      
      // If auth is required but user is not authenticated, show auth screen
      if (requireAuth && (currentState.status !== 'authenticated' || !currentSession?.isActive)) {
        setShowAuthScreen(true);
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      if (requireAuth) {
        setShowAuthScreen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthScreen(false);
    // Optionally refresh auth state
    checkAuthStatus();
  };

  const handleAuthCancel = () => {
    // If auth is required, user cannot cancel
    if (!requireAuth) {
      setShowAuthScreen(false);
    }
  };

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center p-8">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Checking authentication...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    );
  }

  // Show authentication screen if required
  if (showAuthScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
          />
        </div>
      </div>
    );
  }

  // If auth is not required, always show children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If auth is required and user is authenticated, show children
  if (authState?.status === 'authenticated' && session?.isActive) {
    return <>{children}</>;
  }

  // If auth is required but user is not authenticated, redirect to auth
  // This is a fallback in case showAuthScreen logic fails
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthScreen
            onAuthSuccess={handleAuthSuccess}
          />
        </div>
      </div>
  );
}

/**
 * Higher-order component for protecting routes
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: { requireAuth?: boolean; fallback?: React.ReactNode } = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard 
        requireAuth={options.requireAuth} 
        fallback={options.fallback}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Hook for checking authentication status
 */
export function useAuthGuard() {
  const { getAuthState, addEventListener, removeEventListener } = useAuthStore();
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const state = await getAuthState();
        const currentSession = state.session;
        setAuthState(state);
        setSession(currentSession);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    addEventListener('login', () => {
      checkAuth();
    });
    
    addEventListener('logout', () => {
      setAuthState(null);
      setSession(null);
      setIsLoading(false);
    });

    return () => {
      removeEventListener('login', () => {
        checkAuth();
      });
      removeEventListener('logout', () => {
        setAuthState(null);
        setSession(null);
        setIsLoading(false);
      });
    };
  }, [getAuthState, addEventListener, removeEventListener]);

  return {
      authState,
      session,
      isLoading,
      isAuthenticated: authState?.status === 'authenticated' && session?.isActive,
      requiresSetup: authState?.status === 'setup_required'
    };
}

export default AuthGuard;