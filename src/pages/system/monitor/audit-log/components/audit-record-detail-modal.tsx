import { Collapse, Descriptions, Modal, Tag } from 'antd';
import type { DescriptionsProps } from 'antd';
import { useMemo } from 'react';
import { AUDIT_CATEGORY_TAG_COLOR, AUDIT_CONSISTENCY_TAG_COLOR, SUCCESS_TAG_COLOR } from '@/enums/audit';
import type { AuditRecordDetailResp } from '@/types/audit';

interface AuditRecordDetailModalProps {
  readonly open: boolean;
  readonly loading: boolean;
  readonly detail?: AuditRecordDetailResp;
  readonly onClose: () => void;
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

function formatJson(jsonStr: string | undefined): string {
  if (!jsonStr) return '';
  try {
    const parsed = JSON.parse(jsonStr);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonStr;
  }
}

function JsonViewer({ json, label }: { readonly json?: string; readonly label: string }) {
  const formattedJson = useMemo(() => formatJson(json), [json]);

  if (!formattedJson) {
    return (
      <div className="text-gray-400 italic py-4 text-center">
        暂无{label}
      </div>
    );
  }

  return (
    <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96 text-xs font-mono">
      {formattedJson}
    </pre>
  );
}

export function AuditRecordDetailModal({
  open,
  loading,
  detail,
  onClose,
}: AuditRecordDetailModalProps) {
  const basicItems: DescriptionsProps['items'] = useMemo(() => {
    if (!detail) return [];

    return [
      {
        label: '审计记录ID',
        children: <span className="font-mono text-xs">{detail.id}</span>,
        span: 2,
      },
      {
        label: '链路追踪ID',
        children: detail.traceId ? (
          <span className="font-mono text-xs">{detail.traceId}</span>
        ) : (
          '-'
        ),
        span: 2,
      },
      {
        label: '业务编号',
        children: detail.bizNo || '-',
        span: 2,
      },
      {
        label: '模块',
        children: detail.module,
        span: 1,
      },
      {
        label: '操作',
        children: detail.action,
        span: 1,
      },
      {
        label: '资源类型',
        children: detail.resource,
        span: 1,
      },
      {
        label: '资源ID',
        children: detail.resourceId || '-',
        span: 1,
      },
      {
        label: '审计分类',
        children: (
          <Tag color={AUDIT_CATEGORY_TAG_COLOR[detail.category]}>
            {detail.category === 'BUSINESS' ? '业务操作' : '安全审计'}
          </Tag>
        ),
        span: 1,
      },
      {
        label: '一致性级别',
        children: (
          <Tag color={AUDIT_CONSISTENCY_TAG_COLOR[detail.consistency]}>
            {detail.consistency === 'EVENTUAL' ? '最终一致性' : '强一致性'}
          </Tag>
        ),
        span: 1,
      },
      {
        label: '操作人ID',
        children: detail.operatorId || '-',
        span: 1,
      },
      {
        label: '操作人名称',
        children: detail.operatorName || '-',
        span: 1,
      },
      {
        label: '执行状态',
        children: (
          <Tag color={SUCCESS_TAG_COLOR[String(detail.success) as 'true' | 'false']}>
            {detail.success ? '成功' : '失败'}
          </Tag>
        ),
        span: 1,
      },
      {
        label: '错误码',
        children: detail.errorCode || '-',
        span: 1,
      },
      {
        label: '错误信息',
        children: detail.errorMessage || '-',
        span: 2,
      },
      {
        label: '创建时间',
        children: formatDateTime(detail.createTime),
        span: 2,
      },
    ];
  }, [detail]);

  const requestItems: DescriptionsProps['items'] = useMemo(() => {
    if (!detail) return [];

    return [
      {
        label: '请求URI',
        children: detail.requestUri || '-',
        span: 2,
      },
      {
        label: 'HTTP方法',
        children: detail.httpMethod || '-',
        span: 1,
      },
      {
        label: '客户端IP',
        children: detail.clientIp || '-',
        span: 1,
      },
      {
        label: '用户代理',
        children: (
          <div className="max-w-md truncate" title={detail.userAgent}>
            {detail.userAgent || '-'}
          </div>
        ),
        span: 2,
      },
      {
        label: '耗时(ms)',
        children: detail.durationMs !== undefined ? `${detail.durationMs}ms` : '-',
        span: 2,
      },
    ];
  }, [detail]);

  const collapseItems = useMemo(
    () => [
      {
        key: 'args',
        label: '参数快照',
        children: <JsonViewer json={detail?.argsSnapshot} label="参数快照" />,
      },
      {
        key: 'result',
        label: '结果快照',
        children: <JsonViewer json={detail?.resultSnapshot} label="结果快照" />,
      },
      {
        key: 'extra',
        label: '扩展信息',
        children: <JsonViewer json={detail?.extraJson} label="扩展信息" />,
      },
    ],
    [detail],
  );

  return (
    <Modal
      title="审计记录详情"
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      loading={loading}
      destroyOnClose
    >
      <div className="space-y-4">
        <Descriptions
          title="基本信息"
          bordered
          size="small"
          column={2}
          items={basicItems}
        />

        <Descriptions
          title="请求信息"
          bordered
          size="small"
          column={2}
          items={requestItems}
        />

        <Collapse
          items={collapseItems}
          defaultActiveKey={['args', 'result', 'extra']}
        />
      </div>
    </Modal>
  );
}