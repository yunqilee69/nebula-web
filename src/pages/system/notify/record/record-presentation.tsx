import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import type { ReactElement } from 'react';
import type { NotifySendStatus } from '@/types/notify';

const SEND_STATUS_PRESENTATION = {
  SUCCESS: { label: '成功', color: 'success', icon: <CheckCircleOutlined /> },
  FAILED: { label: '失败', color: 'error', icon: <CloseCircleOutlined /> },
} as const satisfies Record<NotifySendStatus, {
  readonly label: string;
  readonly color: string;
  readonly icon: ReactElement;
}>;

export function formatOptionalText(value: string | undefined): string {
  return value?.trim() || '-';
}

export function formatRecordDateTime(value: string | undefined): string {
  return value ? value.replace('T', ' ') : '-';
}

export function NotifySendStatusTag({ status }: { readonly status: NotifySendStatus }) {
  const presentation = SEND_STATUS_PRESENTATION[status];
  return (
    <Tag color={presentation.color} icon={presentation.icon}>
      {presentation.label}
    </Tag>
  );
}

export function CopyableRecordText({ value }: { readonly value: string | undefined }) {
  const text = formatOptionalText(value);
  return (
    <Typography.Text copyable={value ? { text: value } : false} ellipsis={value ? { tooltip: value } : false}>
      {text}
    </Typography.Text>
  );
}

export const SEND_STATUS_VALUE_ENUM = {
  SUCCESS: { text: SEND_STATUS_PRESENTATION.SUCCESS.label },
  FAILED: { text: SEND_STATUS_PRESENTATION.FAILED.label },
} as const;
