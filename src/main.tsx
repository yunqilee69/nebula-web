import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import '@/styles/index.css';
import { NebulaProvider } from '@/providers/nebula-provider';
import { toCurrentUser } from '@/utils/auth/current-user';
import { getStoredAccessToken, getStoredRefreshToken } from '@/utils/auth/token-session';
import { authService } from '@/services/auth';
import { builtInMenuComponentRegistry } from '@/route/menu-component-registry';
import { createNebulaRouter } from '@/route/create-nebula-router';
import type { NebulaRouteObject } from '@/route/types';
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
