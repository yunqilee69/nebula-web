import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { RouteGuard } from './route-guard';

describe('RouteGuard', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({
      id: '1',
      name: '测试用户',
      roles: [],
      permissions: [],
    });
    useAuthStore.setState({ loading: false });
  });

  afterEach(() => {
    useAuthStore.getState().clearUser();
  });

  it('用户缺少权限时展示无权限内容', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: (
          <RouteGuard permission="system:user:list" forbiddenElement={<div>无权限</div>}>
            <div>受保护内容</div>
          </RouteGuard>
        ),
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(await screen.findByText('无权限')).toBeInTheDocument();
  });
});
