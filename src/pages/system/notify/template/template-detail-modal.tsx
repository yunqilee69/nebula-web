import { Descriptions, Modal, Tag, Typography } from 'antd';
import { DictLabel } from '@/components/dict-select';
import type { NotifyTemplateDetailResp } from '@/types/notify';
import { NOTIFY_CHANNEL_TYPE } from './template-page-helpers';
import { TemplateVariablePanel } from './template-variable-panel';

interface TemplateDetailModalProps {
  readonly open: boolean;
  readonly loading: boolean;
  readonly detail?: NotifyTemplateDetailResp;
  readonly onCancel: () => void;
}

function textOrDash(value: string | undefined): string {
  return value?.trim() || '-';
}

export function TemplateDetailModal({
  open,
  loading,
  detail,
  onCancel,
}: TemplateDetailModalProps) {
  return (
    <Modal
      title="模板详情"
      aria-label="模板详情"
      open={open}
      width={900}
      footer={null}
      loading={loading}
      destroyOnHidden
      onCancel={onCancel}
    >
      {detail ? (
        <div className="space-y-4">
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="模板编码">
              <Typography.Text code copyable>{detail.templateCode}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="模板名称">{detail.templateName}</Descriptions.Item>
            <Descriptions.Item label="通知渠道">
              <DictLabel dictCode={NOTIFY_CHANNEL_TYPE} value={detail.channelType} />
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={detail.status === 1 ? 'success' : 'default'}>
                {detail.status === 1 ? '启用' : '停用'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="模板类型">
              <Tag color={detail.builtinFlag ? 'blue' : 'default'}>
                {detail.builtinFlag ? '内置' : '自定义'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="备注">{textOrDash(detail.remark)}</Descriptions.Item>
            <Descriptions.Item label="主题模板" span={2}>
              <Typography.Paragraph copyable={Boolean(detail.subjectTemplate)}>
                {textOrDash(detail.subjectTemplate)}
              </Typography.Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="内容模板" span={2}>
              <Typography.Paragraph copyable>{detail.contentTemplate}</Typography.Paragraph>
            </Descriptions.Item>
          </Descriptions>
          <TemplateVariablePanel
            subjectTemplate={detail.subjectTemplate}
            contentTemplate={detail.contentTemplate}
          />
        </div>
      ) : null}
    </Modal>
  );
}
