import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Collapse, Empty, Flex, Input, List, Row, Spin, Tag, Typography } from 'antd';
import type { CollapseProps } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { permissionService as defaultPermissionService } from '@/services/permission';
import type { PermissionService } from '@/services/permission';
import type { PermissionMenuResource, PermissionResourceGroup, PermissionSubject, PermissionSubjectType } from '@/types/permission';
import { SubjectSelector } from '@/components/subject-selector';

export interface ButtonPermissionPageProps {
  service?: PermissionService;
}

export function ButtonPermissionPage({ service: serviceProp }: ButtonPermissionPageProps) {
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
  const [checkedButtonIds, setCheckedButtonIds] = useState<Set<string>>(new Set());
  const [activeCollapseKeys, setActiveCollapseKeys] = useState<string[]>([]);

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
      .pageSubjectPermissions({ subjectType: selectedSubject.type, subjectId: selectedSubject.id, resourceType: 'BUTTON' })
      .then((page) => {
        if (!mounted) return;
        const allowedButtonIds = new Set(
          page.data
            .filter((g) => g.effect === 'Allow')
            .map((g) => g.resourceId),
        );
        setCheckedButtonIds(allowedButtonIds);
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

  const handleToggleButton = useCallback((buttonId: string) => {
    setCheckedButtonIds((prev) => {
      const next = new Set(prev);
      if (next.has(buttonId)) {
        next.delete(buttonId);
      } else {
        next.add(buttonId);
      }
      return next;
    });
  }, []);

  const handleToggleMenuButtons = useCallback((menu: PermissionMenuResource, selectAll: boolean) => {
    setCheckedButtonIds((prev) => {
      const next = new Set(prev);
      menu.buttons.forEach((button) => {
        if (selectAll) {
          next.add(button.id);
        } else {
          next.delete(button.id);
        }
      });
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedSubject) return;

    setSaving(true);
    try {
      const permissions = resources.flatMap((group) =>
        (group.menus ?? []).flatMap((menu) =>
          (menu.buttons ?? []).map((button) => ({
            resourceType: 'BUTTON' as const,
            resourceId: button.id,
            effect: checkedButtonIds.has(button.id) ? 'Allow' as const : 'Deny' as const,
            scope: 'ALL',
          })),
        ),
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
  }, [selectedSubject, service, resources, checkedButtonIds, notice, t]);

  const handleBulkSelect = useCallback((selectAll: boolean) => {
    if (selectAll) {
      const allButtonIds = resources.flatMap((g) => (g.menus ?? []).flatMap((m) => (m.buttons ?? []).map((b) => b.id)));
      setCheckedButtonIds(new Set(allButtonIds));
    } else {
      setCheckedButtonIds(new Set());
    }
  }, [resources]);

  const filteredGroups = useMemo(() => {
    if (!resources || resources.length === 0) return [];
    const normalized = resourceKeyword.trim().toLowerCase();
    if (!normalized) return resources;

    return resources
      .map((group) => ({
        ...group,
        menus: (group.menus ?? [])
          .map((menu) => ({
            ...menu,
            buttons: (menu.buttons ?? []).filter((button) =>
              `${button.name} ${button.code}`.toLowerCase().includes(normalized),
            ),
          }))
          .filter((menu) => menu.buttons.length > 0),
      }))
      .filter((group) => group.menus.length > 0);
  }, [resources, resourceKeyword]);

  const collapseItems: CollapseProps['items'] = useMemo(() => {
    return filteredGroups.flatMap((group) =>
      group.menus.map((menu) => ({
        key: menu.id,
        label: (
          <Flex justify="space-between" align="center">
            <span>
              {menu.name} <Tag color="blue">{menu.path}</Tag>
            </span>
            <Flex gap={8}>
              <Button
                size="small"
                type="link"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMenuButtons(menu, true);
                }}
              >
                全选
              </Button>
              <Button
                size="small"
                type="link"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleMenuButtons(menu, false);
                }}
              >
                取消
              </Button>
            </Flex>
          </Flex>
        ),
        children: (
          <List
            size="small"
            dataSource={menu.buttons}
            renderItem={(button) => (
              <List.Item
                style={{ cursor: 'pointer', background: checkedButtonIds.has(button.id) ? '#e6f7ff' : undefined }}
                onClick={() => handleToggleButton(button.id)}
              >
                <List.Item.Meta
                  title={button.name}
                  description={<Typography.Text type="secondary">{button.code}</Typography.Text>}
                />
                {checkedButtonIds.has(button.id) && <Tag color="green">已授权</Tag>}
              </List.Item>
            )}
          />
        ),
      })),
    );
  }, [filteredGroups, checkedButtonIds, handleToggleButton, handleToggleMenuButtons]);

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
          title="按钮权限"
          extra={
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存
            </Button>
          }
          styles={{ body: { padding: 14, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' } }}
        >
          <Flex wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder="搜索按钮"
              value={resourceKeyword}
              onChange={(e) => setResourceKeyword(e.target.value)}
              style={{ width: 280 }}
            />
            <Button disabled={saving} onClick={() => handleBulkSelect(true)}>
              全部选中
            </Button>
            <Button disabled={saving} onClick={() => handleBulkSelect(false)}>
              全部取消
            </Button>
          </Flex>
          {collapseItems.length === 0 ? (
            <Empty description="暂无按钮资源" />
          ) : (
            <Collapse
              activeKey={activeCollapseKeys}
              onChange={(keys) => setActiveCollapseKeys(keys as string[])}
              items={collapseItems}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}

export default ButtonPermissionPage;