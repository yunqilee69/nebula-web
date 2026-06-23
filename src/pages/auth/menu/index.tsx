import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { Key } from 'react';
import { NeTable } from '@/components/ne-table';
import type { NeTableAction, NeTableRequestParams } from '@/components/ne-table/types';
import { PageContainer } from '@/components/page-container';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { MenuComponentRegistry } from '@/routing/types';
import { menuService as defaultMenuService } from '@/services/menu';
import type { MenuService } from '@/services/menu';
import type {
  CreateMenuReq,
  MenuDetailResp,
  MenuStatus,
  MenuTreeResp,
  UpdateMenuReq,
} from '@/types/menu';
import { ButtonManagementModal } from './button-management-modal';
import { MenuFormModal } from './menu-form-modal';
import type { MenuComponentOption, MenuFormMode, MenuFormValues, MenuParentOption } from './menu-form-modal';

export interface MenuManagementPageProps {
  menuService?: MenuService;
  componentRegistry?: MenuComponentRegistry;
  componentOptions?: MenuComponentOption[];
}

interface MenuSearchValues {
  name?: string;
  code?: string;
  status?: MenuStatus;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  return value.replace('T', ' ');
}

function filterMenuTree(
  nodes: MenuTreeResp[],
  name?: string,
  code?: string,
  status?: MenuStatus,
): MenuTreeResp[] {
  const trimmedName = normalizeOptionalText(name);
  const trimmedCode = normalizeOptionalText(code);

  function matches(node: MenuTreeResp): boolean {
    if (trimmedName && !node.name.toLowerCase().includes(trimmedName.toLowerCase())) return false;
    if (trimmedCode && !node.code.toLowerCase().includes(trimmedCode.toLowerCase())) return false;
    if (status !== undefined && node.status !== status) return false;
    return true;
  }

  function filterNodes(items: MenuTreeResp[]): MenuTreeResp[] {
    const result: MenuTreeResp[] = [];
    for (const item of items) {
      const filteredChildren = item.children ? filterNodes(item.children) : undefined;
      if (matches(item)) {
        result.push({ ...item, children: filteredChildren });
      } else if (filteredChildren && filteredChildren.length > 0) {
        result.push({ ...item, children: filteredChildren });
      }
    }
    return result;
  }

  return filterNodes(nodes);
}

function collectParentRowKeys(nodes: MenuTreeResp[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      keys.push(node.id);
      keys.push(...collectParentRowKeys(node.children));
    }
  }
  return keys;
}

function createMenuComponentOptions(registry: MenuComponentRegistry | undefined): MenuComponentOption[] {
  if (!registry) return [];
  return Object.values(registry).map((item) => ({
    label: item.defaultName ?? item.component,
    value: item.component,
    defaultName: item.defaultName,
    defaultPath: item.defaultPath,
    defaultCode: item.defaultCode,
    defaultIcon: item.defaultIcon,
  }));
}

function createMenuParentOptions(
  nodes: MenuTreeResp[],
  rootLabel: string,
  disabledIds: Set<string>,
): MenuParentOption[] {
  function convert(items: MenuTreeResp[]): MenuParentOption[] {
    return items.map((item) => ({
      label: item.name,
      value: item.id,
      disabled: disabledIds.has(item.id),
      children: item.children && item.children.length > 0 ? convert(item.children) : undefined,
    }));
  }

  return [{ label: rootLabel, value: '0', children: convert(nodes) }];
}

function collectMenuSubtreeIds(nodes: MenuTreeResp[], menuId: string | undefined): Set<string> {
  if (!menuId) return new Set<string>();

  function collectIds(node: MenuTreeResp): string[] {
    return [node.id, ...(node.children ?? []).flatMap(collectIds)];
  }

  function findSubtreeIds(items: MenuTreeResp[]): string[] | undefined {
    for (const item of items) {
      if (item.id === menuId) return collectIds(item);
      const childIds = item.children ? findSubtreeIds(item.children) : undefined;
      if (childIds) return childIds;
    }
    return undefined;
  }

  return new Set(findSubtreeIds(nodes) ?? []);
}

function findMenuParentPath(nodes: MenuTreeResp[], parentId: string | undefined): string[] {
  if (!parentId || parentId === '0') return ['0'];

  function findPath(items: MenuTreeResp[], ancestors: string[]): string[] | undefined {
    for (const item of items) {
      const path = [...ancestors, item.id];
      if (item.id === parentId) return path;
      const childPath = item.children ? findPath(item.children, path) : undefined;
      if (childPath) return childPath;
    }
    return undefined;
  }

  return findPath(nodes, ['0']) ?? ['0'];
}

function getParentIdFromPath(parentPath: string[] | undefined): string {
  return parentPath && parentPath.length > 0 ? parentPath[parentPath.length - 1] : '0';
}

function isMenuType(type: string | undefined): boolean {
  return type === 'MENU' || type === 'menu';
}

function isExternalMenuType(type: string | undefined): boolean {
  return type === 'EXTERNAL';
}

function normalizeMenuType(type: string | undefined): string | undefined {
  return type?.toUpperCase();
}

export function MenuManagementPage({
  menuService: menuServiceProp,
  componentRegistry,
  componentOptions: componentOptionsProp,
}: MenuManagementPageProps) {
  const menuService = menuServiceProp ?? defaultMenuService;
  const actionRef = useRef<NeTableAction>(null);
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<MenuFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<MenuFormMode>('create');
  const [editingMenuId, setEditingMenuId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [menuTree, setMenuTree] = useState<MenuTreeResp[]>([]);

  const [buttonModalOpen, setButtonModalOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuTreeResp>();

  const [expandedKeys, setExpandedKeys] = useState<readonly Key[]>([]);

  const componentOptions = useMemo(
    () => componentOptionsProp ?? createMenuComponentOptions(componentRegistry),
    [componentOptionsProp, componentRegistry],
  );

  const disabledParentIds = useMemo(
    () => collectMenuSubtreeIds(menuTree, editingMenuId),
    [menuTree, editingMenuId],
  );

  const parentOptions = useMemo(
    () => createMenuParentOptions(menuTree, t('auth.menuManagement.fields.rootMenu'), disabledParentIds),
    [disabledParentIds, menuTree, t],
  );

  const requestMenuTree = useCallback(
    async (params: NeTableRequestParams<MenuSearchValues>) => {
      const tree = await menuService.getMenuTree();
      setMenuTree(tree);
      const filtered = filterMenuTree(tree, params.query.name, params.query.code, params.query.status);
      setExpandedKeys(collectParentRowKeys(filtered));
      return { data: filtered, total: undefined };
    },
    [menuService],
  );

  const handleRequestError = useCallback(() => {
    notice.error(t('auth.menuManagement.feedback.listLoadFailed'));
  }, [notice, t]);

  const handleExpandedRowsChange = useCallback((keys: readonly Key[]) => {
    setExpandedKeys(keys);
  }, []);

  const expandable = useMemo(
    () => ({
      expandedRowKeys: expandedKeys,
      onExpandedRowsChange: handleExpandedRowsChange,
    }),
    [expandedKeys, handleExpandedRowsChange],
  );

  const openCreateModal = useCallback(() => {
    setFormMode('create');
    setEditingMenuId(undefined);
    form.resetFields();
    form.setFieldsValue({
      parentPath: ['0'],
      type: 'MENU',
      sort: 0,
      status: 1,
      hidden: false,
      visibleInBreadcrumb: true,
      visibleInTab: true,
    });
    setModalOpen(true);
  }, [form]);

  const openUpdateModal = useCallback(
    async (record: MenuTreeResp) => {
      setFormMode('update');
      setEditingMenuId(record.id);
      form.resetFields();
      setModalOpen(true);
      setDetailLoading(true);
      try {
        const detail: MenuDetailResp = await menuService.getMenuById(record.id);
        form.setFieldsValue({
          parentPath: findMenuParentPath(menuTree, detail.parentId),
          name: detail.name,
          code: detail.code,
          type: detail.type,
          path: detail.path,
          icon: detail.icon,
          component: detail.component,
          sort: detail.sort ?? 0,
          status: detail.status,
          hidden: detail.hidden ?? false,
          externalUrl: detail.externalUrl,
          visibleInBreadcrumb: detail.visibleInBreadcrumb ?? true,
          visibleInTab: detail.visibleInTab ?? true,
          activeMenuPath: detail.activeMenuPath,
          remark: detail.remark,
        });
      } catch {
        notice.error(t('auth.menuManagement.feedback.detailLoadFailed'));
        setModalOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [form, menuService, menuTree, notice, t],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingMenuId(undefined);
    form.resetFields();
  }, [form]);

  const submitMenu = useCallback(async () => {
    let values: MenuFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const externalFlag = isExternalMenuType(values.type);
    const payload: CreateMenuReq = {
      parentId: getParentIdFromPath(values.parentPath),
      name: values.name.trim(),
      code: values.code.trim(),
      type: values.type,
      path: normalizeOptionalText(values.path),
      icon: normalizeOptionalText(values.icon),
      component: normalizeOptionalText(values.component),
      sort: values.sort,
      status: values.status,
      hidden: values.hidden,
      externalFlag,
      externalUrl: externalFlag ? normalizeOptionalText(values.externalUrl) : undefined,
      visibleInBreadcrumb: values.visibleInBreadcrumb,
      visibleInTab: values.visibleInTab,
      activeMenuPath: normalizeOptionalText(values.activeMenuPath),
      remark: normalizeOptionalText(values.remark),
    };

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        await menuService.createMenu(payload);
        notice.success(t('auth.menuManagement.feedback.createSuccess'));
      } else if (editingMenuId) {
        const updatePayload: UpdateMenuReq = { id: editingMenuId, ...payload };
        await menuService.updateMenu(editingMenuId, updatePayload);
        notice.success(t('auth.menuManagement.feedback.updateSuccess'));
      }
      closeModal();
      await actionRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editingMenuId, form, formMode, menuService, notice, t]);

  const removeMenu = useCallback(
    async (record: MenuTreeResp) => {
      await menuService.removeMenu(record.id);
      notice.success(t('auth.menuManagement.feedback.deleteSuccess'));
      await actionRef.current?.reload();
    },
    [notice, menuService, t],
  );

  const openButtonModal = useCallback((record: MenuTreeResp) => {
    setSelectedMenu(record);
    setButtonModalOpen(true);
  }, []);

  const closeButtonModal = useCallback(() => {
    setButtonModalOpen(false);
    setSelectedMenu(undefined);
  }, []);

  const menuStatusOptions = useMemo<Array<{ label: string; value: MenuStatus }>>(
    () => [
      { label: t('auth.menuManagement.status.enabled'), value: 1 },
      { label: t('auth.menuManagement.status.disabled'), value: 0 },
    ],
    [t],
  );

  const formatMenuType = useCallback(
    (type: string | undefined) => {
      switch (normalizeMenuType(type)) {
        case 'CATALOG':
          return t('auth.menuManagement.types.catalog');
        case 'MENU':
          return t('auth.menuManagement.types.menu');
        case 'IFRAME':
          return t('auth.menuManagement.types.iframe');
        case 'EXTERNAL':
          return t('auth.menuManagement.types.external');
        default:
          return type || '-';
      }
    },
    [t],
  );

  return (
    <PageContainer>
      <NeTable<MenuTreeResp, MenuSearchValues>
        actionRef={actionRef}
        rowKey="id"
        pagination={false}
        expandable={expandable}
        request={requestMenuTree}
        onRequestError={handleRequestError}
        size="middle"
        scroll={{ x: 1200 }}
      >
        <NeTable.Search<MenuSearchValues>>
          {({ form: searchForm, submit, reset }) => (
            <Form form={searchForm} layout="inline" onFinish={submit}>
              <Form.Item name="name" label={t('auth.menuManagement.fields.name')}>
                <Input allowClear placeholder={t('auth.menuManagement.placeholders.name')} />
              </Form.Item>
              <Form.Item name="code" label={t('auth.menuManagement.fields.code')}>
                <Input allowClear placeholder={t('auth.menuManagement.placeholders.code')} />
              </Form.Item>
              <Form.Item name="status" label={t('auth.menuManagement.fields.status')}>
                <Select allowClear placeholder={t('auth.menuManagement.placeholders.status')} options={menuStatusOptions} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">{t('auth.menuManagement.actions.search')}</Button>
                  <Button onClick={() => void reset()}>{t('auth.menuManagement.actions.reset')}</Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </NeTable.Search>

        <NeTable.Toolbar>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>{t('auth.menuManagement.actions.create')}</Button>
        </NeTable.Toolbar>

        <Table.Column<MenuTreeResp> title={t('auth.menuManagement.columns.name')} dataIndex="name" key="name" fixed="left" width={180} />
        <Table.Column<MenuTreeResp> title={t('auth.menuManagement.columns.code')} dataIndex="code" key="code" width={180} />
        <Table.Column<MenuTreeResp> title={t('auth.menuManagement.columns.type')} dataIndex="type" key="type" width={100} render={formatMenuType} />
        <Table.Column<MenuTreeResp> title={t('auth.menuManagement.columns.path')} dataIndex="path" key="path" width={180} />
        <Table.Column<MenuTreeResp> title={t('auth.menuManagement.columns.sort')} dataIndex="sort" key="sort" width={80} />
        <Table.Column<MenuTreeResp>
          title={t('auth.menuManagement.columns.status')}
          dataIndex="status"
          key="status"
          width={100}
          render={(status: MenuStatus) => (
            <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? t('auth.menuManagement.status.enabled') : t('auth.menuManagement.status.disabled')}</Tag>
          )}
        />
        <Table.Column<MenuTreeResp> title={t('auth.menuManagement.columns.createTime')} dataIndex="createTime" key="createTime" width={180} render={formatDateTime} />
        <Table.Column<MenuTreeResp> title={t('auth.menuManagement.columns.updateTime')} dataIndex="updateTime" key="updateTime" width={180} render={formatDateTime} />
        <Table.Column<MenuTreeResp>
          title={t('auth.menuManagement.columns.actions')}
          key="actions"
          fixed="right"
          width={220}
          render={(_, record) => (
            <Space size="small">
              <Button type="link" icon={<EditOutlined />} onClick={() => void openUpdateModal(record)}>{t('auth.menuManagement.actions.edit')}</Button>
              <Popconfirm title={t('auth.menuManagement.confirm.deleteTitle')} okText={t('auth.menuManagement.actions.delete')} cancelText={t('auth.menuManagement.actions.cancel')} onConfirm={() => void removeMenu(record)}>
                <Button type="link" danger icon={<DeleteOutlined />}>{t('auth.menuManagement.actions.delete')}</Button>
              </Popconfirm>
              {isMenuType(record.type) && (
                <Button type="link" onClick={() => openButtonModal(record)}>{t('auth.menuManagement.actions.manageButtons')}</Button>
              )}
            </Space>
          )}
        />
      </NeTable>

      <MenuFormModal
        form={form}
        mode={formMode}
        open={modalOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        parentOptions={parentOptions}
        componentOptions={componentOptions}
        onSubmit={() => void submitMenu()}
        onCancel={closeModal}
      />

      <ButtonManagementModal
        open={buttonModalOpen}
        menu={selectedMenu}
        menuService={menuService}
        onCancel={closeButtonModal}
      />
    </PageContainer>
  );
}
