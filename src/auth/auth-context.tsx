import { type PropsWithChildren, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import type { AuthAdapter } from './types';

interface AuthProviderProps extends PropsWithChildren {
  adapter?: AuthAdapter;
}

export function AuthProvider({ adapter, children }: AuthProviderProps) {
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    void refreshUser(adapter);
  }, [adapter, refreshUser]);

  return <>{children}</>;
}

export const useNebulaAuth = useAuthStore;
