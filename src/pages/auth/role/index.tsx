import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { NeTable } from '@/components/ne-table';
import type { NeTableAction, NeTableRequestParams } from '@/components/ne-table/types';
import { PageContainer } from '@/components/page-container';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { roleService as defaultRoleService, type RoleService } from '@/services/role';
import type { CreateRoleReq, RoleDetailResp, RolePageReq, RoleResp, RoleStatus, UpdateRoleReq } from '@/types/role';
import { RoleFormModal } from './role-form-modal';
import type { RoleFormMode, RoleFormValues } from './role-form-modal';

export interface RoleManagementPageProps {
  roleService?: RoleService;
  defaultPageSize?: number;
}

interface RoleSearchValues {
  name?: string;
  code?: string;
  status?: RoleStatus;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function buildRolePageReq(params: NeTableRequestParams<RoleSearchValues>): RolePageReq {
  const req: RolePageReq = {
    pageNum: params.current,
    pageSize: params.pageSize,
  };
  const name = normalizeOptionalText(params.query.name);
  const code = normalizeOptionalText(params.query.code);

  if (name) req.name = name;
  if (code) req.code = code;
  if (params.query.status !== undefined) req.status = params.query.status;

  return req;
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  return value.replace('T', ' ');
}

function getPermissionIds(role: RoleDetailResp) {
  return role.permissions.map((permission) => permission.id);
}

export function RoleManagementPage({ roleService = defaultRoleService, defaultPageSize = 10 }: RoleManagementPageProps) {
  const actionRef = useRef<NeTableAction>(null);
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<RoleFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<RoleFormMode>('create');
  const [editingRoleId, setEditingRoleId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const requestRoles = useCallback(
    async (params: NeTableRequestParams<RoleSearchValues>) => {
      const page = await roleService.pageRoles(buildRolePageReq(params));
      return { data: page.data, total: page.total };
    },
    [roleService],
  );

  const openCreateModal = useCallback(() => {
    setFormMode('create');
    setEditingRoleId(undefined);
    form.resetFields();
    form.setFieldsValue({ status: 1, permissionIds: [] });
    setModalOpen(true);
  }, [form]);

  const openUpdateModal = useCallback(
    async (record: RoleResp) => {
      setFormMode('update');
      setEditingRoleId(record.id);
      form.resetFields();
      setModalOpen(true);
      setDetailLoading(true);
      try {
        const detail = await roleService.getRoleById(record.id);
        form.setFieldsValue({
          name: detail.name,
          code: detail.code,
          description: detail.description,
          status: detail.status,
          permissionIds: getPermissionIds(detail),
        });
      } catch {
        notice.error(t('auth.roleManagement.feedback.detailLoadFailed'));
        setModalOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [form, notice, roleService, t],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingRoleId(undefined);
    form.resetFields();
  }, [form]);

  const submitRole = useCallback(async () => {
    const values = await form.validateFields();
    const payload: CreateRoleReq = {
      name: values.name.trim(),
      code: values.code.trim(),
      description: normalizeOptionalText(values.description),
      status: values.status,
      permissionIds: values.permissionIds ?? [],
    };

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        await roleService.createRole(payload);
        notice.success(t('auth.roleManagement.feedback.createSuccess'));
      } else if (editingRoleId) {
        const updatePayload: UpdateRoleReq = { id: editingRoleId, ...payload };
        await roleService.updateRole(editingRoleId, updatePayload);
        notice.success(t('auth.roleManagement.feedback.updateSuccess'));
      }
      closeModal();
      await actionRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeModal, editingRoleId, form, formMode, notice, roleService, t]);

  const removeRole = useCallback(
    async (record: RoleResp) => {
      await roleService.removeRole(record.id);
      notice.success(t('auth.roleManagement.feedback.deleteSuccess'));
      await actionRef.current?.reload();
    },
    [notice, roleService, t],
  );

  const roleStatusOptions = useMemo<Array<{ label: string; value: RoleStatus }>>(
    () => [
      { label: t('auth.roleManagement.status.enabled'), value: 1 },
      { label: t('auth.roleManagement.status.disabled'), value: 0 },
    ],
    [t],
  );
  const statusFilters = useMemo(() => roleStatusOptions.map((option) => ({ text: option.label, value: option.value })), [roleStatusOptions]);

  return (
    <PageContainer>
      <NeTable<RoleResp, RoleSearchValues>
        actionRef={actionRef}
        defaultPageSize={defaultPageSize}
        rowKey="id"
        request={requestRoles}
        onRequestError={() => notice.error(t('auth.roleManagement.feedback.listLoadFailed'))}
        size="middle"
        scroll={{ x: 960 }}
      >
        <NeTable.Search<RoleSearchValues>>
          {({ form: searchForm, submit, reset }) => (
            <Form form={searchForm} layout="inline" onFinish={submit}>
              <Form.Item name="name" label={t('auth.roleManagement.fields.name')}>
                <Input allowClear placeholder={t('auth.roleManagement.placeholders.name')} />
              </Form.Item>
              <Form.Item name="code" label={t('auth.roleManagement.fields.code')}>
                <Input allowClear placeholder={t('auth.roleManagement.placeholders.code')} />
              </Form.Item>
              <Form.Item name="status" label={t('auth.roleManagement.fields.status')}>
                <Select allowClear placeholder={t('auth.roleManagement.placeholders.status')} options={roleStatusOptions} style={{ width: 120 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">{t('auth.roleManagement.actions.search')}</Button>
                  <Button onClick={() => void reset()}>{t('auth.roleManagement.actions.reset')}</Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </NeTable.Search>

        <NeTable.Toolbar>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>{t('auth.roleManagement.actions.create')}</Button>
        </NeTable.Toolbar>

        <Table.Column<RoleResp> title={t('auth.roleManagement.columns.name')} dataIndex="name" key="name" fixed="left" width={180} />
        <Table.Column<RoleResp> title={t('auth.roleManagement.columns.code')} dataIndex="code" key="code" width={180} />
        <Table.Column<RoleResp>
          title={t('auth.roleManagement.columns.status')}
          dataIndex="status"
          key="status"
          width={100}
          filters={statusFilters}
          render={(status: RoleStatus) => (
            <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? t('auth.roleManagement.status.enabled') : t('auth.roleManagement.status.disabled')}</Tag>
          )}
        />
        <Table.Column<RoleResp> title={t('auth.roleManagement.columns.createTime')} dataIndex="createTime" key="createTime" width={180} render={formatDateTime} />
        <Table.Column<RoleResp> title={t('auth.roleManagement.columns.updateTime')} dataIndex="updateTime" key="updateTime" width={180} render={formatDateTime} />
        <Table.Column<RoleResp>
          title={t('auth.roleManagement.columns.actions')}
          key="actions"
          fixed="right"
          width={160}
          render={(_, record) => (
            <Space size="small">
              <Button type="link" icon={<EditOutlined />} onClick={() => void openUpdateModal(record)}>{t('auth.roleManagement.actions.edit')}</Button>
              <Popconfirm title={t('auth.roleManagement.confirm.deleteTitle')} okText={t('auth.roleManagement.actions.delete')} cancelText={t('auth.roleManagement.actions.cancel')} onConfirm={() => void removeRole(record)}>
                <Button type="link" danger icon={<DeleteOutlined />}>{t('auth.roleManagement.actions.delete')}</Button>
              </Popconfirm>
            </Space>
          )}
        />
      </NeTable>

      <RoleFormModal
        form={form}
        mode={formMode}
        open={modalOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        onSubmit={() => void submitRole()}
        onCancel={closeModal}
      />
    </PageContainer>
  );
}
