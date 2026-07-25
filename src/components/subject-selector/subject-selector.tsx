import { Card, Empty, Input, List, Tabs, Tag, Typography, theme as antdTheme } from 'antd';
import type { TabsProps } from 'antd';
import { useMemo } from 'react';
import { NeTree } from '@/components/ne-tree';
import type { NeTreeNode } from '@/components/ne-tree/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { PermissionSubject, PermissionSubjectType } from '@/types/permission';

export interface SubjectSelectorProps {
  activeType: PermissionSubjectType;
  keyword: string;
  orgSubjects: PermissionSubject[];
  roleSubjects: PermissionSubject[];
  userSubjects: PermissionSubject[];
  selectedSubject?: PermissionSubject;
  onTypeChange: (type: PermissionSubjectType) => void;
  onKeywordChange: (keyword: string) => void;
  onSelect: (subject: PermissionSubject) => void;
}

function toTreeNodes(subjects: PermissionSubject[]): NeTreeNode[] {
  return subjects.map((subject) => ({
    key: subject.id,
    title: subject.name,
    tag: subject.code ? <Tag>{subject.code}</Tag> : undefined,
    children: subject.children ? toTreeNodes(subject.children) : undefined,
  }));
}

function flattenSubjects(subjects: PermissionSubject[]): PermissionSubject[] {
  return subjects.flatMap((subject) => [subject, ...flattenSubjects(subject.children ?? [])]);
}

function filterSubjectTree(subjects: PermissionSubject[], keyword: string): PermissionSubject[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return subjects;

  return subjects.flatMap((subject) => {
    const children = filterSubjectTree(subject.children ?? [], keyword);
    const matched = `${subject.name} ${subject.code} ${subject.description ?? ''}`.toLowerCase().includes(normalized);
    if (!matched && children.length === 0) return [];
    return [{ ...subject, children }];
  });
}

function filterSubjects(subjects: PermissionSubject[], keyword: string): PermissionSubject[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return subjects;
  return subjects.filter((subject) =>
    `${subject.name} ${subject.code} ${subject.description ?? ''}`.toLowerCase().includes(normalized),
  );
}

export function SubjectSelector({
  activeType,
  keyword,
  orgSubjects,
  roleSubjects,
  userSubjects,
  selectedSubject,
  onTypeChange,
  onKeywordChange,
  onSelect,
}: SubjectSelectorProps) {
  const { token } = antdTheme.useToken();
  const { t } = useNebulaI18n();

  const flatOrgs = useMemo(() => flattenSubjects(orgSubjects), [orgSubjects]);
  const filteredOrgTree = useMemo(() => filterSubjectTree(orgSubjects, keyword), [orgSubjects, keyword]);

  const currentSubjects = activeType === 'ROLE' ? roleSubjects : activeType === 'USER' ? userSubjects : flatOrgs;
  const filteredSubjects = filterSubjects(currentSubjects, keyword);

  const tabItems: TabsProps['items'] = [
    { key: 'ORG', label: '组织' },
    { key: 'ROLE', label: '角色' },
    { key: 'USER', label: '用户' },
  ];

  return (
    <Card styles={{ body: { padding: 14 } }}>
      <Tabs activeKey={activeType} items={tabItems} onChange={(key) => onTypeChange(key as PermissionSubjectType)} />
      <Input.Search
        placeholder={activeType === 'ORG' ? '搜索组织' : activeType === 'ROLE' ? '搜索角色' : '搜索用户'}
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
      />
      {activeType === 'ORG' ? (
        <div style={{ marginTop: 12 }}>
          <NeTree
            title={activeType === 'ORG' ? '组织列表' : undefined}
            dataSource={toTreeNodes(filteredOrgTree)}
            selectedKey={selectedSubject?.id}
            searchable={false}
            emptyText={<Empty description="暂无组织数据" />}
            onSelect={(key) => {
              const subject = flatOrgs.find((item) => item.id === key);
              if (subject) onSelect(subject);
            }}
          />
        </div>
      ) : (
        <List
          style={{ marginTop: 12 }}
          dataSource={filteredSubjects}
          locale={{ emptyText: <Empty description={activeType === 'ROLE' ? '暂无角色数据' : '暂无用户数据'} /> }}
          renderItem={(subject) => (
            <List.Item
              style={{ cursor: 'pointer', background: subject.id === selectedSubject?.id ? token.colorPrimaryBg : undefined, borderRadius: 4, padding: '8px 12px' }}
              onClick={() => onSelect(subject)}
            >
              <List.Item.Meta
                title={subject.name}
                description={
                  <Typography.Text type="secondary">
                    {subject.code}{subject.description ? ` · ${subject.description}` : ''}
                  </Typography.Text>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}