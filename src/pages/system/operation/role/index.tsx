import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Popconfirm, Tag } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import { roleService as defaultRoleService, type RoleService } from '@/api/role';
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

function buildRolePageReq(params: RoleSearchValues & NebulaPageReq): RolePageReq {
  const req: RolePageReq = {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };
  const name = normalizeOptionalText(params.name);
  const code = normalizeOptionalText(params.code);

  if (params.orderName) req.orderName = params.orderName;
  if (params.orderType) req.orderType = params.orderType;
  if (name) req.name = name;
  if (code) req.code = code;
  if (params.status !== undefined) req.status = Number(params.status) as RoleStatus;

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
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<RoleFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<RoleFormMode>('create');
  const [editingRoleId, setEditingRoleId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const requestRoles = useCallback(
    (params: RoleSearchValues & NebulaPageReq) => roleService.pageRoles(buildRolePageReq(params)),
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
  const statusValueEnum = useMemo(
    () => Object.fromEntries(roleStatusOptions.map((option) => [option.value, { text: option.label }])),
    [roleStatusOptions],
  );
  const columns = useMemo<NebulaProColumns<RoleResp>[]>(() => [
    {
      title: t('auth.roleManagement.columns.name'),
      dataIndex: 'name',
      fixed: 'left',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.roleManagement.columns.code'),
      dataIndex: 'code',
      width: 180,
      sorter: true,
    },
    {
      title: t('auth.roleManagement.columns.status'),
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: statusValueEnum,
      fieldProps: { 'aria-label': t('auth.roleManagement.fields.status') },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? t('auth.roleManagement.status.enabled') : t('auth.roleManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.roleManagement.columns.createTime'),
      dataIndex: 'createTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.createTime),
    },
    {
      title: t('auth.roleManagement.columns.updateTime'),
      dataIndex: 'updateTime',
      width: 180,
      search: false,
      sorter: true,
      render: (_, record) => formatDateTime(record.updateTime),
    },
    {
      title: t('auth.roleManagement.columns.actions'),
      key: 'actions',
      fixed: 'right',
      width: 160,
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => void openUpdateModal(record)}>
          {t('auth.roleManagement.actions.edit')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t('auth.roleManagement.confirm.deleteTitle')}
          okText={t('auth.roleManagement.actions.delete')}
          cancelText={t('auth.roleManagement.actions.cancel')}
          onConfirm={() => void removeRole(record)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            {t('auth.roleManagement.actions.delete')}
          </Button>
        </Popconfirm>,
      ],
    },
  ], [openUpdateModal, removeRole, statusValueEnum, t]);

  return (
    <>
      <NebulaProTable<RoleResp, RoleSearchValues>
        actionRef={actionRef}
        columns={columns}
        pagination={{ defaultPageSize }}
        request={requestRoles}
        onRequestError={() => notice.error(t('auth.roleManagement.feedback.listLoadFailed'))}
        size="middle"
        scroll={{ x: 960 }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>{t('auth.roleManagement.actions.create')}</Button>,
        ]}
      />

      <RoleFormModal
        form={form}
        mode={formMode}
        open={modalOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        onSubmit={() => void submitRole()}
        onCancel={closeModal}
      />
    </>
  );
}
