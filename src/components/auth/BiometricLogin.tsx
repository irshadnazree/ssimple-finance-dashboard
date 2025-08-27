import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { ArrowLeft, Fingerprint, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import type { AuthResult, BiometricCapabilities } from '../../types/auth';
import { biometricAuthService } from '../../lib/auth/biometricAuthService';

interface BiometricLoginProps {
  onResult: (result: AuthResult) => void;
  onBack: () => void;
  onSwitchToPin?: () => void;
}

type LoginState = 'ready' | 'authenticating' | 'error';

/**
 * Biometric Login Component
 * Handles biometric authentication for existing users
 */
export function BiometricLogin({ onResult, onBack, onSwitchToPin }: BiometricLoginProps) {
  const [state, setState] = useState<LoginState>('ready');
  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const maxAttempts = 3;

  useEffect(() => {
    checkBiometricCapabilities();
  }, []);

  const checkBiometricCapabilities = async () => {
    try {
      const caps = await biometricAuthService.getCapabilities();
      setCapabilities(caps);
      
      if (!caps.available) {
        setError('Biometric authentication is not available on this device');
        return;
      }
      
      if (!caps.enrolled) {
        setError('No biometric credentials are enrolled. Please set up biometric authentication in your system settings.');
        return;
      }
    } catch (err) {
      console.error('Biometric capability check error:', err);
      setError('Failed to check biometric capabilities');
    }
  };

  const handleAuthenticate = async () => {
    if (!capabilities?.available || attemptCount >= maxAttempts) {
      return;
    }

    try {
      setState('authenticating');
      setError(null);
      
      const result = await biometricAuthService.authenticate();
      
      if (result.success) {
        onResult(result);
      } else {
        const newAttemptCount = attemptCount + 1;
        setAttemptCount(newAttemptCount);
        
        if (newAttemptCount >= maxAttempts) {
          setError('Too many failed attempts. Please use PIN authentication or try again later.');
        } else {
          setError(result.error?.message || 'Authentication failed. Please try again.');
        }
        setState('error');
      }
    } catch (err) {
      console.error('Biometric authentication error:', err);
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      
      if (newAttemptCount >= maxAttempts) {
        setError('Too many failed attempts. Please use PIN authentication or try again later.');
      } else {
        setError('Authentication failed. Please try again.');
      }
      setState('error');
    }
  };

  const handleRetry = () => {
    setState('ready');
    setError(null);
  };

  const getBiometricTypeLabel = () => {
    if (!capabilities?.supportedTypes?.length) return 'Biometric';
    
    const type = capabilities.supportedTypes[0];
    switch (type) {
      case 'fingerprint':
        return 'Fingerprint';
      case 'face':
        return 'Face ID';
      case 'voice':
        return 'Voice Recognition';
      default:
        return 'Biometric';
    }
  };

  const getBiometricIcon = () => {
    if (!capabilities?.supportedTypes?.length) return Fingerprint;
    
    const type = capabilities.supportedTypes[0];
    switch (type) {
      case 'fingerprint':
        return Fingerprint;
      case 'face':
        return Shield; // You might want to use a face icon here
      case 'voice':
        return Shield; // You might want to use a microphone icon here
      default:
        return Fingerprint;
    }
  };

  const BiometricIcon = getBiometricIcon();
  const isBlocked = attemptCount >= maxAttempts;
  const canAuthenticate = capabilities?.available && !isBlocked && state !== 'authenticating';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
            disabled={state === 'authenticating'}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="flex items-center space-x-2">
              <BiometricIcon className="h-5 w-5 text-primary" />
              <span>{getBiometricTypeLabel()} Login</span>
            </CardTitle>
            <CardDescription>
              {state === 'ready' && `Use your ${getBiometricTypeLabel().toLowerCase()} to sign in`}
              {state === 'authenticating' && 'Authenticating...'}
              {state === 'error' && 'Authentication failed'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {!isBlocked && attemptCount > 0 && (
                <span className="block mt-1 text-xs">
                  Attempts remaining: {maxAttempts - attemptCount}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Biometric Authentication Area */}
        <div className="text-center space-y-6">
          {/* Biometric Icon */}
          <div className="flex justify-center">
            <button
              type="button"
              className={`p-6 rounded-full transition-all duration-300 border-none ${
                state === 'authenticating' 
                  ? 'bg-primary/20 animate-pulse' 
                  : canAuthenticate
                  ? 'bg-primary/10 hover:bg-primary/20 cursor-pointer'
                  : 'bg-gray-100 cursor-not-allowed'
              }`}
              onClick={canAuthenticate ? handleAuthenticate : undefined}
              disabled={!canAuthenticate}
              aria-label={`Authenticate with ${getBiometricTypeLabel()}`}
            >
              <BiometricIcon className={`h-16 w-16 transition-colors ${
                state === 'authenticating'
                  ? 'text-primary animate-pulse'
                  : canAuthenticate
                  ? 'text-primary'
                  : 'text-gray-400'
              }`} />
            </button>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            {state === 'ready' && canAuthenticate && (
              <>
                <h3 className="text-lg font-medium">Touch to Authenticate</h3>
                <p className="text-sm text-muted-foreground">
                  Place your {getBiometricTypeLabel().toLowerCase()} on the sensor or click the icon above
                </p>
              </>
            )}
            
            {state === 'authenticating' && (
              <>
                <h3 className="text-lg font-medium">Authenticating...</h3>
                <p className="text-sm text-muted-foreground">
                  Please follow the prompts from your device
                </p>
              </>
            )}
            
            {state === 'error' && !isBlocked && (
              <>
                <h3 className="text-lg font-medium text-destructive">Authentication Failed</h3>
                <p className="text-sm text-muted-foreground">
                  Please try again or use PIN authentication
                </p>
              </>
            )}
            
            {isBlocked && (
              <>
                <h3 className="text-lg font-medium text-destructive">Too Many Attempts</h3>
                <p className="text-sm text-muted-foreground">
                  Please use PIN authentication or try again later
                </p>
              </>
            )}
            
            {!capabilities?.available && (
              <>
                <h3 className="text-lg font-medium text-muted-foreground">Not Available</h3>
                <p className="text-sm text-muted-foreground">
                  Biometric authentication is not available on this device
                </p>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Primary Action Button */}
          {canAuthenticate && state === 'ready' && (
            <Button
              onClick={handleAuthenticate}
              className="w-full"
              size="lg"
            >
              Authenticate with {getBiometricTypeLabel()}
            </Button>
          )}
          
          {state === 'error' && !isBlocked && (
            <Button
              onClick={handleRetry}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          {/* Alternative Authentication */}
          {onSwitchToPin && (
            <Button
              onClick={onSwitchToPin}
              variant="outline"
              className="w-full"
              disabled={state === 'authenticating'}
            >
              Use PIN Instead
            </Button>
          )}
        </div>

        {/* Help Text */}
        {capabilities?.available && !isBlocked && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Having trouble? Make sure your {getBiometricTypeLabel().toLowerCase()} is clean and properly positioned.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BiometricLogin;