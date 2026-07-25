import { ApartmentOutlined } from '@ant-design/icons';
import { Tag, theme as antdTheme } from 'antd';
import { useMemo } from 'react';
import { NeTree } from '@/components/ne-tree';
import type { NeTreeNode } from '@/components/ne-tree/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgTreeResp } from '@/types/auth-management';
import type { OrgTreeProps } from './types';

function collectExpandableOrgKeys(items: OrgTreeResp[]): string[] {
  return items.flatMap((item) => {
    const childKeys = collectExpandableOrgKeys(item.children ?? []);
    return item.children?.length ? [item.id, ...childKeys] : childKeys;
  });
}

function toNeTreeNodes(
  items: OrgTreeResp[],
  showStatusTags: boolean,
  statusLabels: { enabled: string; disabled: string },
): NeTreeNode[] {
  return items.map((item) => ({
    key: item.id,
    title: item.name,
    icon: <ApartmentOutlined />,
    tag: showStatusTags
      ? item.status === 1
        ? <Tag color="success">{statusLabels.enabled}</Tag>
        : <Tag>{statusLabels.disabled}</Tag>
      : undefined,
    children: item.children?.length
      ? toNeTreeNodes(item.children, showStatusTags, statusLabels)
      : undefined,
  }));
}

function findOrgById(items: OrgTreeResp[], id: string): OrgTreeResp | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.children ? findOrgById(item.children, id) : undefined;
    if (found) return found;
  }
  return undefined;
}

export function OrgTree({
  dataSource,
  selectedKey,
  defaultSelectedKey,
  expandedKeys,
  defaultExpandedKeys,
  title,
  extra,
  searchable = true,
  searchPlaceholder,
  emptyText,
  showStatusTags = true,
  className,
  style,
  onSelect,
  onExpand,
}: OrgTreeProps) {
  const { token } = antdTheme.useToken();
  const { t } = useNebulaI18n();

  const statusLabels = useMemo(
    () => ({
      enabled: t('auth.orgManagement.status.enabled'),
      disabled: t('auth.orgManagement.status.disabled'),
    }),
    [t],
  );

  const defaultTitle = t('auth.orgManagement.tree.title');
  const defaultSearchPlaceholder = t('auth.orgManagement.tree.searchPlaceholder');
  const rootCountLabel = t('auth.orgManagement.tree.rootCount');

  const treeNodes = useMemo(
    () => toNeTreeNodes(dataSource, showStatusTags, statusLabels),
    [dataSource, showStatusTags, statusLabels],
  );

  const autoExpandedKeys = useMemo(
    () => collectExpandableOrgKeys(dataSource),
    [dataSource],
  );

  const handleSelect = (key: string) => {
    const org = findOrgById(dataSource, key);
    if (org) {
      onSelect?.(key, org);
    }
  };

  const rootCount = dataSource.length;

  return (
    <NeTree
      title={title ?? defaultTitle}
      dataSource={treeNodes}
      selectedKey={selectedKey}
      defaultSelectedKey={defaultSelectedKey}
      expandedKeys={expandedKeys}
      defaultExpandedKeys={defaultExpandedKeys ?? autoExpandedKeys}
      extra={extra ?? <Tag>{rootCount} {rootCountLabel}</Tag>}
      searchable={searchable}
      searchPlaceholder={searchPlaceholder ?? defaultSearchPlaceholder}
      emptyText={emptyText ?? '暂无组织数据'}
      className={className}
      style={{
        minHeight: 360,
        height: '100%',
        background: token.colorBgContainer,
        ...style,
      }}
      onSelect={handleSelect}
      onExpand={onExpand}
    />
  );
}