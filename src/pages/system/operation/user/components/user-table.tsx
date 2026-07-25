import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { AuthManagementService } from '@/services/auth-management';
import type { EnableStatus, UserPageReq, UserResp } from '@/types/auth-management';
import { createEnableStatusOptions, normalizeOptionalText } from './user-page-shared';
import styles from './user-table.module.css';

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

function buildUserPageReq(params: UserQuery & NebulaPageReq): UserPageReq {
  const req: UserPageReq = {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
  };
  const username = normalizeOptionalText(params.username);
  const nickname = normalizeOptionalText(params.nickname);

  if (params.orderName) req.orderName = params.orderName;
  if (params.orderType) req.orderType = params.orderType;
  if (username) req.username = username;
  if (nickname) req.nickname = nickname;
  if (params.status !== undefined) req.status = Number(params.status) as EnableStatus;

  return req;
}

export const UserTable = forwardRef<UserTableHandle, UserTableProps>(function UserTable({ service, onAddUser, onEditUser }, ref) {
  const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
  const { t } = useNebulaI18n();
  const statusOptions = createEnableStatusOptions(t);

  useImperativeHandle(ref, () => ({
    reload: () => actionRef.current?.reload() ?? Promise.resolve(),
  }), []);

  const requestUsers = useCallback(
    (params: UserQuery & NebulaPageReq) => service.pageUsers(buildUserPageReq(params)),
    [service],
  );

  const removeUser = useCallback(
    async (record: UserResp) => {
      await service.deleteUser(record.id);
      await actionRef.current?.reload();
    },
    [service],
  );

  const columns = useMemo<NebulaProColumns<UserResp>[]>(() => [
    {
      title: t('auth.userManagement.columns.username'),
      dataIndex: 'username',
      sorter: true,
    },
    {
      title: t('auth.userManagement.columns.nickname'),
      dataIndex: 'nickname',
    },
    {
      title: t('auth.userManagement.columns.status'),
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: Object.fromEntries(statusOptions.map((option) => [option.value, { text: option.label }])) as Record<EnableStatus, { text: string }>,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? t('auth.userManagement.status.enabled') : t('auth.userManagement.status.disabled')}
        </Tag>
      ),
    },
    {
      title: t('auth.userManagement.columns.actions'),
      key: 'actions',
      valueType: 'option',
      search: false,
      render: (_, record) => [
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => onEditUser(record)}>
          {t('auth.userManagement.actions.edit')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t('auth.userManagement.confirm.deleteTitle')}
          okText={t('auth.userManagement.actions.delete')}
          cancelText={t('auth.userManagement.actions.cancel')}
          onConfirm={() => void removeUser(record)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            {t('auth.userManagement.actions.delete')}
          </Button>
        </Popconfirm>,
      ],
    },
  ], [onEditUser, removeUser, statusOptions, t]);

  return (
    <NebulaProTable<UserResp, UserQuery>
      actionRef={actionRef}
      className={styles.toolbar}
      columns={columns}
      request={requestUsers}
      toolBarRender={() => [
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={onAddUser}>
          {t('auth.userManagement.actions.create')}
        </Button>,
      ]}
    />
  );
});
