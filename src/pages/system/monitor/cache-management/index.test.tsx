import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { CacheService } from '@/services/cache';
import type { CacheResp } from '@/types/cache';
import { CacheManagementPage } from './index';

const CACHE_GROUPS: readonly CacheResp[] = [
  {
    cacheName: 'login-lock',
    defaultTtlSeconds: 3600,
    entryCount: 1,
    entries: [
      {
        cacheKey: 'lock:alice',
        cacheValueJson: '{"locked":true}',
        cacheValueType: 'LockState',
        ttlSeconds: 3600,
        remainingTtlSeconds: 120,
      },
    ],
  },
  {
    cacheName: 'token-session',
    defaultTtlSeconds: 7200,
    entryCount: 1,
    entries: [
      {
        cacheKey: 'session:bob',
        cacheValueJson: 'plain-token-value',
        cacheValueType: 'String',
        ttlSeconds: 7200,
        remainingTtlSeconds: 600,
      },
    ],
  },
];

function createService(): CacheService {
  return {
    listCaches: vi.fn().mockResolvedValue(CACHE_GROUPS),
    deleteCacheEntry: vi.fn().mockResolvedValue(undefined),
  };
}

function renderPage(service = createService()): CacheService {
  render(
    <NebulaProvider>
      <CacheManagementPage service={service} />
    </NebulaProvider>,
  );

  return service;
}

async function confirmPopover(title: string) {
  const popup = await screen.findByText(title);
  const popover = popup.closest('.ant-popover');
  if (!(popover instanceof HTMLElement)) throw new Error(`Unable to find popover: ${title}`);
  await userEvent.click(within(popover).getByRole('button', { name: /删\s*除/ }));
}

describe('CacheManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders a left key list and formats selected JSON values on the right', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: '选择缓存 lock:alice' }));

    expect(screen.getByText('login-lock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择缓存 lock:alice' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: '缓存 Key lock:alice' })).toBeInTheDocument();
    expect(screen.getByText('LockState')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('"locked": true'))).toBeInTheDocument();
  });

  it('filters the key list from the top search fields', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('button', { name: '选择缓存 lock:alice' });
    await user.type(screen.getByLabelText('缓存键'), 'session');

    expect(screen.queryByRole('button', { name: '选择缓存 lock:alice' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择缓存 session:bob' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('缓存键'));
    await user.type(screen.getByLabelText('缓存名称'), 'missing');

    expect(screen.getByText('未找到匹配缓存项')).toBeInTheDocument();
  });

  it('deletes the selected key and refreshes the list', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.click(await screen.findByRole('button', { name: '选择缓存 lock:alice' }));
    await user.click(screen.getByRole('button', { name: '删除当前 Key' }));
    await confirmPopover('确认删除当前缓存项？');

    await waitFor(() => {
      expect(service.deleteCacheEntry).toHaveBeenCalledWith({ cacheName: 'login-lock', cacheKey: 'lock:alice' });
    });
    await waitFor(() => expect(service.listCaches).toHaveBeenCalledTimes(2));
  });

  it('deletes every visible key from the current filtered result', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await screen.findByRole('button', { name: '选择缓存 lock:alice' });
    await user.click(screen.getByRole('button', { name: '删除全部' }));
    await confirmPopover('确认删除当前筛选结果中的全部缓存项？');

    await waitFor(() => expect(service.deleteCacheEntry).toHaveBeenCalledTimes(2));
    expect(service.deleteCacheEntry).toHaveBeenCalledWith({ cacheName: 'login-lock', cacheKey: 'lock:alice' });
    expect(service.deleteCacheEntry).toHaveBeenCalledWith({ cacheName: 'token-session', cacheKey: 'session:bob' });
  });
});
