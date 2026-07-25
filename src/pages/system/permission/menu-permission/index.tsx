import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Flex, Input, Row, Spin, Tree, Tag } from 'antd';
import type { TreeProps } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { permissionService as defaultPermissionService } from '@/services/permission';
import type { PermissionService } from '@/services/permission';
import type { PermissionResourceGroup, PermissionSubject, PermissionSubjectType } from '@/types/permission';
import { SubjectSelector } from '@/components/subject-selector';

export interface MenuPermissionPageProps {
  service?: PermissionService;
}

export function MenuPermissionPage({ service: serviceProp }: MenuPermissionPageProps) {
  const service = serviceProp ?? defaultPermissionService;
  const { t } = useNebulaI18n();
  const notice = useNotice();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState<PermissionSubjectType>('ORG');
  const [subjectKeyword, setSubjectKeyword] = useState('');
  const [resourceKeyword, setResourceKeyword] = useState('');
  const [orgs, setOrgs] = useState<PermissionSubject[]>([]);
  const [roles, setRoles] = useState<PermissionSubject[]>([]);
  const [users, setUsers] = useState<PermissionSubject[]>([]);
  const [resources, setResources] = useState<PermissionResourceGroup[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<PermissionSubject>();
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([service.listSubjects(), service.listResourceGroups()])
      .then(([subjects, groups]) => {
        if (!mounted) return;
        setOrgs(subjects.orgs);
        setRoles(subjects.roles);
        setUsers(subjects.users);
        setResources(groups);
        setSelectedSubject(subjects.orgs[0] ?? subjects.roles[0] ?? subjects.users[0]);
        const allGroupKeys = groups.map((g) => `group-${g.key}`);
        setExpandedKeys(allGroupKeys);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [service]);

  useEffect(() => {
    if (!selectedSubject) return;

    let mounted = true;

    service
      .pageSubjectPermissions({ subjectType: selectedSubject.type, subjectId: selectedSubject.id, resourceType: 'MENU' })
      .then((page) => {
        if (!mounted) return;
        const allowedMenuIds = page.data
          .filter((g) => g.effect === 'Allow')
          .map((g) => g.resourceId);
        setCheckedKeys(allowedMenuIds);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        notice.error(t('auth.permissionConfig.feedback.loadFailed'));
        console.error('Failed to load permissions:', error);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSubject, service, notice, t]);

  const handleSave = useCallback(async () => {
    if (!selectedSubject) return;

    setSaving(true);
    try {
      const permissions = resources.flatMap((group) =>
        (group.menus ?? []).map((menu) => ({
          resourceType: 'MENU' as const,
          resourceId: menu.id,
          effect: checkedKeys.includes(menu.id) ? 'Allow' as const : 'Deny' as const,
          scope: 'ALL',
        })),
      );

      await service.saveSubjectPermissions({
        subjectType: selectedSubject.type,
        subjectId: selectedSubject.id,
        permissions,
      });
      notice.success(t('auth.permissionConfig.feedback.saveSuccess'));
    } catch (error) {
      notice.error('保存失败');
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  }, [selectedSubject, service, resources, checkedKeys, notice, t]);

  const handleCheck: TreeProps['onCheck'] = (keys) => {
    setCheckedKeys(keys as React.Key[]);
  };

  const treeData = useMemo(() => {
    if (!resources || resources.length === 0) return [];
    const normalized = resourceKeyword.trim().toLowerCase();
    return resources
      .map((group) => {
        const menus = group.menus ?? [];
        const filteredMenus = menus.filter((menu) => {
          if (!normalized) return true;
          return `${menu.name} ${menu.code} ${menu.path ?? ''}`.toLowerCase().includes(normalized);
        });
        if (filteredMenus.length === 0 && normalized) return null;
        return {
          title: group.name,
          key: `group-${group.key}`,
          selectable: false,
          children: filteredMenus.map((menu) => ({
            title: (
              <span>
                {menu.name} {menu.path && <Tag color="blue">{menu.path}</Tag>}
              </span>
            ),
            key: menu.id,
          })),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [resources, resourceKeyword]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin />
      </div>
    );
  }

  return (
    <Row gutter={16} style={{ height: '100%' }}>
      <Col xs={24} lg={6}>
        <SubjectSelector
          activeType={activeType}
          keyword={subjectKeyword}
          orgSubjects={orgs}
          roleSubjects={roles}
          userSubjects={users}
          selectedSubject={selectedSubject}
          onTypeChange={(type) => {
            setActiveType(type);
            setSubjectKeyword('');
          }}
          onKeywordChange={setSubjectKeyword}
          onSelect={setSelectedSubject}
        />
      </Col>
      <Col xs={24} lg={18}>
        <Card
          title="菜单权限"
          extra={
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存
            </Button>
          }
          styles={{ body: { padding: 14, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' } }}
        >
          <Flex wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder="搜索菜单"
              value={resourceKeyword}
              onChange={(e) => setResourceKeyword(e.target.value)}
              style={{ width: 280 }}
            />
            <Button disabled={saving} onClick={() => setCheckedKeys([])}>
              全部取消
            </Button>
            <Button disabled={saving} onClick={() => setCheckedKeys(resources.flatMap((g) => g.menus.map((m) => m.id)))}>
              全部选中
            </Button>
          </Flex>
          {treeData.length === 0 ? (
            <Empty description="暂无菜单资源" />
          ) : (
            <Tree
              checkable
              checkedKeys={checkedKeys}
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              onCheck={handleCheck}
              treeData={treeData}
              selectable={false}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}

export default MenuPermissionPage;