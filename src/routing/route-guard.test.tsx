import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/auth/auth-context';
import type { AuthAdapter } from '@/auth/types';
import { RouteGuard } from './route-guard';

describe('RouteGuard', () => {
  it('用户缺少权限时展示无权限内容', async () => {
    const adapter: AuthAdapter = {
      getCurrentUser: async () => ({ id: '1', name: '测试用户', roles: [], permissions: [] }),
    };
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <AuthProvider adapter={adapter}>
            <RouteGuard permission="system:user:list" forbiddenElement={<div>无权限</div>}>
              <div>受保护内容</div>
            </RouteGuard>
          </AuthProvider>
        ),
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('无权限')).toBeInTheDocument();
  });
});
