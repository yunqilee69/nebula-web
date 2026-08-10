import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Empty, Flex, Input, Popconfirm, Space, Spin, Tag, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotice } from '@/hooks/use-notice';
import { cacheService, type CacheService } from '@/services/cache';
import type { CacheEntryResp, CacheResp } from '@/types/cache';

export interface CacheManagementPageProps {
  readonly service?: CacheService;
}

type CacheEntryItem = {
  readonly cacheName: string;
  readonly defaultTtlSeconds?: number;
  readonly entry: CacheEntryResp;
};

const useStyles = createStyles(({ token }) => ({
  inspector: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 34%) minmax(0, 1fr)',
    gap: token.marginMD,
    minHeight: 0,
    flex: 1,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  pane: {
    minHeight: 0,
    overflow: 'hidden',
  },
  scrollBody: {
    minHeight: 0,
    overflow: 'auto',
  },
  keyButton: {
    width: '100%',
    height: 'auto',
    justifyContent: 'flex-start',
    paddingBlock: token.paddingSM,
    textAlign: 'left',
  },
  codeBlock: {
    minHeight: 280,
    margin: 0,
    padding: token.padding,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgLayout,
    color: token.colorText,
    fontFamily: token.fontFamilyCode,
    overflow: 'auto',
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
}));

function formatSeconds(value: number | undefined): string {
  return value === undefined ? '-' : `${value}s`;
}

function getEntryId(item: CacheEntryItem): string {
  return `${item.cacheName}:${item.entry.cacheKey}`;
}

function formatCacheValue(value: string | undefined): string {
  if (!value) return '-';
  try {
    const parsed: unknown = JSON.parse(value);
    return JSON.stringify(parsed, null, 2) ?? value;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return value;
    throw error;
  }
}

function flattenCaches(caches: readonly CacheResp[]): readonly CacheEntryItem[] {
  return caches.flatMap((cache) => cache.entries.map((entry) => ({
    cacheName: cache.cacheName,
    defaultTtlSeconds: cache.defaultTtlSeconds,
    entry,
  })));
}

function includesText(value: string | undefined, keyword: string): boolean {
  return value?.toLowerCase().includes(keyword.toLowerCase()) ?? false;
}

export function CacheManagementPage({ service: serviceProp }: CacheManagementPageProps) {
  const service = serviceProp ?? cacheService;
  const notice = useNotice();
  const { styles } = useStyles();

  const [caches, setCaches] = useState<readonly CacheResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cacheNameFilter, setCacheNameFilter] = useState('');
  const [cacheKeyFilter, setCacheKeyFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  const allEntries = useMemo(() => flattenCaches(caches), [caches]);
  const filteredEntries = useMemo(() => allEntries.filter((item) => {
    const cacheNameMatched = cacheNameFilter.trim() === '' || includesText(item.cacheName, cacheNameFilter.trim());
    const cacheKeyMatched = cacheKeyFilter.trim() === '' || includesText(item.entry.cacheKey, cacheKeyFilter.trim());
    return cacheNameMatched && cacheKeyMatched;
  }), [allEntries, cacheKeyFilter, cacheNameFilter]);
  const selectedEntry = filteredEntries.find((item) => getEntryId(item) === selectedId) ?? filteredEntries[0];
  const selectedEntryId = selectedEntry ? getEntryId(selectedEntry) : undefined;

  const loadCaches = useCallback(async () => {
    setLoading(true);
    try {
      setCaches(await service.listCaches());
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('缓存列表加载失败');
        return;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [notice, service]);

  useEffect(() => {
    void loadCaches();
  }, [loadCaches]);

  const deleteEntries = useCallback(async (entries: readonly CacheEntryItem[], successMessage: string) => {
    if (entries.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(entries.map((item) => service.deleteCacheEntry({
        cacheName: item.cacheName,
        cacheKey: item.entry.cacheKey,
      })));
      notice.success(successMessage);
      setSelectedId(undefined);
      await loadCaches();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('删除缓存项失败');
        return;
      }
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [loadCaches, notice, service]);

  const deleteSelected = useCallback(() => {
    if (!selectedEntry) return Promise.resolve();
    return deleteEntries([selectedEntry], '缓存项已删除');
  }, [deleteEntries, selectedEntry]);

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      <Card>
        <Flex wrap="wrap" gap="middle" align="end" justify="space-between">
          <Flex wrap="wrap" gap="middle" align="end">
            <Input
              aria-label="缓存名称"
              placeholder="缓存名称"
              value={cacheNameFilter}
              onChange={(event) => setCacheNameFilter(event.target.value)}
              allowClear
              style={{ width: 220 }}
            />
            <Input
              aria-label="缓存键"
              placeholder="缓存键"
              value={cacheKeyFilter}
              onChange={(event) => setCacheKeyFilter(event.target.value)}
              allowClear
              style={{ width: 260 }}
            />
          </Flex>
          <Space wrap>
            <Button aria-label="刷新" icon={<ReloadOutlined />} onClick={() => void loadCaches()} loading={loading}>刷新</Button>
            <Popconfirm title="确认删除当前缓存项？" okText="删除" cancelText="取消" onConfirm={() => void deleteSelected()}>
              <Button aria-label="删除当前 Key" danger icon={<DeleteOutlined />} disabled={!selectedEntry || deleting} loading={deleting}>删除当前 Key</Button>
            </Popconfirm>
            <Popconfirm
              title="确认删除当前筛选结果中的全部缓存项？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => void deleteEntries(filteredEntries, '缓存项已批量删除')}
            >
              <Button danger disabled={filteredEntries.length === 0 || deleting} loading={deleting}>删除全部</Button>
            </Popconfirm>
          </Space>
        </Flex>
      </Card>

      <div className={styles.inspector}>
        <Card className={styles.pane} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 } }}>
          <Flex justify="space-between" align="center" className="mb-3">
            <Typography.Text strong>缓存 Key</Typography.Text>
            <Tag color="blue">{filteredEntries.length} 项</Tag>
          </Flex>
          <Spin spinning={loading} classNames={{ root: 'min-h-0 flex-1' }}>
            <Space orientation="vertical" size="small" className={`${styles.scrollBody} w-full`}>
              {filteredEntries.map((item) => {
                const itemId = getEntryId(item);
                return (
                  <Button
                    key={itemId}
                    aria-label={`选择缓存 ${item.entry.cacheKey}`}
                    className={styles.keyButton}
                    type={itemId === selectedEntryId ? 'primary' : 'text'}
                    onClick={() => setSelectedId(itemId)}
                  >
                    <Space orientation="vertical" size={2} className="w-full">
                      <Typography.Text code ellipsis>{item.entry.cacheKey}</Typography.Text>
                    </Space>
                  </Button>
                );
              })}
              {filteredEntries.length === 0 && !loading ? <Empty description="未找到匹配缓存项" /> : null}
            </Space>
          </Spin>
        </Card>

        <Card className={styles.pane} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 } }}>
          {selectedEntry ? (
            <Space orientation="vertical" size="middle" className="min-h-0 w-full flex-1">
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="缓存名称">{selectedEntry.cacheName}</Descriptions.Item>
                <Descriptions.Item label="值类型">{selectedEntry.entry.cacheValueType ? <Tag>{selectedEntry.entry.cacheValueType}</Tag> : '-'}</Descriptions.Item>
                <Descriptions.Item label="缓存 Key" span={2}><Typography.Text code>{selectedEntry.entry.cacheKey}</Typography.Text></Descriptions.Item>
                <Descriptions.Item label="默认 TTL">{formatSeconds(selectedEntry.defaultTtlSeconds)}</Descriptions.Item>
                <Descriptions.Item label="写入 TTL">{formatSeconds(selectedEntry.entry.ttlSeconds)}</Descriptions.Item>
                <Descriptions.Item label="剩余 TTL">{formatSeconds(selectedEntry.entry.remainingTtlSeconds)}</Descriptions.Item>
              </Descriptions>
              <pre className={styles.codeBlock}>{formatCacheValue(selectedEntry.entry.cacheValueJson)}</pre>
            </Space>
          ) : (
            <Empty description="请选择左侧缓存 Key" />
          )}
        </Card>
      </div>
    </div>
  );
}

export default CacheManagementPage;
