import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { FormInstance } from 'antd';
import { useCallback, useMemo, useRef, useState } from 'react';
import { NeTable } from '@/components/ne-table';
import type { NeTableAction, NeTableRequestParams } from '@/components/ne-table/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useNotice } from '@/hooks/use-notice';
import type { MenuService } from '@/services/menu';
import type {
  ButtonDetailResp,
  ButtonResp,
  ButtonStatus,
  ButtonType,
  CreateButtonReq,
  MenuTreeResp,
  UpdateButtonReq,
} from '@/types/menu';

export interface ButtonManagementModalProps {
  open: boolean;
  menu?: MenuTreeResp;
  menuService: MenuService;
  onCancel: () => void;
}

interface ButtonSearchValues {
  buttonName?: string;
  buttonCode?: string;
  status?: ButtonStatus;
}

interface ButtonFormValues {
  code: string;
  name: string;
  type?: ButtonType;
  sort?: number;
  status?: ButtonStatus;
}

type ButtonFormMode = 'create' | 'update';

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function formatDateTime(value: string | undefined) {
  if (!value) return '-';
  return value.replace('T', ' ');
}

interface ButtonFormModalProps {
  form: FormInstance<ButtonFormValues>;
  mode: ButtonFormMode;
  open: boolean;
  submitting: boolean;
  detailLoading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function ButtonFormModal({
  form,
  mode,
  open,
  submitting,
  detailLoading,
  onSubmit,
  onCancel,
}: ButtonFormModalProps) {
  const { t } = useNebulaI18n();

  const modalTitle =
    mode === 'create'
      ? t('auth.menuManagement.modal.createButtonTitle')
      : t('auth.menuManagement.modal.editButtonTitle');

  const statusOptions: Array<{ label: string; value: ButtonStatus }> = [
    { label: t('auth.menuManagement.status.enabled'), value: 1 },
    { label: t('auth.menuManagement.status.disabled'), value: 0 },
  ];

  const buttonTypeOptions: Array<{ label: string; value: ButtonType }> = useMemo(
    () => [
      { label: t('auth.menuManagement.buttonTypes.add'), value: 'add' },
      { label: t('auth.menuManagement.buttonTypes.edit'), value: 'edit' },
      { label: t('auth.menuManagement.buttonTypes.delete'), value: 'delete' },
      { label: t('auth.menuManagement.buttonTypes.export'), value: 'export' },
    ],
    [t],
  );

  return (
    <Modal
      title={modalTitle}
      open={open}
      confirmLoading={submitting}
      okText={t('auth.menuManagement.actions.save')}
      cancelText={t('auth.menuManagement.actions.cancel')}
      onOk={onSubmit}
      onCancel={onCancel}
    >
      <Form
        form={form}
        layout="vertical"
        disabled={detailLoading}
        initialValues={{ status: 1, sort: 0 }}
      >
        <Form.Item
          name="code"
          label={t('auth.menuManagement.fields.buttonCode')}
          rules={[
            { required: true, message: t('auth.menuManagement.validation.buttonCodeRequired') },
          ]}
        >
          <Input placeholder={t('auth.menuManagement.placeholders.buttonCode')} />
        </Form.Item>
        <Form.Item
          name="name"
          label={t('auth.menuManagement.fields.buttonName')}
          rules={[
            { required: true, message: t('auth.menuManagement.validation.buttonNameRequired') },
          ]}
        >
          <Input placeholder={t('auth.menuManagement.placeholders.buttonName')} />
        </Form.Item>
        <Form.Item name="type" label={t('auth.menuManagement.fields.buttonType')}>
          <Select
            allowClear
            options={buttonTypeOptions}
            placeholder={t('auth.menuManagement.placeholders.buttonType')}
          />
        </Form.Item>
        <Form.Item name="sort" label={t('auth.menuManagement.fields.sort')}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="status" label={t('auth.menuManagement.fields.status')}>
          <Select options={statusOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function ButtonManagementModal({
  open,
  menu,
  menuService,
  onCancel,
}: ButtonManagementModalProps) {
  const actionRef = useRef<NeTableAction>(null);
  const { t } = useNebulaI18n();
  const notice = useNotice();
  const [form] = Form.useForm<ButtonFormValues>();
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<ButtonFormMode>('create');
  const [editingButtonId, setEditingButtonId] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const requestButtons = useCallback(
    async (params: NeTableRequestParams<ButtonSearchValues>) => {
      if (!menu) return { data: [], total: 0 };

      const buttonName = normalizeOptionalText(params.query.buttonName);
      const buttonCode = normalizeOptionalText(params.query.buttonCode);

      const page = await menuService.pageButtons({
        pageNum: params.current,
        pageSize: params.pageSize,
        menuId: menu.id,
        ...(buttonName ? { name: buttonName } : {}),
        ...(buttonCode ? { code: buttonCode } : {}),
        ...(params.query.status !== undefined ? { status: params.query.status } : {}),
      });

      return { data: page.data, total: page.total };
    },
    [menu, menuService],
  );

  const openCreateForm = useCallback(() => {
    setFormMode('create');
    setEditingButtonId(undefined);
    form.resetFields();
    form.setFieldsValue({ status: 1, sort: 0 });
    setFormModalOpen(true);
  }, [form]);

  const openEditForm = useCallback(
    async (record: ButtonResp) => {
      setFormMode('update');
      setEditingButtonId(record.id);
      form.resetFields();
      setFormModalOpen(true);
      setDetailLoading(true);
      try {
        const detail: ButtonDetailResp = await menuService.getButtonById(record.id);
        form.setFieldsValue({
          code: detail.code,
          name: detail.name,
          type: detail.type,
          sort: detail.sort,
          status: detail.status,
        });
      } catch {
        notice.error(t('auth.menuManagement.feedback.buttonDetailLoadFailed'));
        setFormModalOpen(false);
      } finally {
        setDetailLoading(false);
      }
    },
    [form, menuService, notice, t],
  );

  const closeFormModal = useCallback(() => {
    setFormModalOpen(false);
    setEditingButtonId(undefined);
    form.resetFields();
  }, [form]);

  const submitButton = useCallback(async () => {
    if (!menu) return;

    const values = await form.validateFields();

    setSubmitting(true);
    try {
      if (formMode === 'create') {
        const payload: CreateButtonReq = {
          menuId: menu.id,
          code: values.code.trim(),
          name: values.name.trim(),
          type: values.type,
          sort: values.sort,
          status: values.status,
        };
        await menuService.createButton(payload);
        notice.success(t('auth.menuManagement.feedback.buttonCreateSuccess'));
      } else if (editingButtonId) {
        const payload: UpdateButtonReq = {
          id: editingButtonId,
          code: values.code.trim(),
          name: values.name.trim(),
          type: values.type,
          sort: values.sort,
          status: values.status,
        };
        await menuService.updateButton(editingButtonId, payload);
        notice.success(t('auth.menuManagement.feedback.buttonUpdateSuccess'));
      }
      closeFormModal();
      await actionRef.current?.reload();
    } finally {
      setSubmitting(false);
    }
  }, [closeFormModal, editingButtonId, form, formMode, menu, menuService, notice, t]);

  const removeButton = useCallback(
    async (record: ButtonResp) => {
      await menuService.removeButton(record.id);
      notice.success(t('auth.menuManagement.feedback.buttonDeleteSuccess'));
      await actionRef.current?.reload();
    },
    [menuService, notice, t],
  );

  const statusOptions = useMemo<Array<{ label: string; value: ButtonStatus }>>(
    () => [
      { label: t('auth.menuManagement.status.enabled'), value: 1 },
      { label: t('auth.menuManagement.status.disabled'), value: 0 },
    ],
    [t],
  );

  if (!menu) return null;

  return (
    <Modal
      title={`${t('auth.menuManagement.modal.buttonTitle')} - ${menu.name}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <NeTable<ButtonResp, ButtonSearchValues>
        actionRef={actionRef}
        rowKey="id"
        request={requestButtons}
        onRequestError={() =>
          notice.error(t('auth.menuManagement.feedback.buttonListLoadFailed'))
        }
        size="middle"
        scroll={{ x: 640 }}
      >
        <NeTable.Search<ButtonSearchValues>>
          {({ form: searchForm, submit, reset }) => (
            <Form form={searchForm} layout="inline" onFinish={submit}>
              <Form.Item
                name="buttonName"
                label={t('auth.menuManagement.fields.buttonName')}
              >
                <Input
                  allowClear
                  placeholder={t('auth.menuManagement.placeholders.buttonName')}
                />
              </Form.Item>
              <Form.Item
                name="buttonCode"
                label={t('auth.menuManagement.fields.buttonCode')}
              >
                <Input
                  allowClear
                  placeholder={t('auth.menuManagement.placeholders.buttonCode')}
                />
              </Form.Item>
              <Form.Item name="status" label={t('auth.menuManagement.fields.status')}>
                <Select
                  allowClear
                  placeholder={t('auth.menuManagement.placeholders.status')}
                  options={statusOptions}
                  style={{ width: 120 }}
                />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    {t('auth.menuManagement.actions.search')}
                  </Button>
                  <Button onClick={() => void reset()}>
                    {t('auth.menuManagement.actions.reset')}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          )}
        </NeTable.Search>

        <NeTable.Toolbar>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>
            {t('auth.menuManagement.actions.createButton')}
          </Button>
        </NeTable.Toolbar>

        <Table.Column<ButtonResp>
          title={t('auth.menuManagement.fields.buttonName')}
          dataIndex="name"
          key="name"
          width={180}
        />
        <Table.Column<ButtonResp>
          title={t('auth.menuManagement.fields.buttonCode')}
          dataIndex="code"
          key="code"
          width={180}
        />
        <Table.Column<ButtonResp>
          title={t('auth.menuManagement.columns.status')}
          dataIndex="status"
          key="status"
          width={100}
          render={(status: ButtonStatus) => (
            <Tag color={status === 1 ? 'success' : 'default'}>
              {status === 1
                ? t('auth.menuManagement.status.enabled')
                : t('auth.menuManagement.status.disabled')}
            </Tag>
          )}
        />
        <Table.Column<ButtonResp>
          title={t('auth.menuManagement.columns.createTime')}
          dataIndex="createTime"
          key="createTime"
          width={180}
          render={formatDateTime}
        />
        <Table.Column<ButtonResp>
          title={t('auth.menuManagement.columns.updateTime')}
          dataIndex="updateTime"
          key="updateTime"
          width={180}
          render={formatDateTime}
        />
        <Table.Column<ButtonResp>
          title={t('auth.menuManagement.columns.actions')}
          key="actions"
          fixed="right"
          width={160}
          render={(_, record) => (
            <Space size="small">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => void openEditForm(record)}
              >
                {t('auth.menuManagement.actions.edit')}
              </Button>
              <Popconfirm
                title={t('auth.menuManagement.confirm.buttonDeleteTitle')}
                okText={t('auth.menuManagement.actions.delete')}
                cancelText={t('auth.menuManagement.actions.cancel')}
                onConfirm={() => void removeButton(record)}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  {t('auth.menuManagement.actions.delete')}
                </Button>
              </Popconfirm>
            </Space>
          )}
        />
      </NeTable>

      <ButtonFormModal
        form={form}
        mode={formMode}
        open={formModalOpen}
        submitting={submitting}
        detailLoading={detailLoading}
        onSubmit={() => void submitButton()}
        onCancel={closeFormModal}
      />
    </Modal>
  );
}
