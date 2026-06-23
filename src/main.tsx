import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { NebulaProvider } from '@/app/nebula-provider';
import { toCurrentUser } from '@/auth/current-user';
import { getStoredAccessToken, getStoredRefreshToken } from '@/auth/token-session';
import { authService } from '@/services/auth';
import { builtInMenuComponentRegistry } from '@/routing/menu-component-registry';
import { createNebulaRouter } from '@/routing/create-nebula-router';
import type { NebulaRouteObject } from '@/routing/types';
import { useAuthStore } from '@/stores/auth-store';

// Permission-controlled business routes are generated from backend menu records via the component registry below.
// If the backend does not provide any usable page, the shell renders its empty-module fallback at the root.
const routes: NebulaRouteObject[] = [];

const authAdapter = {
  getCurrentUser: async () => {
    if (!getStoredAccessToken() && !getStoredRefreshToken()) {
      return null;
    }

    try {
      const currentUser = await authService.getCurrentUser();
      return currentUser ? toCurrentUser(currentUser) : null;
    } catch {
      return null;
    }
  },
};

export function App() {
  const backendMenus = useAuthStore((state) => state.user?.menuList);
  const router = useMemo(
    // Recreate the router when backend menus arrive so dynamic menu routes are registered with the latest permissions.
    () => createNebulaRouter({ routes, backendMenus, componentRegistry: builtInMenuComponentRegistry }),
    [backendMenus],
  );

  return (
    <NebulaProvider authAdapter={authAdapter} loginBadge={{ authService }}>
      <RouterProvider key={backendMenus ? 'backend-menu-router' : 'static-router'} router={router} />
    </NebulaProvider>
  );
}

export default App;
