import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Collapse, Empty, Flex, Input, Row, Spin, Tag, Typography, theme as antdTheme } from 'antd';
import type { CollapseProps } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { permissionService as defaultPermissionService } from '@/api/permission';
import type { PermissionService } from '@/api/permission';
import type { MenuTreeResp } from '@/types/menu';
import type {
  PermissionButtonResource,
  PermissionDraftEffect,
  PermissionGrantResp,
  PermissionMenuResource,
  PermissionResourceGroup,
  PermissionSubject,
  PermissionSubjectType,
  SaveSubjectPermissionItem,
} from '@/types/permission';
import { SubjectSelector } from '@/components/subject-selector';
import { syncSubjectPermissions } from '@/utils/permission-sync';

export interface ButtonPermissionPageProps {
  service?: PermissionService;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getOptionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
}

function mapButtonResource(button: unknown, menuId: string): PermissionButtonResource | undefined {
  if (!isRecord(button)) return undefined;
  const id = getOptionalString(button, 'id');
  const name = getOptionalString(button, 'name');
  const code = getOptionalString(button, 'code');
  if (!id || !name || !code) return undefined;

  return {
    id,
    type: 'BUTTON',
    name,
    code,
    description: getOptionalString(button, 'description') ?? getOptionalString(button, 'remark'),
    menuId: getOptionalString(button, 'menuId') ?? menuId,
    status: getOptionalNumber(button, 'status'),
  };
}

function getMenuButtons(menu: MenuTreeResp): PermissionButtonResource[] {
  if (!('buttons' in menu) || !Array.isArray(menu.buttons)) return [];
  return menu.buttons.flatMap((button) => {
    const resource = mapButtonResource(button, menu.id);
    return resource ? [resource] : [];
  });
}

function mapMenuResource(menu: MenuTreeResp): PermissionMenuResource {
  return {
    id: menu.id,
    parentId: menu.parentId,
    type: 'MENU',
    name: menu.name,
    code: menu.code,
    path: menu.path,
    description: menu.remark,
    status: menu.status,
    buttons: getMenuButtons(menu),
    children: menu.children?.map(mapMenuResource),
  };
}

function flattenButtonMenus(menus: PermissionMenuResource[]): PermissionMenuResource[] {
  return menus.flatMap((menu) => [
    ...(menu.buttons.length > 0 ? [menu] : []),
    ...flattenButtonMenus(menu.children ?? []),
  ]);
}

function toButtonResourceGroups(menus: MenuTreeResp[]): PermissionResourceGroup[] {
  return [{
    key: 'menus',
    name: '菜单资源',
    menus: flattenButtonMenus(menus.map(mapMenuResource)),
  }];
}

function getNextPermissionEffect(effect: PermissionDraftEffect): PermissionDraftEffect {
  if (effect === 'none') return 'Allow';
  if (effect === 'Allow') return 'Deny';
  return 'none';
}

function toPermissionEffects(grants: PermissionGrantResp[]): Record<string, PermissionDraftEffect> {
  return Object.fromEntries(grants.map((grant) => [grant.resourceId, grant.effect]));
}

function getPermissionEffectMessageKey(effect: PermissionDraftEffect) {
  if (effect === 'Allow') return 'auth.buttonPermission.effects.allow' as const;
  if (effect === 'Deny') return 'auth.buttonPermission.effects.deny' as const;
  return 'auth.buttonPermission.effects.none' as const;
}

export function ButtonPermissionPage({ service: serviceProp }: ButtonPermissionPageProps) {
  const service = serviceProp ?? defaultPermissionService;
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const { token } = antdTheme.useToken();

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
  const [permissionEffects, setPermissionEffects] = useState<Record<string, PermissionDraftEffect>>({});
  const [loadedPermissions, setLoadedPermissions] = useState<PermissionGrantResp[]>([]);
  const [activeCollapseKeys, setActiveCollapseKeys] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.all([service.listSubjects(), service.listMenuTree()])
      .then(([subjects, menus]) => {
        if (!mounted) return;
        const groups = toButtonResourceGroups(menus);
        setOrgs(subjects.orgs);
        setRoles(subjects.roles);
        setUsers(subjects.users);
        setResources(groups);
        setSelectedSubject(subjects.orgs[0] ?? subjects.roles[0] ?? subjects.users[0]);
        setActiveCollapseKeys(groups.flatMap((group) => group.menus.map((menu) => menu.id)));
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
        setLoadedPermissions(page.data);
        setPermissionEffects(toPermissionEffects(page.data));
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
    setPermissionEffects((prev) => {
      const next = { ...prev };
      const nextEffect = getNextPermissionEffect(prev[buttonId] ?? 'none');
      if (nextEffect === 'none') {
        delete next[buttonId];
      } else {
        next[buttonId] = nextEffect;
      }
      return next;
    });
  }, []);

  const handleSetMenuButtons = useCallback((menu: PermissionMenuResource, effect: PermissionDraftEffect) => {
    setPermissionEffects((prev) => {
      const next = { ...prev };
      menu.buttons.forEach((button) => {
        if (effect === 'none') {
          delete next[button.id];
        } else {
          next[button.id] = effect;
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
          (menu.buttons ?? []).flatMap((button) => {
            const effect = permissionEffects[button.id] ?? 'none';
            if (effect === 'none') return [];
            return [{
              resourceType: 'BUTTON' as const,
              resourceId: button.id,
              effect,
              scope: 'ALL',
            } satisfies SaveSubjectPermissionItem];
          }),
        ),
      );

      const nextPermissions = await syncSubjectPermissions({
        service,
        subject: selectedSubject,
        existingPermissions: loadedPermissions,
        desiredPermissions: permissions,
      });
      setLoadedPermissions(nextPermissions);
      setPermissionEffects(toPermissionEffects(nextPermissions));
      notice.success(t('auth.buttonPermission.feedback.saveSuccess'));
    } catch (error) {
      notice.error(t('auth.buttonPermission.feedback.saveFailed'));
      console.error('Failed to save permissions:', error);
    } finally {
      setSaving(false);
    }
  }, [selectedSubject, service, resources, permissionEffects, loadedPermissions, notice, t]);

  const allButtons = useMemo(
    () => resources.flatMap((group) => group.menus.flatMap((menu) => menu.buttons)),
    [resources],
  );

  const handleBulkSet = useCallback((effect: PermissionDraftEffect) => {
    if (effect === 'none') {
      setPermissionEffects({});
      return;
    }
    setPermissionEffects(Object.fromEntries(allButtons.map((button) => [button.id, effect])));
  }, [allButtons]);

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
                  handleSetMenuButtons(menu, 'Allow');
                }}
              >
                {t('auth.buttonPermission.actions.allowAllMenu')}
              </Button>
              <Button
                size="small"
                type="link"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetMenuButtons(menu, 'Deny');
                }}
              >
                {t('auth.buttonPermission.actions.denyAllMenu')}
              </Button>
              <Button
                size="small"
                type="link"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetMenuButtons(menu, 'none');
                }}
              >
                {t('auth.buttonPermission.actions.clearAllMenu')}
              </Button>
            </Flex>
          </Flex>
        ),
        children: (
          <Flex vertical>
            {menu.buttons.map((button) => (
              <Flex
                key={button.id}
                align="center"
                justify="space-between"
                gap={12}
                style={{ paddingBlock: token.paddingXS, borderBottom: `1px solid ${token.colorBorderSecondary}` }}
              >
                <Flex align="center" gap={8}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={(permissionEffects[button.id] ?? 'none') === 'Allow' ? 'true' : (permissionEffects[button.id] ?? 'none') === 'Deny' ? 'mixed' : 'false'}
                    aria-label={`${button.name} ${t(getPermissionEffectMessageKey(permissionEffects[button.id] ?? 'none'))}`}
                    data-permission-effect={permissionEffects[button.id] ?? 'none'}
                    onClick={() => handleToggleButton(button.id)}
                    style={{
                      width: 16,
                      height: 16,
                      padding: 0,
                      borderRadius: token.borderRadiusSM,
                      border: `1px solid ${(permissionEffects[button.id] ?? 'none') === 'Allow'
                        ? token.colorPrimary
                        : (permissionEffects[button.id] ?? 'none') === 'Deny'
                          ? token.colorError
                          : token.colorBorder}`,
                      background: (permissionEffects[button.id] ?? 'none') === 'Allow'
                        ? token.colorPrimary
                        : (permissionEffects[button.id] ?? 'none') === 'Deny'
                          ? token.colorError
                          : token.colorBgContainer,
                      color: token.colorTextLightSolid,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      lineHeight: 1,
                    }}
                  >
                    {(permissionEffects[button.id] ?? 'none') === 'Allow' ? '✓' : (permissionEffects[button.id] ?? 'none') === 'Deny' ? '×' : ''}
                  </button>
                  <Flex vertical gap={0}>
                    <Typography.Text>{button.name}</Typography.Text>
                    <Typography.Text type="secondary">{button.code}</Typography.Text>
                  </Flex>
                </Flex>
                <Tag color={(permissionEffects[button.id] ?? 'none') === 'Allow' ? 'green' : (permissionEffects[button.id] ?? 'none') === 'Deny' ? 'red' : 'default'}>
                  {t(getPermissionEffectMessageKey(permissionEffects[button.id] ?? 'none'))}
                </Tag>
              </Flex>
            ))}
          </Flex>
        ),
      })),
    );
  }, [filteredGroups, handleSetMenuButtons, handleToggleButton, permissionEffects, t, token]);

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
          title={t('auth.buttonPermission.title')}
          extra={
            <Button type="primary" loading={saving} onClick={handleSave}>
              {t('auth.buttonPermission.actions.save')}
            </Button>
          }
          styles={{ body: { padding: 14, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' } }}
        >
          <Flex wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
            <Input.Search
              placeholder={t('auth.buttonPermission.searchPlaceholder')}
              value={resourceKeyword}
              onChange={(e) => setResourceKeyword(e.target.value)}
              style={{ width: 280 }}
            />
            <Button disabled={saving} onClick={() => handleBulkSet('Allow')}>
              {t('auth.buttonPermission.actions.allowAll')}
            </Button>
            <Button disabled={saving} onClick={() => handleBulkSet('Deny')}>
              {t('auth.buttonPermission.actions.denyAll')}
            </Button>
            <Button disabled={saving} onClick={() => handleBulkSet('none')}>
              {t('auth.buttonPermission.actions.clearAll')}
            </Button>
          </Flex>
          {collapseItems.length === 0 ? (
            <Empty description={t('auth.buttonPermission.emptyText')} />
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
