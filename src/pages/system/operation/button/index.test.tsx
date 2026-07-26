import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ButtonManagementPage } from './index';

vi.mock('@/hooks/use-nebula-i18n', () => ({
  useNebulaI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/use-notice', () => ({
  useNotice: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock('@/services/menu', () => ({
  menuService: {
    getMenuTree: vi.fn().mockResolvedValue([]),
    pageButtons: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
}));

describe('ButtonManagementPage', () => {
  it('renders without crashing', () => {
    render(<ButtonManagementPage />);
    expect(screen.getByText('auth.buttonManagement.tree.title')).toBeInTheDocument();
  });
});