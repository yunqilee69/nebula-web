import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Popconfirm, Select, Space, Table, Tag } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { NeTable } from '@/components/ne-table';
import type { NeTableAction, NeTableRequestParams } from '@/components/ne-table/types';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuthManagementService } from '@/services/auth-management';
import type { EnableStatus, UserPageReq, UserResp } from '@/types/auth-management';
import { createEnableStatusOptions, normalizeOptionalText } from './user-page-shared';

interface UserQuery {
  username?: string;
  nickname?: string;
  status?: EnableStatus;
}

export interface UserTableHandle {
  reload: () => Promise<void>;
}

interface UserTableProps {
  service: AuthManagementService;
  onAddUser: () => void;
  onEditUser: (record: UserResp) => void;
}

function buildUserPageReq(params: NeTableRequestParams<UserQuery>): UserPageReq {
  const req: UserPageReq = {
    pageNum: params.current,
    pageSize: params.pageSize,
  };
  const username = normalizeOptionalText(params.query.username);
  const nickname = normalizeOptionalText(params.query.nickname);

  if (username) req.username = username;
  if (nickname) req.nickname = nickname;
  if (params.query.status !== undefined) req.status = params.query.status;

  return req;
}

export const UserTable = forwardRef<UserTableHandle, UserTableProps>(function UserTable({ service, onAddUser, onEditUser }, ref) {
  const actionRef = useRef<NeTableAction>(null);
  const { t } = useNebulaI18n();
  const statusOptions = createEnableStatusOptions(t);

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
  }), []);

  const requestUsers = useCallback(
    async (params: NeTableRequestParams<UserQuery>) => {
      const page = await service.pageUsers(buildUserPageReq(params));
      return { data: page.records, total: page.total };
    },
    [service],
  );

  const removeUser = useCallback(
    async (record: UserResp) => {
      await service.deleteUser(record.id);
      await actionRef.current?.reload();
    },
    [service],
  );

  return (
    <NeTable<UserResp, UserQuery> actionRef={actionRef} rowKey="id" request={requestUsers}>
      <NeTable.Search<UserQuery>>
        {({ form, submit, reset }) => (
          <Form form={form} layout="inline" onFinish={submit}>
            <Form.Item name="username" label={t('auth.userManagement.columns.username')}>
              <Input allowClear placeholder={t('auth.userManagement.placeholders.username')} />
            </Form.Item>
            <Form.Item name="nickname" label={t('auth.userManagement.columns.nickname')}>
              <Input allowClear placeholder={t('auth.userManagement.placeholders.nickname')} />
            </Form.Item>
            <Form.Item name="status" label={t('auth.userManagement.columns.status')}>
              <Select allowClear placeholder={t('auth.userManagement.placeholders.status')} options={statusOptions} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {t('auth.userManagement.actions.search')}
                </Button>
                <Button onClick={() => void reset()}>{t('auth.userManagement.actions.reset')}</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </NeTable.Search>

      <NeTable.Toolbar>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAddUser}>
          {t('auth.userManagement.actions.create')}
        </Button>
      </NeTable.Toolbar>

      <Table.Column<UserResp> title={t('auth.userManagement.columns.username')} dataIndex="username" key="username" />
      <Table.Column<UserResp> title={t('auth.userManagement.columns.nickname')} dataIndex="nickname" key="nickname" />
      <Table.Column<UserResp>
        title={t('auth.userManagement.columns.status')}
        dataIndex="status"
        key="status"
        render={(status: EnableStatus) => (
          <Tag color={status === 1 ? 'success' : 'default'}>{status === 1 ? t('auth.userManagement.status.enabled') : t('auth.userManagement.status.disabled')}</Tag>
        )}
      />
      <Table.Column<UserResp>
        title={t('auth.userManagement.columns.actions')}
        key="actions"
        render={(_, record) => (
          <Space size="small">
            <Button type="link" icon={<EditOutlined />} onClick={() => onEditUser(record)}>
              {t('auth.userManagement.actions.edit')}
            </Button>
            <Popconfirm
              title={t('auth.userManagement.confirm.deleteTitle')}
              okText={t('auth.userManagement.actions.delete')}
              cancelText={t('auth.userManagement.actions.cancel')}
              onConfirm={() => void removeUser(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                {t('auth.userManagement.actions.delete')}
              </Button>
            </Popconfirm>
          </Space>
        )}
      />
     </NeTable>
  );
});
