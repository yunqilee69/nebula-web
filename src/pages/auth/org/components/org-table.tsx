import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { NeTable } from '@/components/ne-table';
import type { NeTableAction, NeTableRequestParams } from '@/components/ne-table/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuthManagementService } from '@/services/auth-management';
import type { EnableStatus, OrgPageReq, OrgResp, OrgType } from '@/types/auth-management';

export interface OrgTableHandle {
  reload: () => Promise<void>;
}

interface OrgTableProps {
  service: AuthManagementService;
  parentId?: string;
  onCreate: () => void;
  onEdit: (record: OrgResp) => void;
}

interface OrgQuery {
  name?: string;
  code?: string;
  status?: EnableStatus;
}

function buildOrgPageReq(params: NeTableRequestParams<OrgQuery>, parentId?: string): OrgPageReq {
  const req: OrgPageReq = {
    pageNum: params.current,
    pageSize: params.pageSize,
  };
  if (parentId !== undefined) req.parentId = parentId;
  const name = params.query.name?.trim() || undefined;
  const code = params.query.code?.trim() || undefined;
  if (name) req.name = name;
  if (code) req.code = code;
  if (params.query.status !== undefined) req.status = params.query.status;
  return req;
}

export const OrgTable = forwardRef<OrgTableHandle, OrgTableProps>(function OrgTable(
  { service, parentId, onCreate, onEdit },
  ref,
) {
  const actionRef = useRef<NeTableAction>(null);
  const { message } = App.useApp();
  const { t } = useNebulaI18n();
  const orgTypeLabels: Record<OrgType, string> = {
    COMPANY: t('auth.orgManagement.types.company'),
    DEPARTMENT: t('auth.orgManagement.types.department'),
    TEAM: t('auth.orgManagement.types.team'),
  };

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
  }));

  const requestOrgs = useCallback(
    async (params: NeTableRequestParams<OrgQuery>) => {
      const page = await service.pageOrgs(buildOrgPageReq(params, parentId));
      return { data: page.records, total: page.total };
    },
    [service, parentId],
  );

  const removeOrg = useCallback(
    async (record: OrgResp) => {
      try {
        await service.deleteOrg(record.id);
        await actionRef.current?.reload();
      } catch (error: unknown) {
        message.error(t('auth.orgManagement.feedback.deleteFailed'));
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Failed to delete org', msg);
      }
    },
    [service, message, t],
  );

  return (
    <NeTable<OrgResp, OrgQuery> actionRef={actionRef} rowKey="id" request={requestOrgs}>
      <NeTable.Search<OrgQuery>>
        {({ form, submit, reset }) => (
          <Form form={form} layout="inline" onFinish={submit}>
            <Form.Item name="name" label={t('auth.orgManagement.columns.name')}>
              <Input allowClear placeholder={t('auth.orgManagement.placeholders.name')} />
            </Form.Item>
            <Form.Item name="code" label={t('auth.orgManagement.columns.code')}>
              <Input allowClear placeholder={t('auth.orgManagement.placeholders.code')} />
            </Form.Item>
            <Form.Item name="status" label={t('auth.orgManagement.columns.status')}>
              <Select
                allowClear
                placeholder={t('auth.orgManagement.placeholders.status')}
                options={[
                  { label: t('auth.orgManagement.status.enabled'), value: 1 },
                  { label: t('auth.orgManagement.status.disabled'), value: 0 },
                ]}
                style={{ width: 120 }}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {t('auth.orgManagement.actions.search')}
                </Button>
                <Button onClick={() => void reset()}>{t('auth.orgManagement.actions.reset')}</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </NeTable.Search>

      <NeTable.Toolbar>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          {t('auth.orgManagement.actions.create')}
        </Button>
      </NeTable.Toolbar>

      <Table.Column<OrgResp> title={t('auth.orgManagement.columns.name')} dataIndex="name" key="name" />
      <Table.Column<OrgResp> title={t('auth.orgManagement.columns.code')} dataIndex="code" key="code" />
      <Table.Column<OrgResp>
        title={t('auth.orgManagement.columns.type')}
        dataIndex="type"
        key="type"
        render={(type: OrgType) => orgTypeLabels[type]}
      />
      <Table.Column<OrgResp>
        title={t('auth.orgManagement.columns.status')}
        dataIndex="status"
        key="status"
        render={(status: EnableStatus) => (
          <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? t('auth.orgManagement.status.enabled') : t('auth.orgManagement.status.disabled')}</Tag>
        )}
      />
      <Table.Column<OrgResp>
        title={t('auth.orgManagement.columns.actions')}
        key="action"
        render={(_, record) => (
          <Space size="small">
            <Button type="link" icon={<EditOutlined />} onClick={() => onEdit(record)}>
              {t('auth.orgManagement.actions.edit')}
            </Button>
            <Popconfirm
              title={`${t('auth.orgManagement.actions.delete')}?`}
              okText={t('auth.orgManagement.actions.delete')}
              cancelText={t('auth.orgManagement.actions.cancel')}
              onConfirm={() => void removeOrg(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                {t('auth.orgManagement.actions.delete')}
              </Button>
            </Popconfirm>
          </Space>
        )}
      />
    </NeTable>
  );
});
