import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * useAuth Hook
 *
 * Simple hook to access the AuthContext.
 * All auth logic is now centralized in AuthContext to prevent multiple instances.
 *
 * Usage:
 * ```typescript
 * const { isBackendAuthenticated, getBackendToken, triggerSIWE } = useAuth();
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
