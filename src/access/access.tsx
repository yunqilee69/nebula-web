import type { PropsWithChildren, ReactNode } from 'react';
import { useNebulaAuth } from '@/auth/auth-context';
import { hasPermission } from './permissions';

interface AccessProps extends PropsWithChildren {
  permission?: string;
  fallback?: ReactNode;
}

export function Access({ permission, fallback = null, children }: AccessProps) {
  const permissions = useNebulaAuth((state) => state.permissions);

  if (!hasPermission(permissions, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
