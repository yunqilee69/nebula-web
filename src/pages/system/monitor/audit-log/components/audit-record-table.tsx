import { EyeOutlined } from '@ant-design/icons';
import { Button, Tag } from 'antd';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { NebulaProTable } from '@/components/nebula-pro-table';
import type { NebulaPageReq, NebulaProColumns, NebulaProTableAction } from '@/components/nebula-pro-table';
import { AUDIT_CATEGORY_TAG_COLOR, AUDIT_CONSISTENCY_TAG_COLOR, SUCCESS_TAG_COLOR } from '@/enums/audit';
import type { AuditService } from '@/services/audit';
import type { AuditCategory, AuditRecordPageReq, AuditRecordResp } from '@/types/audit';

export interface AuditRecordTableHandle {
  reload: () => Promise<void>;
}

interface AuditRecordTableProps {
  readonly service: AuditService;
  readonly onDetail: (record: AuditRecordResp) => void;
}

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function truncateId(id: string, maxLength: number = 12): string {
  if (id.length <= maxLength) return id;
  return `${id.substring(0, maxLength)}...`;
}

interface AuditRecordQuery {
  module?: string;
  action?: string;
  category?: AuditCategory | '';
  operatorId?: string;
  resource?: string;
  resourceId?: string;
  success?: boolean | 'true' | 'false';
  bizNo?: string;
  traceId?: string;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeOptionalBoolean(value: boolean | 'true' | 'false' | undefined) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function buildPageReq(params: AuditRecordQuery & NebulaPageReq): AuditRecordPageReq {
  const module = normalizeOptionalText(params.module);
  const action = normalizeOptionalText(params.action);
  const operatorId = normalizeOptionalText(params.operatorId);
  const resource = normalizeOptionalText(params.resource);
  const resourceId = normalizeOptionalText(params.resourceId);
  const bizNo = normalizeOptionalText(params.bizNo);
  const traceId = normalizeOptionalText(params.traceId);
  const success = normalizeOptionalBoolean(params.success);

  return {
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    ...(module ? { module } : {}),
    ...(action ? { action } : {}),
    ...(params.category ? { category: params.category } : {}),
    ...(operatorId ? { operatorId } : {}),
    ...(resource ? { resource } : {}),
    ...(resourceId ? { resourceId } : {}),
    ...(success !== undefined ? { success } : {}),
    ...(bizNo ? { bizNo } : {}),
    ...(traceId ? { traceId } : {}),
  };
}

export const AuditRecordTable = forwardRef<AuditRecordTableHandle, AuditRecordTableProps>(
  function AuditRecordTable({ service, onDetail }, ref) {
    const actionRef = useRef<NebulaProTableAction | undefined>(undefined);
    
    const reloadTable = useCallback(
      () => actionRef.current?.reload() ?? Promise.resolve(),
      [],
    );

    useImperativeHandle(ref, () => ({ reload: reloadTable }), [reloadTable]);

    const requestRecords = useCallback(
      (params: AuditRecordQuery & NebulaPageReq) => service.pageRecords(buildPageReq(params)),
      [service],
    );

    const columns = useMemo<NebulaProColumns<AuditRecordResp>[]>(
      () => [
        {
          title: '审计记录ID',
          dataIndex: 'id',
          key: 'id',
          width: 160,
          ellipsis: true,
          search: false,
          render: (_, record) => (
            <span title={record.id} className="font-mono text-xs">
              {truncateId(record.id)}
            </span>
          ),
        },
        {
          title: '模块',
          dataIndex: 'module',
          key: 'module',
          width: 120,
          ellipsis: true,
        },
        {
          title: '操作',
          dataIndex: 'action',
          key: 'action',
          width: 120,
          ellipsis: true,
        },
        {
          title: '资源类型',
          dataIndex: 'resource',
          key: 'resource',
          width: 120,
          ellipsis: true,
        },
        {
          title: '资源ID',
          dataIndex: 'resourceId',
          key: 'resourceId',
          width: 140,
          ellipsis: true,
          search: false,
          render: (_, record) => record.resourceId || '-',
        },
        {
          title: '审计分类',
          dataIndex: 'category',
          key: 'category',
          width: 100,
          valueType: 'select',
          valueEnum: {
            BUSINESS: { text: '业务操作' },
            SECURITY: { text: '安全审计' },
          },
          render: (_, record) => (
            <Tag color={AUDIT_CATEGORY_TAG_COLOR[record.category]}>
              {record.category === 'BUSINESS' ? '业务操作' : '安全审计'}
            </Tag>
          ),
        },
        {
          title: '操作人ID',
          dataIndex: 'operatorId',
          key: 'operatorId',
          width: 120,
          ellipsis: true,
          search: false,
        },
        {
          title: '操作人',
          dataIndex: 'operatorName',
          key: 'operatorName',
          width: 120,
          ellipsis: true,
          search: false,
          render: (_, record) => record.operatorName || '-',
        },
        {
          title: '执行状态',
          dataIndex: 'success',
          key: 'success',
          width: 100,
          valueType: 'select',
          valueEnum: {
            true: { text: '成功', status: 'Success' },
            false: { text: '失败', status: 'Error' },
          },
          render: (_, record) => (
            <Tag color={SUCCESS_TAG_COLOR[String(record.success) as 'true' | 'false']}>
              {record.success ? '成功' : '失败'}
            </Tag>
          ),
        },
        {
          title: '错误信息',
          dataIndex: 'errorMessage',
          key: 'errorMessage',
          width: 200,
          ellipsis: true,
          search: false,
          render: (_, record) => record.errorMessage || '-',
        },
        {
          title: '业务编号',
          dataIndex: 'bizNo',
          key: 'bizNo',
          width: 150,
          ellipsis: true,
          search: true,
        },
        {
          title: '链路追踪ID',
          dataIndex: 'traceId',
          key: 'traceId',
          width: 180,
          ellipsis: true,
          search: true,
        },
        {
          title: '创建时间',
          dataIndex: 'createTime',
          key: 'createTime',
          width: 180,
          valueType: 'dateTime',
          search: false,
          render: (_, record) => formatDateTime(record.createTime),
        },
        {
          title: '操作',
          key: 'actions',
          width: 80,
          fixed: 'right',
          search: false,
          render: (_, record) => (
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onDetail(record)}
            >
              详情
            </Button>
          ),
        },
      ],
      [onDetail],
    );

    return (
      <NebulaProTable<AuditRecordResp>
        actionRef={actionRef}
        columns={columns}
        request={requestRecords}
        rowKey="id"
        scroll={{ x: 1500 }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      />
    );
  },
);