import type { PropsWithChildren, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useNebulaAuth } from '@/auth/auth-context';
import { ExceptionResult } from '@/components/exception-result';
import { hasPermission } from '@/access/permissions';
import { RouteLoading } from './route-loading';

interface RouteGuardProps extends PropsWithChildren {
  requiresAuth?: boolean;
  permission?: string;
  loginPath?: string;
  loadingElement?: ReactNode;
  forbiddenElement?: ReactNode;
}

export function RouteGuard({
  requiresAuth,
  permission,
  loginPath = '/login',
  loadingElement = <RouteLoading />,
  forbiddenElement = <ExceptionResult status="403" subTitle="你没有访问该内容的权限" />,
  children,
}: RouteGuardProps) {
  const user = useNebulaAuth((state) => state.user);
  const permissions = useNebulaAuth((state) => state.permissions);
  const loading = useNebulaAuth((state) => state.loading);

  if (loading) {
    return <>{loadingElement}</>;
  }

  if (requiresAuth && !user) {
    return <Navigate to={loginPath} replace />;
  }

  if (!hasPermission(permissions, permission)) {
    return <>{forbiddenElement}</>;
  }

  return <>{children}</>;
}
