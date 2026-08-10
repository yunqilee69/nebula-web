import { DeleteOutlined, EditOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip } from 'antd';
import { Access } from '@/components/access';
import { DictLabel, DictSelect } from '@/components/dict-select';
import type { NebulaProColumns } from '@/components/nebula-pro-table';
import type { NotifyTemplateResp } from '@/types/notify';
import { NOTIFY_CHANNEL_TYPE } from './template-page-helpers';

interface TemplateColumnActions {
  readonly openDetail: (record: NotifyTemplateResp) => void;
  readonly openEditForm: (record: NotifyTemplateResp) => void;
  readonly openSendDrawer: (record: NotifyTemplateResp) => void;
  readonly removeTemplate: (record: NotifyTemplateResp) => void;
}

export function createTemplateColumns({ openDetail, openEditForm, openSendDrawer, removeTemplate }: TemplateColumnActions): NebulaProColumns<NotifyTemplateResp>[] {
  return [
    { title: '模板编码', dataIndex: 'templateCode', fixed: 'left', width: 160, sorter: true },
    { title: '模板名称', dataIndex: 'templateName', width: 180, sorter: true, responsive: ['sm'] },
    { title: '通知渠道', dataIndex: 'channelType', width: 130, responsive: ['md'], formItemRender: () => <DictSelect dictCode={NOTIFY_CHANNEL_TYPE} placeholder="请选择通知渠道" showDisabled={false} />, render: (_, record) => <DictLabel dictCode={NOTIFY_CHANNEL_TYPE} value={record.channelType} /> },
    { title: '状态', dataIndex: 'status', width: 100, responsive: ['md'], valueType: 'select', fieldProps: { allowClear: true, options: [{ label: '启用', value: 1 }, { label: '停用', value: 0 }] }, render: (_, record) => <Tag color={record.status === 1 ? 'success' : 'default'}>{record.status === 1 ? '启用' : '停用'}</Tag> },
    { title: '模板类型', dataIndex: 'builtinFlag', width: 100, responsive: ['lg'], search: false, render: (_, record) => <Tag color={record.builtinFlag ? 'blue' : 'default'}>{record.builtinFlag ? '内置' : '自定义'}</Tag> },
    { title: '创建时间', dataIndex: 'createTime', width: 170, valueType: 'dateTime', search: false, sorter: true, responsive: ['xl'] },
    {
      title: '操作', key: 'actions', fixed: 'right', width: 232, valueType: 'option', search: false,
      render: (_, record) => [
        <Button key="detail" type="link" icon={<EyeOutlined />} aria-label="查看" onClick={() => openDetail(record)}><span className="hidden sm:inline">查看</span></Button>,
        <Access key="send" permission="NOTIFY_SEND_EXECUTE" fallback={null}>
          {record.status === 1 ? (
            <Button type="link" icon={<SendOutlined />} aria-label="发送" onClick={() => openSendDrawer(record)}><span className="hidden sm:inline">发送</span></Button>
          ) : (
            <Tooltip title="停用模板不允许发送"><span><Button type="link" icon={<SendOutlined />} aria-label="发送" disabled><span className="hidden sm:inline">发送</span></Button></span></Tooltip>
          )}
        </Access>,
        <Access key="edit" permission="NOTIFY_TEMPLATE_EDIT" fallback={null}>
          <Button type="link" icon={<EditOutlined />} aria-label="编辑" onClick={() => openEditForm(record)}><span className="hidden sm:inline">编辑</span></Button>
        </Access>,
        <Access key="delete" permission="NOTIFY_TEMPLATE_DELETE" fallback={null}>
          {record.builtinFlag ? (
            <Tooltip title="内置模板不允许删除"><span><Button type="link" danger icon={<DeleteOutlined />} aria-label="删除" disabled><span className="hidden sm:inline">删除</span></Button></span></Tooltip>
          ) : (
            <Popconfirm title="确定删除该通知模板吗？" okText="删除" cancelText="取消" onConfirm={() => removeTemplate(record)}><Button type="link" danger icon={<DeleteOutlined />} aria-label="删除"><span className="hidden sm:inline">删除</span></Button></Popconfirm>
          )}
        </Access>,
      ],
    },
  ];
}
