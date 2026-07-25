import type { PropsWithChildren, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { ExceptionResult } from '@/layouts/exception-result';
import type { PermissionRequirement } from '@/utils/permissions';
import { hasPermission } from '@/utils/permissions';
import { RouteLoading } from './route-loading';

interface RouteGuardProps extends PropsWithChildren {
  requiresAuth?: boolean;
  permission?: PermissionRequirement;
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
  const user = useAuthStore((state) => state.user);
  const permissions = useAuthStore((state) => state.permissions);
  const roles = useAuthStore((state) => state.roles);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return <>{loadingElement}</>;
  }

  if (requiresAuth && !user) {
    return <Navigate to={loginPath} replace />;
  }

  if (!hasPermission(permissions, permission, { roles })) {
    return <>{forbiddenElement}</>;
  }

  return <>{children}</>;
}
