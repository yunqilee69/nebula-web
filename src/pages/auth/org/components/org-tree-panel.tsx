import { ApartmentOutlined } from '@ant-design/icons';
import { Tag } from 'antd';
import { useMemo } from 'react';
import { NeTree } from '@/components/ne-tree';
import type { NeTreeNode } from '@/components/ne-tree/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { OrgTreeResp } from '@/types/auth-management';

interface OrgTreePanelProps {
  tree: OrgTreeResp[];
  selectedKey?: string;
  onSelect: (orgId: string) => void;
}

function toNeTreeNodes(items: OrgTreeResp[], statusLabels: { enabled: string; disabled: string }): NeTreeNode[] {
  return items.map((item) => ({
    key: item.id,
    title: item.name,
    icon: <ApartmentOutlined />,
    tag: item.status === 1 ? <Tag color="success">{statusLabels.enabled}</Tag> : <Tag>{statusLabels.disabled}</Tag>,
    children: item.children?.length ? toNeTreeNodes(item.children, statusLabels) : undefined,
  }));
}

function collectExpandableOrgKeys(items: OrgTreeResp[]): string[] {
  return items.flatMap((item) => {
    const childKeys = collectExpandableOrgKeys(item.children ?? []);
    return item.children?.length ? [item.id, ...childKeys] : childKeys;
  });
}

export function OrgTreePanel({ tree, selectedKey, onSelect }: OrgTreePanelProps) {
  const { t } = useNebulaI18n();
  const expandedKeys = useMemo(() => collectExpandableOrgKeys(tree), [tree]);
  const statusLabels = { enabled: t('auth.orgManagement.status.enabled'), disabled: t('auth.orgManagement.status.disabled') };

  return (
    <NeTree
      title={t('auth.orgManagement.tree.title')}
      dataSource={toNeTreeNodes(tree, statusLabels)}
      selectedKey={selectedKey}
      expandedKeys={expandedKeys}
      searchable
      searchPlaceholder={t('auth.orgManagement.tree.searchPlaceholder')}
      extra={<Tag>{tree.length} {t('auth.orgManagement.tree.rootCount')}</Tag>}
      onSelect={(key) => onSelect(key)}
      style={{ minHeight: 360 }}
    />
  );
}
