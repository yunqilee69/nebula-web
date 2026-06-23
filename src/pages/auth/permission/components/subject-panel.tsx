import { Card, Empty, Input, List, Tabs, Tag, Typography, theme as antdTheme } from 'antd';
import { useMemo } from 'react';
import { NeTree } from '@/components/ne-tree';
import type { NeTreeNode } from '@/components/ne-tree/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { PermissionSubject, PermissionSubjectType } from '@/types/permission';
import { filterSubjects, SUBJECT_TABS } from './permission-page-shared';

export interface SubjectPanelProps {
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
    tag: <Tag>{subject.code}</Tag>,
    children: subject.children ? toTreeNodes(subject.children) : undefined,
  }));
}

function flattenSubjects(subjects: PermissionSubject[]): PermissionSubject[] {
  return subjects.flatMap((subject) => [subject, ...flattenSubjects(subject.children ?? [])]);
}

function subjectMatches(subject: PermissionSubject, normalized: string): boolean {
  return `${subject.name} ${subject.code} ${subject.description ?? ''}`.toLowerCase().includes(normalized);
}

function filterSubjectTree(subjects: PermissionSubject[], keyword: string): PermissionSubject[] {
  const normalized = keyword.trim().toLowerCase();
  if (!normalized) return subjects;

  return subjects.flatMap((subject) => {
    const children = filterSubjectTree(subject.children ?? [], keyword);
    const matched = subjectMatches(subject, normalized);
    if (!matched && children.length === 0) return [];
    return [{ ...subject, children }];
  });
}

export function SubjectPanel({
  activeType,
  keyword,
  orgSubjects,
  roleSubjects,
  userSubjects,
  selectedSubject,
  onTypeChange,
  onKeywordChange,
  onSelect,
}: SubjectPanelProps) {
  const { token } = antdTheme.useToken();
  const { t } = useNebulaI18n();
  const flatOrgs = useMemo(() => flattenSubjects(orgSubjects), [orgSubjects]);
  const filteredOrgTree = useMemo(() => filterSubjectTree(orgSubjects, keyword), [orgSubjects, keyword]);

  const currentSubjects = activeType === 'ROLE' ? roleSubjects : activeType === 'USER' ? userSubjects : flatOrgs;
  const filteredSubjects = filterSubjects(currentSubjects, keyword);

  return (
    <Card title={t('auth.permissionConfig.subjectsTitle')} styles={{ body: { padding: 14 } }}>
      <Tabs
        activeKey={activeType}
        items={SUBJECT_TABS.map((tab) => ({ key: tab.key, label: t(tab.labelKey) }))}
        onChange={(key) => onTypeChange(key as PermissionSubjectType)}
      />
      <Input.Search
        aria-label={t('auth.permissionConfig.search.subjectAriaLabel')}
        placeholder={t('auth.permissionConfig.search.subjectPlaceholder')}
        value={keyword}
        onChange={(event) => onKeywordChange(event.target.value)}
      />
      {activeType === 'ORG' ? (
        <div style={{ marginTop: 12 }}>
          <NeTree
            title={t('auth.permissionConfig.orgListTitle')}
            dataSource={toTreeNodes(filteredOrgTree)}
            selectedKey={selectedSubject?.id}
            searchable={false}
            emptyText={t('auth.permissionConfig.empty.orgs')}
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
          locale={{ emptyText: <Empty description={t('auth.permissionConfig.empty.subjects')} /> }}
          renderItem={(subject) => (
            <List.Item
              style={{ cursor: 'pointer', background: subject.id === selectedSubject?.id ? token.colorPrimaryBg : undefined }}
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
